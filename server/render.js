'use strict';
/* Rendu navigateur facultatif, pour les pages vides sans JavaScript.
   Service que VOUS exploitez (Playwright, Browserless…). Contrat :
   POST RENDER_ENDPOINT { url } -> { html }  (+ Authorization: Bearer RENDER_TOKEN si défini). */
const { MAX_BYTES } = require('./net.js');

function enabled() { return !!process.env.RENDER_ENDPOINT; }

async function renderHtml(target, timeout) {
  if (!enabled()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout || 12000);
  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.RENDER_TOKEN) headers.authorization = 'Bearer ' + process.env.RENDER_TOKEN;
    const r = await fetch(process.env.RENDER_ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ url: target }), signal: controller.signal });
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d.html === 'string' ? d.html.slice(0, MAX_BYTES) : null;
  } catch (_) { return null; } finally { clearTimeout(timer); }
}

module.exports = { renderHtml, enabled };
