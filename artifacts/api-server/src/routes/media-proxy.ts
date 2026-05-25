import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ALLOWED_HOSTS = new Set<string>([
  "videos.pexels.com",
  "images.pexels.com",
  "picsum.photos",
  "fastly.picsum.photos",
  "i.picsum.photos",
  "image.mux.com",
  "stream.mux.com",
  "cdn.pixabay.com",
  "images.unsplash.com",
]);

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

router.get("/media-proxy", async (req, res) => {
  const raw = typeof req.query.url === "string" ? req.query.url : "";
  if (!raw) {
    res.status(400).json({ error: "missing url" });
    return;
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    res.status(400).json({ error: "invalid url" });
    return;
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    res.status(400).json({ error: "unsupported protocol" });
    return;
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    res.status(403).json({ error: "host not allowed", host: target.hostname });
    return;
  }

  try {
    const range = req.header("range");
    const upstream = await fetch(target.toString(), {
      headers: range ? { range } : undefined,
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status).json({ error: "upstream error", status: upstream.status });
      return;
    }

    const contentLengthHeader = upstream.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
    if (contentLength && contentLength > MAX_BYTES) {
      res.status(413).json({ error: "file too large" });
      return;
    }

    const passthrough = ["content-type", "content-length", "accept-ranges", "content-range", "last-modified", "etag"];
    for (const h of passthrough) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status);

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          req.log.warn({ url: target.toString(), total }, "media-proxy aborted: size cap");
          res.destroy();
          return;
        }
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    req.log.error({ err, url: target.toString() }, "media-proxy fetch failed");
    if (!res.headersSent) {
      res.status(502).json({ error: "fetch failed" });
    } else {
      res.destroy();
    }
  }
});

export default router;
