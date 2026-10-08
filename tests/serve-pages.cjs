const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve("pages-out");
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/TechExplorer/")) {
        res.writeHead(404);
        res.end();
        return;
      }
      let file = path.resolve(
        root,
        decodeURIComponent(url.pathname.slice("/TechExplorer/".length)),
      );
      if (!file.startsWith(root + path.sep) && file !== root)
        throw Error("invalid path");
      const stat = await fs.stat(file);
      if (stat.isDirectory()) file = path.join(file, "index.html");
      const content = await fs.readFile(file);
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".txt": "text/plain",
        ".webp": "image/webp",
        ".png": "image/png",
        ".woff2": "font/woff2",
      };
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("Pages test server: http://127.0.0.1:4173/TechExplorer/"),
  );
