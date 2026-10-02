'use strict';
/* Extraction pure (sans réseau) : plusieurs sources de nom de produit classées par fiabilité,
   et détection précise des pages de vérification anti-robot. Testable avec des fixtures. */

const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

function cp(n) { try { return String.fromCodePoint(n); } catch (_) { return ' '; } }
function decodeHtml(v) {
  return String(v || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => cp(Number(d)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}
function htmlToText(html) {
  return clean(decodeHtml(String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')));
}

/* --- meta, titre --- */
function metaTags(html) {
  return (String(html || '').match(/<meta\b[^>]*>/gi) || []).map(tag => {
    const attrs = {};
    const re = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = m[2] != null ? m[2] : m[3];
    return attrs;
  });
}
function meta(html, wanted) {
  const w = String(wanted).toLowerCase();
  for (const a of metaTags(html)) {
    if ((a.property || '').toLowerCase() === w || (a.name || '').toLowerCase() === w || (a.itemprop || '').toLowerCase() === w) {
      const v = clean(decodeHtml(a.content || ''));
      if (v) return v;
    }
  }
  return null;
}
function pageTitle(html) {
  const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? clean(decodeHtml(m[1].replace(/<[^>]+>/g, ' '))) : null;
}
function textById(html, id) {
  const re = new RegExp('<(\\w+)\\b[^>]*\\bid=["\']' + id + '["\'][^>]*>([\\s\\S]{0,1500}?)<\\/\\1>', 'i');
  const m = String(html || '').match(re);
  return m ? clean(decodeHtml(m[2].replace(/<[^>]+>/g, ' '))) : null;
}
function firstH1(html) {
  const re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const t = clean(decodeHtml(m[1].replace(/<[^>]+>/g, ' ')));
    if (t.length >= 6) return t;
  }
  return null;
}

/* --- JSON-LD --- */
function parseJson(raw) {
  try { return JSON.parse(raw); } catch (_) {
    try { return JSON.parse(String(raw).replace(/[\u0000-\u001f]+/g, ' ')); } catch (_) { return null; }
  }
}
function flatten(value, out) {
  if (!value) return out;
  if (Array.isArray(value)) { value.forEach(v => flatten(v, out)); return out; }
  if (typeof value !== 'object') return out;
  out.push(value);
  if (value['@graph']) flatten(value['@graph'], out);
  return out;
}
function extractJsonLd(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) flatten(parseJson(m[1].trim()), out);
  return out;
}
function typeIs(node, names) {
  const t = node && node['@type'];
  const list = (Array.isArray(t) ? t : [t]).map(v => String(v || '').toLowerCase().split('/').pop());
  return list.some(v => names.includes(v));
}
const PRODUCT_TYPES = ['product', 'productgroup', 'individualproduct', 'productmodel'];
function pickProduct(ld) {
  const product = ld.find(x => typeIs(x, PRODUCT_TYPES) && clean(x.name));
  if (!product) return null;
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const brand = product.brand && typeof product.brand === 'object' ? product.brand.name : product.brand;
  const additional = Array.isArray(product.additionalProperty) ? product.additionalProperty : [];
  const additionalProperty = additional.map(p => ({
    name: clean(p && (p.name || p.propertyID)),
    value: clean(p && (p.value || p.valueReference))
  })).filter(p => p.name && p.value);
  return {
    name: clean(decodeHtml(product.name)), brand: clean(brand), model: clean(product.model), sku: clean(product.sku), mpn: clean(product.mpn),
    gtin: clean(product.gtin || product.gtin13 || product.gtin14 || product.gtin12 || product.gtin8),
    description: clean(decodeHtml(product.description)),
    additionalProperty,
    price: offers ? clean(offers.price || offers.lowPrice) : null,
    currency: offers ? clean(offers.priceCurrency) : null,
    availability: offers ? clean(offers.availability) : null,
    source: 'url', evidence: 'JSON-LD Product'
  };
}

/* --- microdonnées et état embarqué (Next.js, etc.) --- */
function microdataName(html) {
  const src = String(html || '');
  const i = src.search(/itemtype\s*=\s*["'][^"']*schema\.org\/Product["']/i);
  if (i < 0) return null;
  const slice = src.slice(i, i + 9000);
  const m = /<(\w+)\b[^>]*\bitemprop\s*=\s*["']name["'][^>]*>/i.exec(slice);
  if (!m) return null;
  const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(m[0]);
  if (content) return clean(decodeHtml(content[1] != null ? content[1] : content[2])) || null;
  const rest = slice.slice(m.index + m[0].length, m.index + m[0].length + 500);
  const inner = new RegExp('^([\\s\\S]*?)<\\/' + m[1] + '>', 'i').exec(rest);
  return inner ? clean(decodeHtml(inner[1].replace(/<[^>]+>/g, ' '))) || null : null;
}
function embeddedProductName(html) {
  const re = /<script\b[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]{0,600000}?)<\/script>/gi;
  const src = String(html || '');
  let m, scripts = 0;
  while ((m = re.exec(src)) && scripts++ < 6) {
    const data = parseJson(m[1]);
    if (!data) continue;
    let budget = 30000, found = null;
    const walk = (node, depth) => {
      if (found || !node || depth > 9 || budget-- <= 0) return;
      if (Array.isArray(node)) { node.forEach(n => walk(n, depth + 1)); return; }
      if (typeof node !== 'object') return;
      const name = node.productName || node.product_name || node.name || node.title;
      const looksProduct = ['gtin', 'gtin13', 'ean', 'sku', 'mpn', 'brand', 'brandName', 'price', 'offers'].some(k => node[k] != null);
      if (typeof name === 'string' && name.length >= 8 && looksProduct) { found = clean(decodeHtml(name)); return; }
      Object.keys(node).forEach(k => walk(node[k], depth + 1));
    };
    walk(data, 0);
    if (found) return found;
  }
  return null;
}

/* --- nettoyage et rejet des faux noms --- */
const MERCHANTS = 'Amazon(?:\\.[a-z.]+)?|Fnac(?:\\.com)?|Darty|Cdiscount|Rakuten|Boulanger|Rue du Commerce|Idealo|Back ?Market|Leclerc|Carrefour|Auchan|Ubaldi|LDLC|Materiel\\.net|Electro D[ée]p[ôo]t';
const SUFFIX = new RegExp('\\s*[|:–—-]\\s*(?:' + MERCHANTS + ')[^|]*$', 'i');
const PREFIX = new RegExp('^(?:' + MERCHANTS + ')\\s*[:|–—-]\\s*', 'i');
function cleanName(raw) {
  let n = clean(decodeHtml(raw));
  for (let i = 0; i < 2; i++) n = n.replace(PREFIX, '').replace(SUFFIX, '');
  const first = n.split(/\s+\|\s+/)[0];
  if (first.length >= 8) n = first;
  return clean(n);
}
const NOT_A_NAME = new RegExp('^(?:' + MERCHANTS + '|accueil|home|produit|product|loading|chargement|panier|cart|erreur|error|404)$|robot check|captcha|just a moment|attention required|access denied|pardon our interruption|are you (?:a )?(?:human|robot)|checking your browser|accès refusé|acces refuse|page (?:introuvable|non trouv)|not found|enable javascript|activer javascript|something went wrong|un instant', 'i');
function usableName(n) { return !!n && n.length >= 5 && !NOT_A_NAME.test(n); }

/* Candidats classés par fiabilité décroissante. */
function candidates(html) {
  const list = [];
  const ld = extractJsonLd(html);
  const product = pickProduct(ld);
  const add = (source, confidence, raw) => { if (!raw) return; const name = cleanName(raw); if (usableName(name)) list.push({ source, confidence, name }); };
  if (product) add('JSON-LD Product', 0.95, product.name);
  add('amazon #productTitle', 0.9, textById(html, 'productTitle'));
  add('microdata', 0.8, microdataName(html));
  add('état embarqué', 0.75, embeddedProductName(html));
  add('og:title', 0.7, meta(html, 'og:title'));
  add('twitter:title', 0.65, meta(html, 'twitter:title'));
  add('h1', 0.6, firstH1(html));
  add('title', 0.5, pageTitle(html));
  list.sort((a, b) => b.confidence - a.confidence);
  return { list, ld, product };
}

/* --- détection de page de vérification (précise : jamais sur une page où un produit a été lu) --- */
const CHALLENGE_TITLE = /robot check|captcha|just a moment|attention required|access denied|pardon our interruption|are you (?:a )?(?:human|robot)|verify you are (?:a )?human|security check|checking your browser|vérification de sécurité|accès refusé|acces refuse|un instant|veuillez patienter/i;
const VENDORS = [
  ['amazon', /validateCaptcha|opfcaptcha|Saisissez les caract[èe]res|Type the characters you see|Entrez les caract[èe]res/i],
  ['cloudflare', /cf-chl-|challenge-platform|__cf_chl|Cloudflare Ray ID/i],
  ['datadome', /captcha-delivery\.com/i],
  ['perimeterx', /px-captcha|_pxCaptcha/i],
  ['incapsula', /_Incapsula_Resource|Incapsula incident/i],
  ['akamai', /Access Denied[\s\S]{0,300}Reference #\d/i]
];
function detectBlock({ status, html, headers, usable }) {
  if (usable && status < 400) return null;
  const text = htmlToText(html);
  const title = pageTitle(html) || '';
  const head = String(html || '').slice(0, 300000);
  if (headers && headers.cfMitigated) return { reason: 'challenge', vendor: 'cloudflare' };
  if (text.length < 2500) {
    for (const [vendor, re] of VENDORS) if (re.test(head)) return { reason: 'challenge', vendor };
  }
  if (CHALLENGE_TITLE.test(title)) return { reason: 'challenge', vendor: null };
  if (status === 404 || status === 410) return { reason: 'notfound', vendor: null };
  if (status >= 400) return { reason: 'http', vendor: null, status };
  if (!usable && text.length < 300) return { reason: 'js', vendor: null };
  return null;
}

module.exports = { clean, decodeHtml, htmlToText, meta, pageTitle, textById, firstH1, extractJsonLd, pickProduct, microdataName, embeddedProductName, cleanName, usableName, candidates, detectBlock };
