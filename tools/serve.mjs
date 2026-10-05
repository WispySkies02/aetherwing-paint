import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.csv':'text/csv; charset=utf-8' };
const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  let filename = path.resolve(root, `.${pathname}`);
  if (!filename.startsWith(root) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    // Mirror Netlify's production app-shell fallback for a brand-new paint slug.
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 1 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(parts[0])) {
      filename = path.join(root, 'index.html');
    } else {
      response.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
  }
  response.writeHead(200, { 'content-type':types[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'cache-control':'no-store' });
  fs.createReadStream(filename).pipe(response);
});
server.listen(port, '127.0.0.1', () => console.log(`Paint Booth preview: http://127.0.0.1:${port}`));
