'use strict';
/* Identification par recherche web, via une API de recherche officielle (clé requise).
   Utile quand la page elle-même est illisible : l'ASIN, l'EAN ou le nom tiré de l'URL
   sont cherchés sur le web et les titres des résultats servent d'indices. */
const { cleanName, usableName } = require('./extract.js');

const PHONE_WORD = /\b(?:iphone|galaxy|pixel|xiaomi|redmi|poco|oneplus|oppo|realme|honor|motorola|moto|nokia|sony|xperia|huawei|nothing|fairphone|asus|zenfone|smartphone|t[ée]l[ée]phone)\b/i;

function enabled() { return !!(process.env.BRAVE_API_KEY || process.env.SERPER_API_KEY); }

function queriesFor(clues) {
  const out = [];
  if (clues.ean) out.push(String(clues.ean));
  if (clues.asin) out.push(String(clues.asin));
  if (clues.urlHint && clues.urlHint.split(/\s+/).length >= 2) out.push(String(clues.urlHint));
  return out.slice(0, 2);
}

async function rawTitles(query, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    if (process.env.BRAVE_API_KEY) {
      const r = await fetch('https://api.search.brave.com/res/v1/web/search?count=8&country=fr&search_lang=fr&q=' + encodeURIComponent(query), {
        headers: { accept: 'application/json', 'x-subscription-token': process.env.BRAVE_API_KEY }, signal: controller.signal
      });
      if (!r.ok) return [];
      const d = await r.json();
      return ((d.web && d.web.results) || []).map(x => x.title);
    }
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.SERPER_API_KEY },
      body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 8 }), signal: controller.signal
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.organic || []).map(x => x.title);
  } catch (_) { return []; } finally { clearTimeout(timer); }
}

async function lookup(clues, timeout) {
  if (!enabled()) return null;
  const titles = [];
  for (const q of queriesFor(clues)) {
    const found = await rawTitles(q, timeout || 6000);
    found.forEach(t => { const n = cleanName(t || ''); if (usableName(n) && PHONE_WORD.test(n) && !titles.includes(n)) titles.push(n); });
    if (titles.length >= 3) break;
  }
  return titles.length ? { titles: titles.slice(0, 5), best: titles[0] } : null;
}

module.exports = { lookup, enabled, queriesFor };
