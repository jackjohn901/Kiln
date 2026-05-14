import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
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

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const relPath = "/" + (req.params as Record<string, string>)["path"];
    const objectPath = `/objects${relPath}`;
    const file = await storage.getObjectEntityFile(objectPath);
    const response = await storage.downloadObject(file, 31536000);
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ?? "application/octet-stream",
    );
    res.setHeader("Cache-Control", "public, max-age=31536000");
    if (response.body) {
      Readable.fromWeb(
        response.body as Parameters<typeof Readable.fromWeb>[0],
      ).pipe(res);
    } else {
      res.end();
    }
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
