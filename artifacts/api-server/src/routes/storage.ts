import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const UploadUrlBody = z.object({
  name: z.string().min(1),
  size: z.number().positive(),
  contentType: z.string().min(1),
});

router.post(
  "/storage/uploads/request-url",
  async (req: Request, res: Response) => {
    const parsed = UploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "name, size and contentType are required" });
      return;
    }
    try {
      const uploadURL = await storage.getObjectEntityUploadURL();
      const objectPath = storage.normalizeObjectEntityPath(uploadURL);
      res.json({ uploadURL, objectPath });
    } catch (err) {
      req.log.error({ err }, "storage: upload URL generation failed");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

router.post(
  "/storage/uploads",
  async (req: Request, res: Response) => {
    const contentType = (req.headers["content-type"] ?? "application/octet-stream").split(";")[0].trim();
    try {
      const objectPath = await storage.uploadStream(req, contentType);
      res.json({ servingUrl: `/api/storage${objectPath}` });
    } catch (err) {
      req.log.error({ err }, "storage: stream upload failed");
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const relPath = "/" + (req.params as Record<string, string>)["path"];
    const objectPath = `/objects${relPath}`;
    const file = await storage.getObjectEntityFile(objectPath);

    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string) || "application/octet-stream";
    const fileSize = metadata.size ? Number(metadata.size) : null;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Accept-Ranges", "bytes");

    const rangeHeader = req.headers.range;

    if (rangeHeader && fileSize) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const clampedEnd = Math.min(end, fileSize - 1);
        const chunkSize = clampedEnd - start + 1;

        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${clampedEnd}/${fileSize}`);
        res.setHeader("Content-Length", String(chunkSize));

        file.createReadStream({ start, end: clampedEnd }).pipe(res);
        return;
      }
    }

    if (fileSize) {
      res.setHeader("Content-Length", String(fileSize));
    }
    file.createReadStream().pipe(res);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Not found" });
    } else {
      req.log.error({ err }, "storage: object fetch failed");
      res.status(500).json({ error: "Internal error" });
    }
  }
});

export default router;
