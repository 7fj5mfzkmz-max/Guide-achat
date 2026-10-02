const http = require('node:http');
const { resolve } = require('./resolve');
const PORT = Number(process.env.PORT || 8787);
function json(res, status, body) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': process.env.ALLOWED_ORIGIN || '*' }); res.end(JSON.stringify(body)); }
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && req.url === '/api/health') return json(res, 200, { ok: true, service: 'guide-achat-resolver' });
  if (req.method !== 'POST' || req.url !== '/api/resolve') return json(res, 404, { error: 'Not found' });
  let body = ''; for await (const chunk of req) body += chunk;
  try { const data = JSON.parse(body || '{}'); if (!data.url) return json(res, 400, { error: 'URL manquante.' }); const result = await resolve(data.url); return json(res, result.ok ? 200 : 502, result); }
  catch (error) { return json(res, 500, { error: 'Erreur interne.', detail: error.message }); }
});
server.listen(PORT, () => console.log(`Guide-Achat resolver: http://localhost:${PORT}`));
