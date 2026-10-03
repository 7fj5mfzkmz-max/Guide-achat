const test = require('node:test');
const assert = require('node:assert/strict');
const dnsP = require('node:dns').promises;
const identity = require('../phone-analyzer/identity.js');
const crosscheck = require('../phone-analyzer/crosscheck.js');
const icecat = require('../server/icecat.js');
const { resolve } = require('../server/resolve.js');
const catalogue = require('../smartphones.json').produits;

/* ---------- identité : un numéro seul n'identifie rien, une variante n'est pas le modèle de base ---------- */

test('identité : iPhone 15 ≠ OnePlus 15, iPhone 16 ≠ iPhone 15, un numéro seul ne conclut pas', () => {
  assert.equal(identity.compare('Apple iPhone 15', 'OnePlus 15').verdict, 'different');
  assert.equal(identity.compare('iPhone 16', 'iPhone 15').verdict, 'different');
  assert.equal(identity.compare('15', 'OnePlus 15').verdict, 'unknown');
  assert.equal(identity.compare('Apple iPhone 15', 'Smartphone 128 Go').verdict, 'unknown');
});

test('identité : une variante est un autre modèle (Pro, Pro Max, +, T, 4G/5G)', () => {
  assert.equal(identity.compare('Apple iPhone 17 Pro', 'Apple iPhone 17 Pro Max 256 Go').verdict, 'different');
  assert.equal(identity.compare('Galaxy S26+', 'Samsung Galaxy S26 256 Go').verdict, 'different');
  assert.equal(identity.compare('Xiaomi 15T', 'Xiaomi 15 256 Go').verdict, 'different');
  assert.equal(identity.compare('Xiaomi Redmi Note 15 5G', 'Xiaomi Redmi Note 15 4G').verdict, 'different');
});

test('identité : stockage, couleur, « 5G » ajouté et espaces dans le nom ne changent pas le modèle', () => {
  assert.equal(identity.compare('Samsung Galaxy A56', 'Samsung Galaxy A56 5G 256 Go Noir').verdict, 'same');
  assert.equal(identity.compare('Apple iPhone 15 128GB Black', 'apple iphone 15 128go noir').verdict, 'same');
  assert.equal(identity.compare('Galaxy Z Fold8', 'Samsung Galaxy Z Fold 8').verdict, 'same');
  assert.equal(identity.compare('Nokia G10', 'Nokia G10 32 Go').verdict, 'same');
});

test('GTIN : la clé de contrôle est vérifiée, les codes inventés sont rejetés', () => {
  assert.equal(identity.isValidGtin('4006381333931'), true);
  assert.equal(identity.isValidGtin('4006381333932'), false);
  assert.equal(identity.cleanGtin('4006381333932'), null);
  const found = identity.gtinsInHtml('<script>{"gtin13":"4006381333931","ean":"1234567890123"}</script>');
  assert.deepEqual(found, ['4006381333931']);
});

/* ---------- catalogue : plus de substitution silencieuse, avec le vrai catalogue ---------- */

test('catalogue : une variante lue sur la page n’est jamais acceptée comme le modèle de base', () => {
  const search = h => crosscheck.search(catalogue, { hints: [h] });
  assert.notEqual(search('Apple iPhone 17 Pro Max 256 Go').status, 'identified');
  assert.equal(search('Apple iPhone 17 Pro Max 256 Go').best, undefined);
  assert.equal(search('Xiaomi Redmi Note 15 Pro 5G').status, 'unknown');
  assert.equal(search('Samsung Galaxy A56 Ultra').status, 'unknown');
  assert.equal(search('Apple iPhone 17 Pro 256 Go Orange').best.nom, 'Apple iPhone 17 Pro', 'le modèle exact reste reconnu');
  assert.equal(search('Samsung Galaxy A56 5G 256 Go Noir').status, 'identified');
});

test('catalogue : Nokia G10 reste identifiable hors catalogue (aucun candidat inventé)', () => {
  const r = crosscheck.search(catalogue, { hints: ['Nokia G10 32 Go'] });
  assert.equal(r.status, 'unknown');
  assert.deepEqual(r.ranked, []);
});

/* ---------- référentiel : lecture prudente (fixture SIMULÉE : la forme exacte reste à valider par un vrai appel) ---------- */

const feat = (name, value) => ({ Feature: { Name: { Value: name } }, PresentationValue: value });
const ICE_OK = {
  data: {
    GeneralInfo: { Brand: 'Apple', ProductName: 'iPhone 15 128GB Black', BrandPartCode: 'MTP03ZD/A', GTIN: ['4006381333931'], IcecatId: 1 },
    FeaturesGroups: [{ Features: [
      feat('Battery capacity', '3349 mAh'), feat('Refresh rate', '60 Hz'), feat('Storage capacity', '128 GB'),
      feat('Internal memory', '6 GB'), feat('Charging power', 'Yes'), feat('Display diagonal', '15.5 cm (6.1")')
    ] }]
  }
};

test('référentiel : valeur sans unité ignorée (inconnue), « Internal memory » = RAM seulement si le stockage est distinct', () => {
  const f = icecat.parse(ICE_OK);
  assert.equal(f.specs.batterie, '3349 mAh');
  assert.equal(f.specs.refresh, '60 Hz');
  assert.equal(f.specs.stockage, '128 GB');
  assert.equal(f.specs.ram, '6 GB');
  assert.equal(f.specs.charge, undefined, '« Yes » n’est pas une puissance : jamais déduit');
  assert.equal(f.specs.processeur, undefined);
  const noStorage = icecat.parse({ data: { GeneralInfo: { Brand: 'X', Title: 'X Y' }, FeaturesGroups: [{ Features: [feat('Internal memory', '128 GB')] }] } });
  assert.equal(noStorage.specs.ram, undefined, 'sans stockage distinct, aucune RAM déduite');
  assert.equal(icecat.parse({}), null);
});

/* ---------- cascade : réseau simulé ---------- */

const FILLER = ' Livraison et retours gratuits sur tous nos produits.'.repeat(40);
const page = (head, body) => '<!doctype html><html><head>' + head + '</head><body>' + (body || '') + FILLER + '</body></html>';
const GTIN = '4006381333931';
const CDISCOUNT = 'https://www.cdiscount.com/telephonie/telephone-mobile/f-1440402-appleiphone15128gonoir.html';
const DARTY = 'https://www.darty.com/nav/achat/telephonie/apple_iphone_15_128go_noir.html?ean=' + GTIN;
const cdiscountPage = page('<title>Cdiscount</title><meta property="og:title" content="Apple iPhone 15 128 Go Noir | Cdiscount"><script type="application/ld+json">' +
  JSON.stringify({ '@type': 'Product', name: 'Apple iPhone 15 128 Go Noir', brand: { name: 'Apple' }, gtin13: GTIN, offers: { price: '699', priceCurrency: 'EUR' } }) + '</script>');
const cloudflare = '<html><head><title>Just a moment...</title></head><body><script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script></body></html>';

async function withWeb(routes, env, fn) {
  const calls = [], realFetch = global.fetch, realLookup = dnsP.lookup, saved = {};
  Object.keys(env).forEach(k => { saved[k] = process.env[k]; if (env[k] == null) delete process.env[k]; else process.env[k] = env[k]; });
  dnsP.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  global.fetch = async (url, opts = {}) => {
    const key = String(url); calls.push(key);
    let r = routes[Object.keys(routes).find(p => key.startsWith(p))];
    if (typeof r === 'function') r = r(key);
    if (!r) return new Response('', { status: 404 });
    return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status || 200, headers: r.headers || {} });
  };
  try { return await fn(calls); } finally {
    global.fetch = realFetch; dnsP.lookup = realLookup;
    Object.keys(saved).forEach(k => { if (saved[k] == null) delete process.env[k]; else process.env[k] = saved[k]; });
  }
}
const ENV_ON = { ICECAT_USERNAME: 'testuser', ICECAT_API_TOKEN: 'tok', BRAVE_API_KEY: null, SERPER_API_KEY: null, RENDER_ENDPOINT: null };
const ICE = 'https://live.icecat.biz/api';

test('Cdiscount : modèle identifié mais page sans caractéristiques → le code-barres complète via le référentiel', async () => {
  await withWeb({ [CDISCOUNT]: { body: cdiscountPage }, [ICE]: { body: ICE_OK } }, ENV_ON, async calls => {
    const r = await resolve(CDISCOUNT);
    assert.equal(r.ok, true); assert.equal(r.kind, 'product');
    assert.equal(r.specs.batterie, '3349 mAh'); assert.equal(r.specSources.batterie, 'icecat');
    assert.equal(r.identity.status, 'identified'); assert.equal(r.identity.gtin, GTIN);
    assert.ok(r.specsUnknown.includes('charge'), 'la charge n’a pas été trouvée : « inconnue », pas « mauvaise »');
    const ice = calls.find(c => c.startsWith(ICE));
    assert.match(ice, /GTIN=4006381333931/); assert.match(ice, /UserName=testuser/);
    assert.ok(r.trace.some(s => s.step === 'icecat' && s.outcome === 'trouvé'));
  });
});

test('Darty bloqué (vérification anti-robot) mais code-barres dans l’URL → modèle et caractéristiques sans contourner le marchand', async () => {
  await withWeb({ 'https://www.darty.com/': { status: 403, body: cloudflare }, [ICE]: { body: ICE_OK } }, ENV_ON, async calls => {
    const r = await resolve(DARTY);
    assert.equal(r.ok, true); assert.equal(r.strategy, 'icecat');
    assert.equal(r.identity.status, 'identified');
    assert.equal(r.specs.refresh, '60 Hz');
    assert.equal(calls.filter(c => c.startsWith('https://www.darty.com/')).length, 1, 'un seul essai chez le marchand, aucun contournement');
    assert.match(r.warning, /n’a pas pu être lue/);
  });
});

test('conflit : la fiche du référentiel désigne une autre variante que la page → ses données ne sont pas utilisées', async () => {
  const proPayload = JSON.parse(JSON.stringify(ICE_OK)); proPayload.data.GeneralInfo.ProductName = 'iPhone 15 Pro 256GB Titanium';
  await withWeb({ [CDISCOUNT]: { body: cdiscountPage }, [ICE]: { body: proPayload } }, ENV_ON, async () => {
    const r = await resolve(CDISCOUNT);
    assert.equal(r.ok, true);
    assert.equal(r.identity.status, 'partial'); assert.match(r.identity.conflict, /aucune donnée du référentiel/);
    assert.equal(r.specs.batterie, undefined, 'aucune caractéristique de l’autre modèle n’est reprise');
    assert.ok(r.trace.some(s => s.step === 'icecat' && s.outcome === 'conflit'));
  });
});

test('référentiel non configuré, absent ou en panne : la cascade existante continue, rien n’est inventé', async () => {
  await withWeb({ [CDISCOUNT]: { body: cdiscountPage } }, Object.assign({}, ENV_ON, { ICECAT_USERNAME: null }), async calls => {
    const r = await resolve(CDISCOUNT);
    assert.equal(r.ok, true); assert.equal(r.identity.status, 'partial');
    assert.equal(calls.some(c => c.startsWith(ICE)), false);
    assert.ok(r.trace.some(s => s.step === 'icecat' && s.outcome === 'non configuré'));
    assert.deepEqual(r.specsUnknown, ['ecran', 'processeur', 'ram', 'batterie', 'charge', 'refresh']);
  });
  await withWeb({ [CDISCOUNT]: { body: cdiscountPage }, [ICE]: { status: 500, body: 'erreur' } }, ENV_ON, async () => {
    const r = await resolve(CDISCOUNT);
    assert.equal(r.ok, true); assert.equal(r.identity.status, 'partial'); assert.deepEqual(r.specs, {});
  });
});

test('page de catégorie : le référentiel n’est jamais interrogé', async () => {
  await withWeb({ [ICE]: { body: ICE_OK } }, ENV_ON, async calls => {
    const r = await resolve('https://www.darty.com/');
    assert.equal(r.kind, 'page');
    assert.equal(calls.length, 0);
  });
});
