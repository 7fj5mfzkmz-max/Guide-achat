'use strict';
/* Résolveur multi-marchands : une cascade de méthodes, chacune tracée.
   1. Indices de l'URL (ASIN, EAN, nom dans le chemin)       — toujours, sans réseau
   2. Lecture directe de la page (en-têtes de navigateur)      — variantes d'URL canoniques
   3. Analyse du code : JSON-LD, microdonnées, état embarqué, og:/twitter:, h1, title
   4. Rendu navigateur (service que vous exploitez)            — seulement pour les pages vides
   5. Recherche web via API officielle                         — ASIN / EAN / nom de l'URL
   6. Capture depuis le navigateur de l'utilisateur / saisie manuelle (côté front)
   Une page de vérification anti-robot arrête la cascade : aucun contournement n'est tenté. */
const { URL } = require('node:url');
const identify = require('../phone-analyzer/identify.js');
const netlib = require('./net.js');
const ex = require('./extract.js');
const search = require('./search.js');
const render = require('./render.js');

const BUDGET_MS = 24000;      // Vercel : maxDuration 30 s
const FETCH_TIMEOUT = 9000;

function extractYear(...texts) {
  const m = texts.filter(Boolean).join(' ').match(/\b(20(?:1[8-9]|2[0-7]))\b/);
  return m ? Number(m[1]) : null;
}

function candidateFromText(text) {
  const specs = {};
  const patterns = {
    ecran: /(\d+(?:[.,]\d+)?)\s*(?:pouces|"|″)[^.]{0,100}(?:OLED|AMOLED|LCD|LTPO)/i,
    refresh: /(\d{2,3})\s*Hz/i,
    batterie: /(\d[\d\s.]*)\s*mAh/i,
    ram: /(\d+(?:[.,]\d+)?)\s*Go\s*(?:de\s*)?RAM/i,
    charge: /(\d{2,3})\s*W\s*(?:charge|recharge)/i
  };
  for (const [key, re] of Object.entries(patterns)) { const m = text.match(re); if (m) specs[key] = ex.clean(m[0]); }
  return specs;
}

/* Décide si le contenu reçu décrit UN modèle ou une page générale. Pure et testable. */
function classifyContent({ urlClass, ld, html, text }) {
  const products = ld.filter(x => ex.pickProduct([x]));
  const listing = ld.some(x => /^(itemlist|collectionpage|offercatalog)$/.test(String(x['@type'] || '').toLowerCase()));
  const ogType = (ex.meta(html, 'og:type') || '').toLowerCase();
  if (listing || products.length > 1) return { kind: 'page', label: 'une page de catégorie ou de liste de produits' };
  if (products.length === 1 || ogType.includes('product') || urlClass.kind === 'product') return { kind: 'product', label: null };
  if (urlClass.kind === 'page') return { kind: 'page', label: urlClass.label };
  const prices = (text.match(/\d[\d\s.,]{0,8}\s?€/g) || []).length;
  if (prices >= 10) return { kind: 'page', label: 'une page de catégorie ou de liste de produits' };
  return { kind: 'unknown', label: null };
}

function buildClues(urls, product, bestName, extra) {
  const locals = urls.map(u => { try { return identify.identifyFromUrl(u); } catch (_) { return {}; } });
  const pick = key => (locals.find(l => l[key]) || {})[key] || null;
  const urlHint = pick('titleHint');
  const name = (product && product.name) || bestName || (extra && extra.searchBest) || urlHint || null;
  return {
    title: bestName || null,
    name,
    brand: (product && product.brand) || null,
    ean: (product && product.gtin) || pick('ean'),
    mpn: (product && (product.mpn || product.sku)) || null,
    asin: pick('asin'),
    urlHint,
    searchTitles: (extra && extra.searchTitles) || undefined,
    year: extractYear(name, bestName, urlHint)
  };
}

function variantsOf(parsed, asin) {
  const out = [];
  if (asin && /(^|\.)amazon\./i.test(parsed.hostname)) out.push('https://' + parsed.hostname + '/dp/' + asin);
  out.push(parsed.toString());
  const bare = new URL(parsed.toString()); bare.search = ''; bare.hash = '';
  out.push(bare.toString());
  return Array.from(new Set(out)).slice(0, 3);
}

/* Lit une page déjà téléchargée : candidats, produit, verdict de blocage. */
function inspectHtml(fetched) {
  const html = fetched.html || '';
  const c = ex.candidates(html);
  const usable = fetched.status < 400 && c.list.length > 0;
  const block = ex.detectBlock({ status: fetched.status, html, headers: fetched.headers, usable });
  return { html, text: ex.htmlToText(html), ld: c.ld, product: c.product, list: c.list, usable: usable && !block, block };
}

async function resolve(target) {
  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  const trace = [];
  let parsed;
  try { parsed = new URL(target); } catch (_) { return { ok: false, error: 'URL invalide.' }; }
  if (!/^https?:$/.test(parsed.protocol)) return { ok: false, error: 'Seules les URL HTTP/HTTPS sont acceptées.' };

  const urlClass = identify.classifyUrl(target);
  const urlLocal = identify.identifyFromUrl(target);
  trace.push({ step: 'url', asin: urlLocal.asin || null, ean: urlLocal.ean || null, hint: urlLocal.titleHint || null });

  if (urlClass.kind === 'page' && urlClass.strong) {
    return { ok: true, kind: 'page', pageLabel: urlClass.label, finalUrl: target, merchantHost: parsed.hostname, clues: buildClues([target], null, null), trace };
  }

  const fail = extra => {
    const clues = buildClues([target].concat(extra && extra.finalUrl ? [extra.finalUrl] : []), null, null);
    // Même lorsqu’une page bloque la lecture serveur, l’indice du modèle contenu
    // dans l’URL reste exploitable pour demander une confirmation ou proposer une
    // analyse externe. L’absence du catalogue ne doit pas effacer cet indice.
    return Object.assign({
      ok: false, kind: urlClass.kind, pageLabel: urlClass.label, merchantHost: parsed.hostname, needsCapture: true,
      clues, trace
    }, extra);
  };

  /* 2 + 3 : lecture directe puis analyse du code, variantes d'URL */
  let good = null, last = null, shell = null, blockedBy = null;
  for (const variant of variantsOf(parsed, urlLocal.asin)) {
    if (left() < 3000) { trace.push({ step: 'fetch', url: variant, outcome: 'budget' }); break; }
    let fetched;
    try { fetched = await netlib.fetchHtml(variant, { timeout: Math.min(FETCH_TIMEOUT, left() - 1500) }); }
    catch (error) { trace.push({ step: 'fetch', url: variant, outcome: error.name === 'AbortError' ? 'timeout' : 'erreur', detail: error.message }); break; }
    const page = inspectHtml(fetched);
    last = { fetched, page };
    trace.push({ step: 'fetch', url: variant, status: fetched.status, outcome: page.usable ? 'lu' : (page.block ? page.block.reason + (page.block.vendor ? ':' + page.block.vendor : '') : 'sans nom'), source: page.list[0] ? page.list[0].source : null });
    if (page.usable) { good = { fetched, page, strategy: 'fetch' }; break; }
    if (page.block && page.block.reason === 'challenge') { blockedBy = page.block; break; }   // on ne insiste pas, on ne contourne pas
    if (page.block && page.block.reason === 'js') { shell = fetched; break; }
  }

  /* 4 : rendu navigateur, uniquement pour une page vide sans JavaScript */
  if (!good && shell && render.enabled() && left() > 4000) {
    const html = await render.renderHtml(shell.finalUrl, Math.min(12000, left() - 1500));
    if (html) {
      const fetched = { status: 200, finalUrl: shell.finalUrl, html, headers: {} };
      const page = inspectHtml(fetched);
      trace.push({ step: 'render', outcome: page.usable ? 'lu' : (page.block ? page.block.reason : 'sans nom'), source: page.list[0] ? page.list[0].source : null });
      if (page.usable) good = { fetched, page, strategy: 'render' };
    } else trace.push({ step: 'render', outcome: 'indisponible' });
  }

  if (good) {
    const { fetched, page, strategy } = good;
    const verdict = classifyContent({ urlClass, ld: page.ld, html: page.html, text: page.text });
    const best = page.list[0];
    const clues = buildClues([target, fetched.finalUrl], page.product, best.name);
    const base = { ok: true, kind: verdict.kind, pageLabel: verdict.label, finalUrl: fetched.finalUrl, merchantHost: parsed.hostname, strategy, clues, trace };
    if (verdict.kind === 'page') return base;
    return Object.assign(base, {
      product: page.product || { name: best.name, brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: 'url', evidence: best.source },
      specs: candidateFromText(page.text),
      evidence: [best.source].concat(strategy === 'render' ? ['rendu navigateur'] : []),
      warning: page.product ? null : 'Aucun objet Product structuré trouvé; identification à confirmer.'
    });
  }

  /* 5 : recherche web (ASIN / EAN / nom de l'URL) quand la page n'a rien donné */
  const finalUrl = last ? last.fetched.finalUrl : target;
  const baseClues = buildClues([target, finalUrl], null, null);
  if (search.enabled() && left() > 3000) {
    const found = await search.lookup(baseClues, Math.min(6000, left() - 1000));
    trace.push({ step: 'search', outcome: found ? 'trouvé' : 'rien', n: found ? found.titles.length : 0 });
    if (found) {
      return {
        ok: true, kind: 'product', finalUrl, merchantHost: parsed.hostname, strategy: 'search',
        product: { name: found.best, brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: 'search', evidence: 'recherche web' },
        specs: {}, evidence: ['recherche web'], warning: 'Page illisible : modèle déduit d’une recherche web, à confirmer.',
        clues: buildClues([target, finalUrl], null, null, { searchBest: found.best, searchTitles: found.titles }), trace
      };
    }
  } else trace.push({ step: 'search', outcome: 'non configurée' });

  /* 6 : rien de lisible côté serveur → capture dans le navigateur de l'utilisateur */
  const status = last ? last.fetched.status : null;
  if (blockedBy) return fail({ blocked: true, reason: 'challenge', vendor: blockedBy.vendor, status, finalUrl, error: 'Le site demande une vérification anti-robot.' });
  if (last && last.page.block && last.page.block.reason === 'http') return fail({ blocked: true, reason: 'http', status, finalUrl, error: 'Le site a répondu HTTP ' + status + '.' });
  if (last && last.page.block && last.page.block.reason === 'notfound') return fail({ reason: 'notfound', status, finalUrl, error: 'Page introuvable.' });
  if (shell || (last && last.page.block && last.page.block.reason === 'js')) return fail({ jsOnly: true, reason: 'js', status, finalUrl, error: 'La page ne contient pas de données lisibles sans navigateur.' });
  if (last) return fail({ reason: 'unreadable', status, finalUrl, error: 'Aucun nom de produit lisible sur la page.' });
  return fail({ reason: 'network', error: 'Impossible de récupérer la page.' });
}

module.exports = { resolve, classifyContent, candidateFromText, isPrivateIp: netlib.isPrivateIp, assertPublicHost: netlib.assertPublicHost, looksBlocked: ex.detectBlock, readTitle: html => { const c = ex.candidates(html).list[0]; return c ? c.name : null; }, pageTitle: ex.pageTitle };
