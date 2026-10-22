import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "dist");
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function resolveRequest(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const target = path.resolve(root, relative.endsWith("/") ? `${relative}index.html` : relative);
  return target === root || target.startsWith(`${root}${path.sep}`) ? target : null;
}

const server = createServer(async (request, response) => {
  let target = resolveRequest(request.url || "/");
  try {
    if (!target || !(await stat(target)).isFile()) throw new Error("not found");
    response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
  } catch {
    target = path.join(root, "404.html");
    response.writeHead(404, { "Content-Type": types[".html"] });
  }
  createReadStream(target).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`생활견적365 미리보기: http://127.0.0.1:${port}\n`);
});
