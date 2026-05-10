import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import http from "node:http";

const HOST = process.env.DIGITAL_DASH_UI_HOST ?? process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.DIGITAL_DASH_UI_PORT ?? process.env.PORT ?? "5173");
const DIST_DIR = join(process.cwd(), "dist");
const INDEX_FILE = join(DIST_DIR, "index.html");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

if (!existsSync(INDEX_FILE)) {
  console.error(`UI build missing: ${INDEX_FILE}`);
  console.error("Run `npm run ui:build` before starting the UI server.");
  process.exit(1);
}

const sendFile = (res, filePath) => {
  const ext = extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] ?? "application/octet-stream";
  const cacheControl = filePath.includes(`${join("dist", "assets")}`) ? "public, max-age=31536000, immutable" : "no-cache";

  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": cacheControl,
  });

  createReadStream(filePath).pipe(res);
};

const resolvePath = (urlPath) => {
  const normalized = normalize(urlPath.replace(/^\/+/, ""));
  const absolute = join(DIST_DIR, normalized);
  return absolute.startsWith(DIST_DIR) ? absolute : DIST_DIR;
};

const server = http.createServer((req, res) => {
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
  if (url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("ok");
    return;
  }

  let filePath = resolvePath(url.pathname);
  let stat = null;
  const looksLikeAsset = extname(url.pathname) !== "";

  try {
    stat = statSync(filePath);
    if (stat.isDirectory()) {
      filePath = join(filePath, "index.html");
      stat = statSync(filePath);
    }
  } catch {
    if (looksLikeAsset) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Not Found");
      return;
    }
    filePath = INDEX_FILE;
    stat = statSync(filePath);
  }

  if (method === "HEAD") {
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": String(stat.size),
      "Cache-Control": filePath.includes(`${join("dist", "assets")}`) ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end();
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Digital Dash UI server listening on http://${HOST}:${PORT}`);
});
