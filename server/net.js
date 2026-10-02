'use strict';
/* Réseau : garde-fous SSRF, récupération HTTP avec les en-têtes d'un navigateur ordinaire,
   redirections suivies à la main (chaque saut est revalidé), cookies de session minimaux. */
const dns = require('node:dns').promises;
const net = require('node:net');
const { URL } = require('node:url');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 6;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  }
  return true;
}

async function assertPublicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Hôte non autorisé.');
  if (net.isIP(host)) { if (isPrivateIp(host)) throw new Error('Adresse non publique refusée.'); return; }
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('Adresse non publique refusée.');
}

/* En-têtes d'un navigateur de bureau courant. Ce sont des en-têtes ordinaires : aucune
   falsification d'empreinte TLS/JS, aucun proxy tournant, aucune résolution de CAPTCHA. */
const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'fr-FR,fr;q=0.9,en;q=0.6',
  'upgrade-insecure-requests': '1'
};

function decodeBody(buffer, contentType) {
  const label = (/charset\s*=\s*["']?([\w-]+)/i.exec(contentType || '') || [])[1];
  let text;
  try { text = new TextDecoder(label || 'utf-8').decode(buffer); } catch (_) { text = new TextDecoder('utf-8').decode(buffer); }
  if (!label) {
    const head = Buffer.from(buffer).subarray(0, 4096).toString('latin1');
    const metaLabel = (/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head) || [])[1];
    if (metaLabel && !/^utf-?8$/i.test(metaLabel)) { try { text = new TextDecoder(metaLabel).decode(buffer); } catch (_) {} }
  }
  return text;
}

async function readCapped(response) {
  const reader = response.body && response.body.getReader ? response.body.getReader() : null;
  if (!reader) return Buffer.from(await response.arrayBuffer()).subarray(0, MAX_BYTES);
  const chunks = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) { chunks.push(value.subarray(0, value.length - (total - MAX_BYTES))); await reader.cancel(); break; }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c)));
}

function cookiePairs(response) {
  const list = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  return list.map(c => c.split(';')[0]).filter(Boolean);
}

async function fetchHtml(target, options) {
  const timeout = (options && options.timeout) || 9000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const jar = new Map();
  try {
    let current = target;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = new URL(current);
      if (!/^https?:$/.test(u.protocol)) throw new Error('Protocole non autorisé.');
      await assertPublicHost(u.hostname);
      const headers = Object.assign({}, BROWSER_HEADERS);
      if (jar.size) headers.cookie = Array.from(jar, ([k, v]) => k + '=' + v).join('; ');
      const response = await fetch(current, { headers, redirect: 'manual', signal: controller.signal });
      cookiePairs(response).forEach(pair => { const i = pair.indexOf('='); if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1)); });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) { current = new URL(location, current).toString(); continue; }
      const buffer = await readCapped(response);
      return {
        status: response.status, finalUrl: current,
        html: decodeBody(buffer, response.headers.get('content-type')),
        headers: { server: response.headers.get('server') || '', cfMitigated: response.headers.get('cf-mitigated') || '' }
      };
    }
    throw new Error('Trop de redirections.');
  } finally { clearTimeout(timer); }
}

module.exports = { isPrivateIp, assertPublicHost, fetchHtml, MAX_BYTES };
