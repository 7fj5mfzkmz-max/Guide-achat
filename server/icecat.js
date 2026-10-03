'use strict';
/* Référentiel produit indépendant des marchands (Icecat, API JSON « live »).
   Principe : on ne lit pas la page du marchand, on résout un IDENTIFIANT (GTIN/EAN, ou marque + référence
   constructeur) vers une fiche produit constructeur. Aucun contournement : c'est une API officielle.

   Configuration (Vercel → Environment Variables) :
     ICECAT_USERNAME       identifiant Open Icecat (compte gratuit)  — active la méthode
     ICECAT_API_TOKEN      jeton d'accès API (en-tête api-token), si votre compte en exige un
     ICECAT_CONTENT_TOKEN  jeton de contenu, si votre abonnement en fournit un
     ICECAT_LANG           langue des fiches (défaut : fr ; repli automatique sur en)
     ICECAT_ENDPOINT       surcharge de l'adresse de l'API (tests, proxy)

   Règle d'or : une valeur n'est retenue que si elle porte son unité (mAh, Hz, W, Go…). Sinon elle est
   ignorée : la caractéristique reste « inconnue », jamais déduite. */
const identity = require('../phone-analyzer/identity.js');

const ENDPOINT = () => process.env.ICECAT_ENDPOINT || 'https://live.icecat.biz/api';
const enabled = () => !!process.env.ICECAT_USERNAME;
const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

/* Règles d'extraction : nom de caractéristique (FR/EN) → clé du guide, avec contrôle de l'unité. */
const RULES = [
  { key: 'batterie', name: /battery capacity|capacit[eé] de (?:la )?batterie/i, accept: v => /\d\s*mAh/i.test(v) },
  { key: 'refresh', name: /refresh rate|taux de rafra[iî]chissement|fr[eé]quence de rafra[iî]chissement/i, accept: v => /\d\s*Hz/i.test(v) },
  { key: 'charge', name: /charging (?:power|speed)|puissance de charge|fast charging power/i, accept: v => /\d\s*W\b/i.test(v) },
  { key: 'ecran', name: /display diagonal|diagonale de l.[eé]cran|screen diagonal/i, accept: v => /\d/.test(v) },
  { key: 'processeur', name: /processor model|mod[eè]le du processeur|processor family|famille de processeur/i, accept: v => v.length >= 3 },
  { key: 'ram', name: /\bRAM\b|m[eé]moire vive/i, accept: v => /\d\s*(?:GB|Go)\b/i.test(v) && gbValue(v) <= 24 },
  { key: 'stockage', name: /storage capacity|capacit[eé] de stockage|internal storage|stockage interne/i, accept: v => /\d\s*(?:GB|Go|TB|To)\b/i.test(v) },
  { key: 'photo', name: /rear camera.*resolution|r[eé]solution.*arri[eè]re|rear camera \(megapixels?\)|rear camera megapixel/i, accept: v => /\d\s*(?:MP|Mpx|megapixels?)/i.test(v) },
  { key: 'etancheite', name: /ingress protection|IP code|indice de protection|degr[eé] de protection/i, accept: v => /\bIP\s?\d{2}/i.test(v) },
  { key: 'os', name: /operating system installed|syst[eè]me d.exploitation install[eé]/i, accept: v => /\b(?:Android|iOS|HarmonyOS)\b/i.test(v) }
];
function gbValue(v) { const m = String(v).match(/(\d+(?:[.,]\d+)?)\s*(GB|Go|TB|To)\b/i); if (!m) return Infinity; const n = parseFloat(m[1].replace(',', '.')); return /t/i.test(m[2]) ? n * 1024 : n; }

function featureValue(f) {
  const raw = f && (f.PresentationValue != null ? f.PresentationValue : (f.LocalValue != null ? f.LocalValue : f.Value));
  return typeof raw === 'string' || typeof raw === 'number' ? clean(raw) : '';
}
function featureName(f) {
  const n = f && ((f.Feature && f.Feature.Name && (f.Feature.Name.Value || f.Feature.Name)) || (f.Name && (f.Name.Value || f.Name)));
  return typeof n === 'string' ? clean(n) : '';
}

/* Transforme la réponse JSON en fiche exploitable, ou null. Pure : testable sans réseau. */
function parse(json) {
  const data = json && json.data;
  const info = data && data.GeneralInfo;
  if (!info) return null;
  const features = [];
  (Array.isArray(data.FeaturesGroups) ? data.FeaturesGroups : []).forEach(g => (Array.isArray(g.Features) ? g.Features : []).forEach(f => features.push(f)));

  const specs = {}, evidence = {};
  features.forEach(f => {
    const name = featureName(f), value = featureValue(f);
    if (!name || !value) return;
    RULES.forEach(rule => { if (!specs[rule.key] && rule.name.test(name) && rule.accept(value)) { specs[rule.key] = value; evidence[rule.key] = name; } });
  });
  /* « Internal memory / Mémoire interne » désigne la RAM chez Icecat, mais le stockage chez beaucoup de marchands :
     on ne l'accepte comme RAM que si une caractéristique de stockage distincte existe et que la valeur est plausible. */
  if (!specs.ram && specs.stockage) {
    const alt = features.find(f => /^(?:internal memory|m[eé]moire interne)$/i.test(featureName(f)));
    const v = alt ? featureValue(alt) : '';
    if (v && /\d\s*(?:GB|Go)\b/i.test(v) && gbValue(v) <= 24 && clean(v) !== clean(specs.stockage)) { specs.ram = v; evidence.ram = featureName(alt); }
  }

  const gtins = [].concat(info.GTIN || []).map(identity.cleanGtin).filter(Boolean);
  return {
    brand: clean(info.Brand || info.BrandName) || null,
    title: clean(info.ProductName || info.Title) || null,
    mpn: clean(info.BrandPartCode) || null,
    gtins, icecatId: info.IcecatId || null, specs, evidence
  };
}

async function call(params, timeout) {
  const url = new URL(ENDPOINT());
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
  url.searchParams.set('UserName', process.env.ICECAT_USERNAME);
  if (process.env.ICECAT_CONTENT_TOKEN) url.searchParams.set('content-token', process.env.ICECAT_CONTENT_TOKEN);
  const headers = { accept: 'application/json' };
  if (process.env.ICECAT_API_TOKEN) headers['api-token'] = process.env.ICECAT_API_TOKEN;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (response.status === 404) return { miss: 'absent du référentiel' };
    if (!response.ok) return { miss: 'HTTP ' + response.status };
    return { json: await response.json() };
  } catch (error) {
    return { miss: error.name === 'AbortError' ? 'délai dépassé' : 'erreur réseau' };
  } finally { clearTimeout(timer); }
}

/* Recherche par identifiant. ids = { gtins: [...], brand, mpn }. Essais : GTIN (2 max), puis marque + référence.
   Retourne { found: true, by, matched, ...fiche } ou { found: false, reason }. */
async function lookup(ids, options) {
  if (!enabled()) return { found: false, reason: 'non configuré' };
  const budgetEnd = Date.now() + ((options && options.timeout) || 5000);
  const lang = process.env.ICECAT_LANG || 'fr';
  const attempts = [];
  (ids.gtins || []).map(identity.cleanGtin).filter(Boolean).slice(0, 2).forEach(g => attempts.push({ by: 'gtin', matched: g, params: { GTIN: g } }));
  const brand = clean(ids.brand).slice(0, 60), mpn = clean(ids.mpn).slice(0, 60);
  if (brand && mpn && /^[\w .\/+-]+$/.test(mpn)) attempts.push({ by: 'brand+mpn', matched: brand + ' | ' + mpn, params: { Brand: brand, ProductCode: mpn } });
  if (!attempts.length) return { found: false, reason: 'aucun identifiant' };

  let reason = 'absent du référentiel';
  for (const attempt of attempts) {
    for (const language of lang === 'en' ? ['en'] : [lang, 'en']) {
      const left = budgetEnd - Date.now();
      if (left < 400) return { found: false, reason: 'délai dépassé' };
      const res = await call(Object.assign({ Language: language }, attempt.params), Math.min(4000, left));
      if (res.miss) { reason = res.miss; if (res.miss !== 'absent du référentiel') break; continue; }
      const fiche = parse(res.json);
      if (fiche && (fiche.title || Object.keys(fiche.specs).length)) return Object.assign({ found: true, by: attempt.by, matched: attempt.matched, language }, fiche);
      reason = 'fiche vide';
    }
  }
  return { found: false, reason };
}

module.exports = { enabled, lookup, parse, RULES };
