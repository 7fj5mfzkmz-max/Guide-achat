const { URL } = require('node:url');
const dns = require('node:dns').promises;
const net = require('node:net');
const identify = require('../phone-analyzer/identify.js');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

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

const REQUEST_TIMEOUT = 12000;
const USER_AGENT = 'Mozilla/5.0 (compatible; GuideAchatProductResolver/1.0; +https://github.com/7fj5mfzkmz-max/Guide-achat)';

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
function htmlToText(html) {
  return clean(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}
function stripJsonLd(raw) {
  try { return JSON.parse(raw); } catch (_) {
    try { return JSON.parse(raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'")); } catch (_) { return null; }
  }
}
function extractJsonLd(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const parsed = stripJsonLd(m[1].trim());
    flattenJsonLd(parsed, out);
  }
  return out;
}
function meta(html, property) {
  // Les attributs HTML peuvent être dans n'importe quel ordre :
  // <meta property="og:title" content="..."> et
  // <meta content="..." property="og:title"> sont tous deux valides.
  const wanted = String(property || '').toLowerCase();
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = {};
    const re = /([:\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
    let m;
    while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = m[3];
    if ((attrs.property || '').toLowerCase() === wanted || (attrs.name || '').toLowerCase() === wanted) {
      return clean(decodeHtml(attrs.content || ''));
    }
  }
  return null;
}
function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}
function jsonLdTypeIs(node, type) {
  const t = node && node['@type'];
  if (Array.isArray(t)) return t.some(v => String(v).toLowerCase().split('/').pop() === type.toLowerCase());
  return String(t || '').toLowerCase().split('/').pop() === type.toLowerCase();
}
function flattenJsonLd(value, out) {
  if (!value) return out;
  if (Array.isArray(value)) { value.forEach(v => flattenJsonLd(v, out)); return out; }
  if (typeof value !== 'object') return out;
  if (value['@graph']) flattenJsonLd(value['@graph'], out);
  out.push(value);
  return out;
}
function pickProduct(ld) {
  const products = [];
  flattenJsonLd(ld, products);
  const product = products.find(x => jsonLdTypeIs(x, 'Product'));
  if (!product) return null;
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const brandValue = typeof product.brand === 'object' ? product.brand.name : product.brand;
  return {
    name: clean(product.name), brand: clean(brandValue), sku: clean(product.sku), mpn: clean(product.mpn),
    gtin: clean(product.gtin || product.gtin13 || product.gtin14 || product.gtin12 || product.gtin8),
    price: offers ? clean(offers.price || offers.lowPrice) : null,
    currency: offers ? clean(offers.priceCurrency) : null,
    availability: offers ? clean(offers.availability) : null, source: 'url', evidence: 'JSON-LD Product'
  };
}
async function readCapped(response) {
  const reader = response.body && response.body.getReader ? response.body.getReader() : null;
  if (!reader) return (await response.text()).slice(0, MAX_BYTES);
  const chunks = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) { chunks.push(value.subarray(0, value.length - (total - MAX_BYTES))); await reader.cancel(); break; }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8');
}
async function fetchHtml(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    let current = target;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = new URL(current);
      if (!/^https?:$/.test(u.protocol)) throw new Error('Protocole non autorisé.');
      await assertPublicHost(u.hostname);
      const response = await fetch(current, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' }, redirect: 'manual', signal: controller.signal });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) { current = new URL(location, current).toString(); continue; }
      const html = await readCapped(response);
      return { status: response.status, finalUrl: current, html };
    }
    throw new Error('Trop de redirections.');
  } finally { clearTimeout(timer); }
}
function candidateFromText(text) {
  const specs = {};
  const patterns = {
    ecran: /(\d+(?:[.,]\d+)?)\s*(?:pouces|\"|″)[^\.]{0,100}(?:OLED|AMOLED|LCD|LTPO)/i,
    refresh: /(\d{2,3})\s*Hz/i,
    batterie: /(\d[\d\s.]*)\s*mAh/i,
    ram: /(\d+(?:[.,]\d+)?)\s*Go\s*(?:de\s*)?RAM/i,
    charge: /(\d{2,3})\s*W\s*(?:charge|recharge)/i
  };
  for (const [key, re] of Object.entries(patterns)) { const m = text.match(re); if (m) specs[key] = clean(m[0]); }
  return specs;
}
function hasType(node, type) {
  const t = node && node['@type'];
  return t === type || (Array.isArray(t) && t.includes(type));
}
function pageTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? clean(decodeHtml(m[1])) : null;
}
function extractYear(...texts) {
  const m = texts.filter(Boolean).join(' ').match(/\b(20(?:1[8-9]|2[0-7]))\b/);
  return m ? Number(m[1]) : null;
}

/* Décide si le contenu reçu décrit UN modèle ou une page générale. Pure et testable. */

const BLOCK_TITLE = /robot check|captcha|just a moment|access denied|attention required|are you (?:a )?human|verify(?:ing)? you are human|pardon our interruption|request blocked|accès refusé|acces refuse|vérification requise|verification requise|enable javascript|activer javascript|challenge|défi|complétez la vérification|complete the challenge/i;
const BLOCK_MARKERS = /validateCaptcha|api-services-support@amazon|cf-chl-|challenge-platform|px-captcha|_Incapsula_Resource|captcha-delivery\.com|datadome|fingerprint|amazon-ask\.amazon\.com|Gorgias|Shopify\.queue/i;
const EMPTY_BODY_MARKERS = /<body[^>]*>\s*(?:<(?:script|noscript)[^>]*>|<!--[\s\S]*?-->|\s)*<\/body>/i;

function looksBlocked(html, title) {
  if (title && BLOCK_TITLE.test(title)) return 'title';
  const head = String(html || '').slice(0, 200000);
  if (BLOCK_MARKERS.test(head)) return 'markers';
  // Page vide avec "activez JS" est probablement JavaScript-only
  if (EMPTY_BODY_MARKERS.test(head) && /javascript|noscript|enable|activez/i.test(head)) return 'js-only';
  return null;
}

function pageTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? clean(decodeHtml(m[1])) : null;
}

function readTitle(html) {
  const t = meta(html || '', 'og:title') || meta(html || '', 'twitter:title') || pageTitle(html || '');
  const generic = /^(?:amazon|fnac|cdiscount|darty|rakuten|idealo|accueil|home|produit|product|loading|chargement|panier|cart|404|error)$/i;
  if (!t || generic.test(t)) return null;
  return t;
}

function classifyContent({ urlClass, ld, html, text }) {
  const products = ld.filter(x => hasType(x, 'Product'));
  const listing = ld.some(x => hasType(x, 'ItemList') || hasType(x, 'CollectionPage') || hasType(x, 'OfferCatalog'));
  const ogType = (meta(html, 'og:type') || '').toLowerCase();
  if (listing || products.length > 1) return { kind: 'page', label: 'une page de catégorie ou de liste de produits' };
  if (products.length === 1 || ogType.includes('product') || urlClass.kind === 'product') return { kind: 'product', label: null };
  if (urlClass.kind === 'page') return { kind: 'page', label: urlClass.label };
  const prices = (text.match(/\d[\d\s.,]{0,8}\s?€/g) || []).length;
  if (prices >= 10) return { kind: 'page', label: 'une page de catégorie ou de liste de produits' };
  return { kind: 'unknown', label: null };
}

function buildClues(target, product, html) {
  const fromUrl = identify.identifyFromUrl(target);
  const title = meta(html || '', 'og:title') || meta(html || '', 'twitter:title') || pageTitle(html || '');
  const name = (product && product.name) || title || fromUrl.titleHint || null;
  return {
    title: title || null,
    name: name,
    brand: (product && product.brand) || null,
    ean: (product && product.gtin) || fromUrl.ean || null,
    mpn: (product && (product.mpn || product.sku)) || null,
    asin: fromUrl.asin || null,
    urlHint: fromUrl.titleHint || null,
    year: extractYear(name, title, fromUrl.titleHint)
  };
}

async function resolve(target) {
  let parsed;
  try { parsed = new URL(target); } catch (_) { return { ok: false, error: 'URL invalide.' }; }
  if (!/^https?:$/.test(parsed.protocol)) return { ok: false, error: 'Seules les URL HTTP/HTTPS sont acceptées.' };
  
  const urlClass = identify.classifyUrl(target);
  // Page générale évidente d'après l'URL : inutile de la télécharger.
  if (urlClass.kind === 'page' && urlClass.strong) {
    return { ok: true, kind: 'page', pageLabel: urlClass.label, finalUrl: target, merchantHost: parsed.hostname, clues: buildClues(target, null, '') };
  }
  
  let fetched;
  try { fetched = await fetchHtml(target); } catch (error) {
    return { ok: false, kind: urlClass.kind, pageLabel: urlClass.label, error: 'Impossible de récupérer la page.', detail: error.name === 'AbortError' ? 'timeout' : error.message, clues: buildClues(target, null, '') };
  }
  
  if (fetched.status >= 400) {
    return { ok: false, blocked: true, reason: 'http', status: fetched.status, finalUrl: fetched.finalUrl, error: `HTTP ${fetched.status}.`, clues: buildClues(target, null, '') };
  }
  
  // Vérifier blocage
  const blockReason = looksBlocked(fetched.html, pageTitle(fetched.html));
  if (blockReason) {
    return { ok: false, blocked: true, reason: blockReason, finalUrl: fetched.finalUrl, error: blockReason === 'js-only' ? 'La page ne peut pas être lue sans navigateur.' : 'Le site demande une vérification anti-robot.', clues: buildClues(target, null, '') };
  }
  
  const ld = extractJsonLd(fetched.html);
  const product = pickProduct(ld);
  const text = htmlToText(fetched.html);
  const verdict = classifyContent({ urlClass, ld, html: fetched.html, text });
  const named = product || { name: readTitle(fetched.html), brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: 'url', evidence: 'meta title' };
  const base = { ok: true, kind: verdict.kind, pageLabel: verdict.label, finalUrl: fetched.finalUrl, merchantHost: parsed.hostname, clues: buildClues(fetched.finalUrl, product, fetched.html) };
  
  if (verdict.kind === 'page') return base;
  
  return Object.assign(base, {
    product: named, specs: candidateFromText(text), evidence: (ld.length ? ['JSON-LD'] : ['HTML/meta']),
    warning: product ? null : 'Aucun objet Product structuré trouvé; identification à confirmer.'
  });
}

module.exports = { resolve, classifyContent, isPrivateIp, assertPublicHost, looksBlocked, readTitle, pageTitle };
