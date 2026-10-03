'use strict';
/* Résolveur multi-marchands : une cascade de méthodes, chacune tracée.
   1. Indices de l'URL (ASIN, EAN, nom dans le chemin)       — toujours, sans réseau
   1b. Pivot par identifiant (GTIN → référentiel produit Icecat), lancé en parallèle de la lecture directe
   2. Lecture directe de la page (en-têtes de navigateur)      — variantes d'URL canoniques
   3. Analyse du code : JSON-LD, microdonnées, état embarqué, og:/twitter:, h1, title
   4. Rendu navigateur (service que vous exploitez)            — seulement pour les pages vides
   5. Recherche web via API officielle                         — ASIN / EAN / nom de l'URL
   6. Capture depuis le navigateur de l'utilisateur / saisie manuelle (côté front)
   Une page de vérification anti-robot arrête la cascade : aucun contournement n'est tenté. */
const { URL } = require('node:url');
const identify = require('../phone-analyzer/identify.js');
const identity = require('../phone-analyzer/identity.js');
const icecat = require('./icecat.js');
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

function candidateFromText(text, product) {
  const source = [
    text,
    product && product.description,
    product && product.model,
    product && (product.additionalProperty || []).map(p => (p.name || '') + ': ' + (p.value || '')).join(' ')
  ].filter(Boolean).join(' ');
  const specs = {};
  const first = (...patterns) => {
    for (const re of patterns) { const m = source.match(re); if (m) return ex.clean(m[0]); }
    return null;
  };
  const screen = first(/(?:écran|display|screen)[^\d]{0,80}(\d+(?:[.,]\d+)?)\s*(?:pouces|po|inch|inches|"|″)/i, /(\d+(?:[.,]\d+)?)\s*(?:pouces|po|inch|inches|"|″)\b/i);
  if (screen) specs.ecran = screen;
  const refresh = first(/(?:écran|display|refresh|fréquence|taux)[^\d]{0,50}(\d{2,3})\s*Hz/i, /\b(\d{2,3})\s*Hz\b/i);
  if (refresh) specs.refresh = refresh;
  const battery = first(/(?:batterie|battery|capacité)[^\d]{0,50}(\d[\d\s.]*)\s*mAh/i, /\b(\d[\d\s.]*)\s*mAh\b/i);
  if (battery) specs.batterie = battery;
  const ram = first(/(?:RAM|mémoire vive|mémoire)[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(?:Go|GB)\b/i, /\b(\d+(?:[.,]\d+)?)\s*(?:Go|GB)\s*RAM\b/i);
  if (ram) specs.ram = ram;
  const storage = first(/(?:stockage|mémoire interne|storage)[^\d]{0,40}(\d+(?:[.,]\d+)?)\s*(?:Go|GB|To|TB)\b/i, /\b(\d+(?:[.,]\d+)?)\s*(?:Go|GB|To|TB)\s*(?:de stockage|stockage|mémoire interne)\b/i);
  if (storage) specs.stockage = storage;
  const charge = first(/(?:charge|recharge|charging)[^\d]{0,50}(\d{2,3})\s*W\b/i, /\b(\d{2,3})\s*W\s*(?:charge|recharge|charging)\b/i);
  if (charge) specs.charge = charge;
  const photo = first(/(?:appareil photo|caméra|camera|photo)[^\d]{0,60}(\d{2,3})\s*MP/i, /\b(\d{2,3})\s*MP\b/i);
  if (photo) specs.photo = photo;
  const processor = source.match(/\b(?:Snapdragon|MediaTek|Dimensity|Helio|Tensor|Exynos|A\d{2}|Kirin|Unisoc|Apple Silicon)[^,;|\n]{0,60}/i);
  if (processor) specs.processeur = ex.clean(processor[0]);
  const os = source.match(/\b(?:Android\s+[\d.]+|iOS\s+[\d.]+|HarmonyOS\s+[\d.]+)\b/i);
  if (os) specs.os = ex.clean(os[0]);
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


function readerPage(text) {
  const raw = String(text || '').replace(/\r/g, '');
  const lines = raw.split('\n').map(x => x.trim()).filter(Boolean);
  const titleLine = lines.find(x => /^#{1,2}\s+/.test(x)) || lines.find(x => /^Title\s*:/i.test(x));
  let title = titleLine ? titleLine.replace(/^#{1,2}\s+/, '').replace(/^Title\s*:\s*/i, '').trim() : '';
  title = ex.cleanName(title);
  if (!title || !ex.usableName(title)) {
    const candidate = lines.find(x => ex.usableName(x) && !/^https?:\/\//i.test(x) && x.length < 220);
    title = candidate ? ex.cleanName(candidate) : '';
  }
  const safe = String(title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const body = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  return { html: '<html><head><title>' + safe + '</title></head><body><h1>' + safe + '</h1><div>' + body + '</div></body></html>', title };
}

/* ---- Pivot par identifiant : le modèle est confirmé et complété par un référentiel indépendant du marchand ---- */
const CORE_SPECS = ['ecran', 'processeur', 'ram', 'batterie', 'charge', 'refresh'];

async function enrich(ctx) {
  const { gtins, brand, mpn, names, weakNames, early, earlyGtin, timeout, trace } = ctx;
  if (!icecat.enabled()) { trace.push({ step: 'icecat', outcome: 'non configuré' }); return null; }
  let r = early ? await early : null;
  if (!(r && r.found)) {
    const rest = gtins.filter(g => g !== earlyGtin || !early);
    if (!rest.length && !(brand && mpn)) {
      if (!early) { trace.push({ step: 'icecat', outcome: 'aucun identifiant' }); return null; }
    } else r = await icecat.lookup({ gtins: rest, brand, mpn }, { timeout });
  }
  if (!r || !r.found) { trace.push({ step: 'icecat', outcome: 'absent', detail: (r && r.reason) || null }); return null; }
  const label = [r.brand, r.title].filter(Boolean).join(' ');
  const v = identity.verifyReference(label, names, weakNames);
  trace.push({ step: 'icecat', outcome: v.verdict === 'conflict' ? 'conflit' : 'trouvé', by: r.by, verification: v.verdict, specs: Object.keys(r.specs).length, detail: v.detail });
  if (v.verdict === 'conflict') return { conflict: true, reference: label, detail: v.detail };
  return Object.assign({}, r, { verification: v.verdict, label });
}

/* Priorité : référentiel > texte de la page. Chaque valeur garde sa provenance ; ce qui manque est « inconnu ». */
function mergeSpecs(pageSpecs, ic) {
  const specs = Object.assign({}, pageSpecs), specSources = {};
  Object.keys(pageSpecs).forEach(k => { specSources[k] = 'page'; });
  if (ic && ic.specs) Object.keys(ic.specs).forEach(k => { specs[k] = ic.specs[k]; specSources[k] = 'icecat'; });
  return { specs, specSources, specsUnknown: CORE_SPECS.filter(k => !specs[k]) };
}

/* Identification du modèle, indépendante de sa présence au catalogue (jugée côté navigateur). */
function buildIdentity({ name, product, ic }) {
  if (ic && !ic.conflict) {
    return {
      status: ic.verification === 'confirmed' ? 'identified' : 'partial',
      name: ic.label || name || null, brand: ic.brand || null, gtin: ic.by === 'gtin' ? ic.matched : null, mpn: ic.mpn || null,
      basis: [ic.by === 'gtin' ? 'code-barres (GTIN) → fiche du référentiel produit' : 'marque + référence → fiche du référentiel produit'],
      verification: ic.verification
    };
  }
  if (ic && ic.conflict) {
    return { status: 'partial', name: name || null, brand: (product && product.brand) || null, basis: ['page du marchand'],
      conflict: 'Le référentiel désigne « ' + ic.reference + ' » alors que la page indique un autre modèle (' + ic.detail + ') : aucune donnée du référentiel n’a été utilisée.' };
  }
  if (name) return { status: 'partial', name, brand: (product && product.brand) || null, gtin: (product && identity.cleanGtin(product.gtin)) || null, mpn: (product && (product.mpn || product.sku)) || null, basis: ['page du marchand'] };
  return { status: 'unknown', name: null, basis: [] };
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

  /* Pivot par identifiant : si l'URL contient un code-barres valide, la fiche du référentiel est demandée
     en parallèle de la lecture de la page (aucune dépendance au marchand). */
  const urlGtin = identity.cleanGtin(urlLocal.ean);
  const icecatEarly = (urlGtin && icecat.enabled() && !(urlClass.kind === 'page' && urlClass.strong))
    ? icecat.lookup({ gtins: [urlGtin] }, { timeout: 5000 }).catch(() => null) : null;

  if (urlClass.kind === 'page' && urlClass.strong) {
    return { ok: true, kind: 'page', pageLabel: urlClass.label, finalUrl: target, merchantHost: parsed.hostname, clues: buildClues([target], null, null), trace };
  }

  const fail = extra => Object.assign({
    ok: false, kind: urlClass.kind, pageLabel: urlClass.label, merchantHost: parsed.hostname, needsCapture: true,
    clues: buildClues([target].concat(extra && extra.finalUrl ? [extra.finalUrl] : []), null, null), trace
  }, extra);

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
    const gtins = Array.from(new Set([urlGtin, identity.cleanGtin(page.product && page.product.gtin)].concat(identity.gtinsInHtml(page.html)).filter(Boolean))).slice(0, 3);
    const ic = await enrich({
      gtins, brand: page.product && page.product.brand, mpn: page.product && (page.product.mpn || page.product.sku),
      names: [page.product && page.product.name, best.name], weakNames: [urlLocal.titleHint], early: icecatEarly, earlyGtin: urlGtin,
      timeout: Math.min(5000, left() - 1500), trace
    });
    const merged = mergeSpecs(candidateFromText(page.text, page.product), ic && !ic.conflict ? ic : null);
    const product = page.product || { name: best.name, brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: 'url', evidence: best.source };
    let warning = page.product ? null : 'Aucun objet Product structuré trouvé; identification à confirmer.';
    if (ic && ic.conflict) warning = 'Le référentiel produit désigne un autre modèle que la page : ses données n’ont pas été utilisées.';
    return Object.assign(base, {
      product, specs: merged.specs, specSources: merged.specSources, specsUnknown: merged.specsUnknown,
      identity: buildIdentity({ name: product.name, product, ic }),
      evidence: [best.source].concat(strategy === 'render' ? ['rendu navigateur'] : []).concat(ic && !ic.conflict ? ['référentiel produit'] : []),
      warning
    });
  }

  /* 4b : la page est illisible mais l'URL contenait un code-barres : le référentiel suffit à identifier le modèle
     et à lire ses caractéristiques (aucun contournement du marchand). */
  if (!good && icecatEarly) {
    const ic = await enrich({ gtins: [urlGtin], names: [], weakNames: [urlLocal.titleHint], early: icecatEarly, earlyGtin: urlGtin, timeout: Math.min(5000, left() - 1000), trace });
    if (ic && !ic.conflict) {
      const furl = last ? last.fetched.finalUrl : target;
      const merged = mergeSpecs({}, ic);
      return {
        ok: true, kind: 'product', finalUrl: furl, merchantHost: parsed.hostname, strategy: 'icecat',
        product: { name: ic.label, brand: ic.brand, sku: null, mpn: ic.mpn, gtin: ic.by === 'gtin' ? ic.matched : null, price: null, currency: null, availability: null, source: 'icecat', evidence: 'référentiel produit' },
        specs: merged.specs, specSources: merged.specSources, specsUnknown: merged.specsUnknown,
        identity: buildIdentity({ name: ic.label, product: null, ic }),
        evidence: ['référentiel produit (code-barres de l’URL)'],
        warning: 'La page du marchand n’a pas pu être lue : modèle et caractéristiques issus du référentiel produit, à partir du code-barres de l’URL.',
        clues: buildClues([target, furl], null, ic.label), trace
      };
    }
  }

  /* 5 : lecteur secondaire. Il sert surtout aux pages dont le HTML serveur est pauvre
     (JS léger, contenu masqué, structure difficile à parser). On ne l'utilise jamais après
     une détection explicite de CAPTCHA/anti-robot. */
  if (!good && !blockedBy && left() > 6000) {
    try {
      await netlib.assertPublicHost(parsed.hostname);
      const reader = await netlib.fetchReader(target, { timeout: Math.min(7000, left() - 2500) });
      if (reader) {
        const rp = readerPage(reader.text);
        const page = inspectHtml({ status: 200, finalUrl: target, html: rp.html, headers: {} });
        trace.push({ step: 'reader', outcome: page.usable ? 'lu' : 'sans modèle', source: 'reader', title: rp.title || null });
        if (page.usable) {
          const verdict = classifyContent({ urlClass, ld: page.ld, html: page.html, text: page.text });
          const best = page.list[0];
          const clues = buildClues([target], page.product, best.name);
          const base = { ok: true, kind: verdict.kind, pageLabel: verdict.label, finalUrl: target, merchantHost: parsed.hostname, strategy: 'reader', clues, trace };
          if (verdict.kind === 'page') return base;
          return Object.assign(base, {
            product: page.product || { name: best.name, brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: 'reader', evidence: 'lecteur secondaire' },
            specs: candidateFromText(page.text, page.product),
            evidence: ['lecteur secondaire'],
            warning: 'Informations extraites par un lecteur secondaire ; à confirmer si la page affiche plusieurs variantes.'
          });
        }
      }
    } catch (error) {
      trace.push({ step: 'reader', outcome: 'erreur', detail: error.message });
    }
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
