const test = require('node:test');
const assert = require('node:assert/strict');
const dnsP = require('node:dns').promises;
const identify = require('../phone-analyzer/identify.js');
const capture = require('../phone-analyzer/capture.js');
const ex = require('../server/extract.js');
const { resolve } = require('../server/resolve.js');

const FILLER = ' Caractéristiques techniques détaillées du produit, livraison et retours gratuits.'.repeat(40);
const page = (head, body) => '<!doctype html><html><head>' + head + '</head><body>' + (body || '') + FILLER + '</body></html>';

/* Pages simulées, une par cas rencontré chez les marchands. */
const PAGES = {
  amazonOk: page('<title>Amazon.fr : Apple iPhone 15 (128 Go) - Noir</title><script>var fingerprint="x";window.dataDomeOptions={};/*datadome*/</script>',
    '<span id="productTitle" class="a-size-large"> Apple iPhone 15 (128 Go) - Noir </span>'),
  amazonCaptcha: '<html><head><title>Robot Check</title></head><body><form action="/errors/validateCaptcha">Saisissez les caractères que vous voyez</form></body></html>',
  cloudflare: '<html><head><title>Just a moment...</title></head><body><script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script></body></html>',
  datadome: '<html><head><title>fnac.com</title></head><body><iframe src="https://geo.captcha-delivery.com/captcha/?initialCid=x"></iframe></body></html>',
  fnacLd: page('<title>Apple iPhone 15 128 Go Noir Smartphone - Achat & prix | fnac</title><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'BreadcrumbList' }, { '@type': 'Product', name: 'Apple iPhone 15 128 Go Noir', brand: { '@type': 'Brand', name: 'Apple' }, gtin13: '0195949036346', offers: { '@type': 'Offer', price: '799', priceCurrency: 'EUR' } }] }) + '</script>'),
  cdiscountOg: page('<meta content="Apple iPhone 15 128 Go Noir - Smartphone | Cdiscount" property="og:title"><title>Cdiscount</title>'),
  dartyH1: page('<title>Darty</title>', '<h1 class="title">Samsung Galaxy A56 5G 256 Go Noir</h1>'),
  rakutenNext: page('<title>Rakuten</title><script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: { offer: { productName: 'Google Pixel 9 128 Go Obsidian', ean: '0840353928005', price: 599 } } } }) + '</script>'),
  micro: page('<title>Boutique</title>', '<div itemscope itemtype="https://schema.org/Product"><span itemprop="name">Xiaomi Redmi Note 13 Pro 256 Go</span></div>'),
  shell: '<html><head><title>Darty</title></head><body><div id="root"></div><noscript>Activez JavaScript</noscript></body></html>',
  listing: page('<title>Smartphones</title><script type="application/ld+json">' + JSON.stringify({ '@type': 'ItemList', itemListElement: [] }) + '</script>'),
  notFound: page('<title>Erreur</title>', '<h1>Page introuvable</h1>')
};

function mockWeb(routes) {
  const calls = [];
  const realFetch = global.fetch, realLookup = dnsP.lookup;
  dnsP.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  global.fetch = async (url, opts = {}) => {
    const key = String(url);
    calls.push({ url: key, headers: opts.headers || {} });
    let r = routes[key] || routes[Object.keys(routes).find(p => key.startsWith(p))];
    if (typeof r === 'function') r = r(opts, key);
    if (!r) return new Response('', { status: 404 });
    const headers = new Headers(r.headers || {});
    if (r.setCookie) headers.append('set-cookie', r.setCookie);
    return new Response(r.body, { status: r.status || 200, headers });
  };
  return { calls, restore() { global.fetch = realFetch; dnsP.lookup = realLookup; } };
}
async function withWeb(routes, fn) { const w = mockWeb(routes); try { return await fn(w); } finally { w.restore(); } }
const AMZ = 'https://www.amazon.fr/Apple-iPhone-15-128-Go/dp/B0CHX1W1XY?th=1&psc=1';
const AMZ_CANON = 'https://www.amazon.fr/dp/B0CHX1W1XY';

test('Amazon : page normale lue, même si le HTML contient « fingerprint » ou « datadome »', async () => {
  await withWeb({ [AMZ_CANON]: { body: PAGES.amazonOk } }, async w => {
    const r = await resolve(AMZ);
    assert.equal(r.ok, true); assert.equal(r.kind, 'product'); assert.equal(r.strategy, 'fetch');
    assert.equal(r.clues.name, 'Apple iPhone 15 (128 Go) - Noir');
    assert.equal(r.clues.asin, 'B0CHX1W1XY');
    assert.equal(w.calls[0].url, AMZ_CANON, 'l’URL canonique est essayée en premier');
    assert.match(w.calls[0].headers['user-agent'], /Mozilla\/5\.0/);
  });
});

test('Amazon : page « Robot Check » en HTTP 200 → bloqué, un seul essai, indices de l’URL conservés', async () => {
  await withWeb({ [AMZ_CANON]: { body: PAGES.amazonCaptcha } }, async w => {
    const r = await resolve(AMZ);
    assert.equal(r.ok, false); assert.equal(r.blocked, true); assert.equal(r.reason, 'challenge'); assert.equal(r.vendor, 'amazon');
    assert.equal(r.needsCapture, true);
    assert.equal(w.calls.length, 1, 'on n’insiste pas après une vérification');
    assert.match(r.clues.urlHint, /Apple iPhone 15/); assert.equal(r.clues.asin, 'B0CHX1W1XY'); assert.equal(r.clues.title, null);
  });
});

test('Cloudflare (403) et DataDome : reconnus comme vérifications, pas comme produits', async () => {
  await withWeb({ 'https://www.fnac.com/Apple-iPhone-15/a17594063/w-4': { status: 403, body: PAGES.cloudflare } }, async () => {
    const r = await resolve('https://www.fnac.com/Apple-iPhone-15/a17594063/w-4');
    assert.equal(r.reason, 'challenge'); assert.equal(r.vendor, 'cloudflare');
  });
  await withWeb({ 'https://www.fnac.com/Apple': { status: 403, body: PAGES.datadome } }, async () => {
    const r = await resolve('https://www.fnac.com/Apple-iPhone-15/a17594063/w-4');
    assert.equal(r.reason, 'challenge'); assert.equal(r.vendor, 'datadome');
  });
});

test('marchands : JSON-LD (Fnac), og:title (Cdiscount), h1 (Darty), état embarqué (Rakuten), microdonnées', async () => {
  const cases = [
    ['https://www.fnac.com/Apple-iPhone-15-128-Go-Noir/a17594063/w-4', PAGES.fnacLd, 'Apple iPhone 15 128 Go Noir', 'JSON-LD Product'],
    ['https://www.cdiscount.com/telephonie/telephone-mobile/f-1440402-appleiphone15128gonoir.html', PAGES.cdiscountOg, 'Apple iPhone 15 128 Go Noir - Smartphone', 'og:title'],
    ['https://www.darty.com/nav/achat/telephonie/samsung_galaxy_a56.html', PAGES.dartyH1, 'Samsung Galaxy A56 5G 256 Go Noir', 'h1'],
    ['https://fr.shopping.rakuten.com/offer/buy/123456/google-pixel-9.html', PAGES.rakutenNext, 'Google Pixel 9 128 Go Obsidian', 'état embarqué'],
    ['https://www.boulanger.com/ref/1234567', PAGES.micro, 'Xiaomi Redmi Note 13 Pro 256 Go', 'microdata']
  ];
  for (const [url, body, name, source] of cases) {
    await withWeb({ [url]: { body } }, async () => {
      const r = await resolve(url);
      assert.equal(r.ok, true, url); assert.equal(r.clues.name, name, url); assert.equal(r.evidence[0], source, url);
    });
  }
  await withWeb({ 'https://www.fnac.com/x': { body: PAGES.fnacLd } }, async () => {
    const r = await resolve('https://www.fnac.com/x/a1234567/w-4');
    assert.equal(r.clues.ean, '0195949036346'); assert.equal(r.clues.brand, 'Apple'); assert.equal(r.product.price, '799');
  });
});

test('page de liste (ItemList) → page générale, pas un modèle', async () => {
  await withWeb({ 'https://www.cdiscount.com/telephonie/telephone-mobile/lf-228101': { body: PAGES.listing } }, async () => {
    const r = await resolve('https://www.cdiscount.com/telephonie/telephone-mobile/lf-228101.html');
    assert.equal(r.ok, true); assert.equal(r.kind, 'page');
  });
});

test('page vide sans JavaScript : signalée sans rendu ; lue avec le rendu navigateur facultatif', async () => {
  const url = 'https://www.darty.com/nav/achat/telephonie/apple_iphone_15_128go_noir.html';
  await withWeb({ [url]: { body: PAGES.shell } }, async () => {
    const r = await resolve(url);
    assert.equal(r.ok, false); assert.equal(r.jsOnly, true); assert.equal(r.needsCapture, true);
    assert.match(r.clues.urlHint, /apple iphone 15 128go noir/i);
  });
  process.env.RENDER_ENDPOINT = 'https://render.example/html';
  try {
    await withWeb({ [url]: { body: PAGES.shell }, 'https://render.example/html': { body: JSON.stringify({ html: PAGES.dartyH1 }) } }, async w => {
      const r = await resolve(url);
      assert.equal(r.ok, true); assert.equal(r.strategy, 'render'); assert.equal(r.clues.name, 'Samsung Galaxy A56 5G 256 Go Noir');
    });
  } finally { delete process.env.RENDER_ENDPOINT; }
});

test('page illisible : la recherche web (API) identifie le modèle à partir de l’ASIN', async () => {
  process.env.BRAVE_API_KEY = 'test-key';
  try {
    await withWeb({
      [AMZ_CANON]: { body: PAGES.shell },
      'https://api.search.brave.com/': { body: JSON.stringify({ web: { results: [{ title: 'Apple iPhone 15 128 Go Noir - Amazon.fr' }, { title: 'Forum sans rapport' }] } }) }
    }, async w => {
      const r = await resolve(AMZ);
      assert.equal(r.ok, true); assert.equal(r.strategy, 'search');
      assert.equal(r.clues.name, 'Apple iPhone 15 128 Go Noir'); assert.ok(r.clues.searchTitles.length >= 1);
      assert.ok(w.calls.some(c => /api\.search\.brave\.com.*B0CHX1W1XY/.test(c.url)), 'l’ASIN est la requête');
    });
  } finally { delete process.env.BRAVE_API_KEY; }
});

test('une vérification anti-robot n’est jamais « résolue » par recherche ni par rendu', async () => {
  process.env.BRAVE_API_KEY = 'test-key'; process.env.RENDER_ENDPOINT = 'https://render.example/html';
  try {
    await withWeb({ [AMZ_CANON]: { body: PAGES.amazonCaptcha }, 'https://render.example/html': { body: JSON.stringify({ html: PAGES.dartyH1 }) } }, async w => {
      const r = await resolve(AMZ);
      assert.equal(r.blocked, true);
      assert.ok(!w.calls.some(c => /render\.example/.test(c.url)), 'pas de rendu après une vérification');
    });
  } finally { delete process.env.BRAVE_API_KEY; delete process.env.RENDER_ENDPOINT; }
});

test('réseau : redirections, cookies de session, liens courts, encodages, SSRF', async () => {
  await withWeb({
    'https://www.fnac.com/go': { status: 302, headers: { location: 'https://www.fnac.com/fiche' }, setCookie: 'consent=1; Path=/' },
    'https://www.fnac.com/fiche': (opts) => /consent=1/.test((opts.headers || {}).cookie || '') ? { body: PAGES.dartyH1 } : { status: 403, body: PAGES.cloudflare }
  }, async () => {
    const r = await resolve('https://www.fnac.com/go');
    assert.equal(r.ok, true, 'le cookie posé par la redirection est renvoyé');
  });
  await withWeb({
    'https://amzn.eu/d/abc': { status: 302, headers: { location: 'https://www.amazon.fr/Apple-iPhone-15/dp/B0CHX1W1XY/ref=sr_1_1' } },
    'https://www.amazon.fr/Apple-iPhone-15/dp/B0CHX1W1XY': { body: PAGES.amazonOk }
  }, async () => {
    const r = await resolve('https://amzn.eu/d/abc');
    assert.equal(r.ok, true); assert.equal(r.clues.asin, 'B0CHX1W1XY');
  });
  const latin = Buffer.from('<html><head><title>x</title></head><body><h1>Téléphone Samsung Galaxy A56 éclat</h1>' + FILLER + '</body></html>', 'latin1');
  await withWeb({ 'https://fr.shopping.rakuten.com/offer/buy/1/x.html': { body: latin, headers: { 'content-type': 'text/html; charset=iso-8859-1' } } }, async () => {
    const r = await resolve('https://fr.shopping.rakuten.com/offer/buy/1/x.html');
    assert.match(r.clues.name, /Téléphone Samsung Galaxy A56 éclat/);
  });
  await withWeb({}, async w => {
    const r = await resolve('http://127.0.0.1/admin');
    assert.equal(r.ok, false); assert.equal(w.calls.length, 0, 'aucune requête vers une adresse privée');
  });
});

test('page introuvable (404) : pas de faux modèle', async () => {
  await withWeb({ 'https://www.darty.com/': { status: 404, body: PAGES.notFound } }, async () => {
    const r = await resolve('https://www.darty.com/nav/achat/telephonie/apple_iphone_99.html');
    assert.equal(r.ok, false); assert.equal(r.reason, 'notfound');
  });
});

test('détection : un produit lu n’est jamais pris pour un blocage ; titres génériques rejetés', () => {
  const c = ex.candidates(PAGES.amazonOk);
  assert.ok(c.list.length > 0);
  assert.equal(ex.detectBlock({ status: 200, html: PAGES.amazonOk, headers: {}, usable: true }), null);
  assert.equal(ex.candidates('<title>Amazon.fr</title>').list.length, 0);
  assert.equal(ex.candidates('<title>Robot Check</title>').list.length, 0);
  assert.equal(ex.cleanName('Amazon.fr : Apple iPhone 15 128 Go'), 'Apple iPhone 15 128 Go');
  assert.equal(ex.cleanName('Apple iPhone 15 128 Go - Noir | Boulanger'), 'Apple iPhone 15 128 Go - Noir');
});

test('indices d’URL : Fnac, Cdiscount, Darty, Rakuten, Amazon sans slug', () => {
  const h = u => identify.identifyFromUrl(u).titleHint;
  assert.equal(h('https://www.fnac.com/Apple-iPhone-15-128-Go-Noir/a17594063/w-4'), 'Apple iPhone 15 128 Go Noir');
  assert.match(h('https://www.cdiscount.com/telephonie/telephone-mobile/f-1440402-appleiphone15128gonoir.html'), /^apple iphone 15/i);
  assert.equal(h('https://www.darty.com/nav/achat/telephonie/telephone_mobile/smartphone/apple_iphone_15_128go_noir.html'), 'apple iphone 15 128go noir');
  assert.equal(h('https://fr.shopping.rakuten.com/offer/buy/123456/samsung-galaxy-a56-5g.html'), 'samsung galaxy a56 5g');
  assert.equal(identify.identifyFromUrl('https://www.amazon.fr/gp/aw/d/B0CHX1W1XY').asin, 'B0CHX1W1XY');
  assert.equal(h('https://www.amazon.fr/gp/aw/d/B0CHX1W1XY'), '');
});

test('capture navigateur : le signet est du JavaScript valide et le retour est lu sans confiance aveugle', () => {
  const code = capture.bookmarklet('https://guide-achat.vercel.app');
  assert.ok(code.startsWith('javascript:'));
  assert.doesNotThrow(() => new Function(code.slice('javascript:'.length)));
  const payload = encodeURIComponent(JSON.stringify({ u: 'https://www.amazon.fr/dp/B0CHX1W1XY', t: 'Apple iPhone 15 (128 Go) - Noir 2023', b: 'Apple', e: '0195949036346' }));
  const r = capture.fromHash('#capture=' + payload, identify);
  assert.equal(r.kind, 'product'); assert.equal(r.clues.asin, 'B0CHX1W1XY'); assert.equal(r.clues.ean, '0195949036346'); assert.equal(r.clues.year, 2023);
  assert.equal(capture.fromHash('#capture=%7Bnope', identify), null);
  assert.equal(capture.fromHash('#autre', identify), null);
});
