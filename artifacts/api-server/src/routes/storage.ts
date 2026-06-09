import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  UploadSizeLimitError,
  verifyUploadToken,
} from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { publicReadLimiter } from "../lib/rateLimit";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RequestUploadUrlBody = z.object({
  name: z.string().min(1),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_SIZE, "File size must not exceed 10 MB"),
  contentType: z
    .string()
    .min(1)
    .refine((ct) => ct.startsWith("image/"), {
      message: "Only image files are allowed",
    }),
});
const RequestUploadUrlResponse = z.object({
  uploadURL: z.string().min(1),
  objectPath: z.string(),
  metadata: RequestUploadUrlBody.optional(),
});

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Reserve an upload slot and return the proxy upload URL.
 * The client sends JSON metadata (name, size, contentType) — NOT the file bytes.
 * The client then PUTs the file to the returned uploadURL (our own proxy endpoint),
 * which enforces the size and content-type constraints on the actual bytes received.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Missing or invalid required fields";
    res.status(400).json({ error: message });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const { objectId, objectPath, uploadToken } = objectStorageService.allocateUploadSlot(req.user.id);
    const uploadURL = `/api/storage/uploads/${objectId}?token=${encodeURIComponent(uploadToken)}`;

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error allocating upload slot");
    res.status(500).json({ error: "Failed to allocate upload slot" });
  }
});

/**
 * PUT /storage/uploads/:objectId
 *
 * Proxy upload endpoint — the client PUTs image bytes here.
 * This enforces content-type and size constraints on the actual bytes received,
 * then writes them directly to GCS. Unlike presigned URLs, this cannot be
 * bypassed by a client that obtained a URL with a valid metadata request.
 */
router.put("/storage/uploads/:objectId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawId = req.params.objectId;
  const objectId = Array.isArray(rawId) ? (rawId[0] ?? "") : rawId;
  if (!objectId || !UUID_RE.test(objectId)) {
    res.status(400).json({ error: "Invalid upload ID" });
    return;
  }

  const rawToken = req.query.token;
  const token = typeof rawToken === "string" ? rawToken : "";
  if (!token || !verifyUploadToken(token, objectId, req.user.id)) {
    res.status(403).json({ error: "Invalid or expired upload token" });
    return;
  }

  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.startsWith("image/")) {
    res.status(415).json({ error: "Only image files are allowed" });
    return;
  }

  const contentLengthStr = req.headers["content-length"];
  if (contentLengthStr !== undefined) {
    const declared = parseInt(contentLengthStr, 10);
    if (!Number.isFinite(declared) || declared > MAX_IMAGE_SIZE) {
      res.status(413).json({ error: "File size must not exceed 10 MB" });
      return;
    }
  }

  try {
    await objectStorageService.writeObjectEntity(objectId, req, contentType, MAX_IMAGE_SIZE);
    res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof UploadSizeLimitError) {
      res.status(413).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Error writing upload to storage");
    res.status(500).json({ error: "Upload failed" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", publicReadLimiter, async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * POST /storage/uploads/make-public
 *
 * Mark an uploaded object as publicly readable.
 * Used after profile photo / cover uploads so they display on public profiles.
 */
router.post("/storage/uploads/make-public", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { objectPath } = req.body as { objectPath?: string };
  if (!objectPath || typeof objectPath !== "string") {
    res.status(400).json({ error: "objectPath is required" });
    return;
  }

  try {
    const normalizedPath = objectPath.startsWith("/objects/")
      ? objectPath
      : `/objects/${objectPath.replace(/^\/+/, "")}`;
    await objectStorageService.trySetObjectEntityAclPolicy(normalizedPath, {
      owner: req.user.id,
      visibility: "public",
    });
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Error setting object ACL to public");
    res.status(500).json({ error: "Failed to make object public" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * Public objects (visibility: "public") are readable without auth.
 * Private objects require the requesting user to be the owner.
 */
router.get("/storage/objects/*path", publicReadLimiter, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const canAccess = await objectStorageService.canAccessObjectEntity({
      userId: req.isAuthenticated() ? req.user.id : undefined,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
