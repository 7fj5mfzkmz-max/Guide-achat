const test = require('node:test');
const assert = require('node:assert/strict');
const identify = require('../phone-analyzer/identify.js');
const normalize = require('../phone-analyzer/normalizer.js');
const crosscheck = require('../phone-analyzer/crosscheck.js');

test('iPhone 15 Amazon sans capacité: identification URL, variante inconnue', () => {
  const x = identify.identifyFromUrl('https://www.amazon.fr/Apple-iPhone-15/dp/B0CHX1W1XY');
  assert.equal(x.merchant, 'amazon');
  assert.equal(x.asin, 'B0CHX1W1XY');
  assert.match(x.titleHint, /Apple.*iPhone 15/i);
});

test('120Hz est normalisé en 120 Hz', () => assert.equal(normalize.spec('Écran AMOLED 120Hz, 5000mAh, charge 67W'), 'Écran AMOLED 120 Hz, 5000 mAh, charge 67 W'));

test('une référence ambiguë reste ambiguë', () => {
  const result = crosscheck.resolve([{ nom: 'PC 10P3', marque: 'A' }, { nom: 'PC 10P3', marque: 'B' }], { titleHint: '10p3' });
  assert.equal(result.status, 'ambiguous');
});

const profileFit = require('../phone-analyzer/profile-fit.js');
const { isPrivateIp, assertPublicHost } = require('../server/resolve.js');

test('un modèle du catalogue est identifié par son nom', () => {
  const result = crosscheck.resolve([{ nom: 'Samsung Galaxy A56', marque: 'Samsung' }, { nom: 'Google Pixel 9a', marque: 'Google' }], { titleHint: 'Samsung Galaxy A56 5G' });
  assert.equal(result.status, 'identified');
  assert.equal(result.candidate.nom, 'Samsung Galaxy A56');
});

test('un modèle absent du catalogue reste inconnu', () => {
  assert.equal(crosscheck.resolve([{ nom: 'Google Pixel 9a', marque: 'Google' }], { titleHint: 'fairphone 5' }).status, 'unknown');
});

test('profil-fit : donnée manquante = à confirmer, jamais négatif', () => {
  const r = profileFit.fit({ specs: { batterie: '5000 mAh' } }, 'etudiant');
  assert.equal(r.verdict, 'a_confirmer');
  assert.equal(r.concerns.length, 0);
  assert.ok(r.missing.some(m => m.criterion === 'prix'));
});

test('serveur : adresses internes refusées', async () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('192.168.1.10'), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
  await assert.rejects(() => assertPublicHost('localhost'));
  await assert.rejects(() => assertPublicHost('169.254.169.254'));
});

const { classifyContent } = require('../server/resolve.js');

test('classifyUrl : accueil, recherche et catégorie ne sont pas des modèles', () => {
  assert.equal(identify.classifyUrl('https://www.amazon.fr/').kind, 'page');
  assert.equal(identify.classifyUrl('https://www.amazon.fr/s?k=iphone').label, 'une page de résultats de recherche');
  assert.equal(identify.classifyUrl('https://www.cdiscount.com/telephonie/l-1440402.html').kind, 'page');
  assert.equal(identify.classifyUrl('https://www.amazon.fr/Apple-iPhone-15/dp/B0CHX1W1XY').kind, 'product');
});

test('classifyContent : plusieurs produits JSON-LD = page de liste', () => {
  const ld = [{ '@type': 'Product', name: 'A' }, { '@type': 'Product', name: 'B' }];
  const r = classifyContent({ urlClass: { kind: 'unknown' }, ld, html: '', text: '' });
  assert.equal(r.kind, 'page');
});

test('classifyContent : un seul Product = modèle précis', () => {
  const r = classifyContent({ urlClass: { kind: 'unknown' }, ld: [{ '@type': 'Product', name: 'Galaxy A56' }], html: '', text: '' });
  assert.equal(r.kind, 'product');
});

test('search : nom exact = identifié ; nom partiel = à confirmer ; inconnu = unknown', () => {
  const cat = [{ nom: 'Samsung Galaxy A56', marque: 'Samsung' }, { nom: 'Pixel 10', marque: 'Google' }, { nom: 'Pixel 10 Pro', marque: 'Google' }];
  assert.equal(crosscheck.search(cat, { hints: ['Samsung Galaxy A56 5G 256 Go'] }).status, 'identified');
  assert.equal(crosscheck.search(cat, { hints: ['galaxy a56'] }).status, 'to_confirm');
  assert.equal(crosscheck.search(cat, { hints: ['google pixel 10 pro'] }).best.nom, 'Pixel 10 Pro');
  assert.equal(crosscheck.search(cat, { hints: ['fairphone 5'] }).status, 'unknown');
});

test('ASIN détecté même quand le lien porte des paramètres de suivi', () => {
  const x = identify.identifyFromUrl('https://www.amazon.fr/Apple-iPhone-Pro-256-Bourgogne/dp/B0HJBG9HKM?pd_rd_w=abc&ref_=Oct_d_otopr_B0HJBG9HKM');
  assert.equal(x.asin, 'B0HJBG9HKM');
});

test('lien tronqué sans génération : plusieurs candidats à confirmer, jamais un choix silencieux', () => {
  const cat = [{ nom: 'Apple iPhone 17 Pro', marque: 'Apple' }, { nom: 'iPhone 18 Pro', marque: 'Apple' }, { nom: 'Samsung Galaxy A56', marque: 'Samsung' }];
  const r = crosscheck.search(cat, { hints: ['Apple iPhone Pro 256 Bourgogne'] });
  assert.equal(r.status, 'to_confirm');
  assert.equal(r.ranked.length, 2);
});

const specScore = require('../phone-analyzer/spec-score.js');
const W = { etudiant: { autonomie: .35, prix: .30, performance: .20, taille: .15 }, photographe: { photo: .55, performance: .2, autonomie: .15, taille: .1 } };

test('spec-score : critères documentés → score plafonné à 9, jamais 10', () => {
  const r = specScore.estimate({ specs: { batterie: '6 000 mAh, charge 80 W', ram: '16 Go' }, price: 99 }, W);
  assert.ok(r.profiles.etudiant.score <= 9);
  assert.equal(r.profiles.etudiant.provisional, false);
});

test('spec-score : « À documenter » est ignoré, pas pénalisé', () => {
  const r = specScore.estimate({ specs: { batterie: 'À documenter', ram: 'À documenter' }, price: 300 }, W);
  assert.deepEqual(r.documented, ['prix']);
});

test('spec-score : peu de critères → score provisoire plafonné à 6', () => {
  const r = specScore.estimate({ specs: {}, price: 99 }, W);
  assert.equal(r.profiles.etudiant.provisional, true);
  assert.ok(r.profiles.etudiant.score <= 6);
});

test('spec-score : aucune donnée → aucun score inventé', () => {
  assert.deepEqual(specScore.estimate({ specs: {} }, W).profiles, {});
});

test('spec-score : la technologie de batterie est détectée mais n’altère pas le score sans source', () => {
  assert.equal(specScore.detectChemistry({ chimie_batterie: 'Silicium-carbone' }), 'silicium-carbone');
  assert.equal(specScore.detectChemistry({ batterie: '5000 mAh Li-Po' }), 'li-po');
  const a = specScore.estimate({ specs: { batterie: '5000 mAh Li-ion', ram: '8 Go' }, price: 300 }, W);
  const b = specScore.estimate({ specs: { batterie: '5000 mAh silicium-carbone', ram: '8 Go' }, price: 300 }, W);
  assert.deepEqual(a.profiles, b.profiles);
  assert.equal(b.chemistry.status, 'a_documenter');
});

test('multi-marchands : les meta tags restent lisibles quel que soit l’ordre des attributs', () => {
  const { classifyContent } = require('../server/resolve.js');
  const html = '<meta content="Apple iPhone 16 128 Go" property="og:title"><title>Produit</title>';
  const r = classifyContent({ urlClass: { kind: 'unknown' }, ld: [], html, text: 'Apple iPhone 16 128 Go 999 €' });
  assert.equal(r.kind, 'unknown');
});

test('multi-marchands : iPhone 15 ne peut pas devenir OnePlus 15', () => {
  const cat = [{ nom: 'OnePlus 15', marque: 'OnePlus' }, { nom: 'Samsung Galaxy A56', marque: 'Samsung' }];
  const r = crosscheck.search(cat, { hints: ['Apple iPhone 15'] });
  assert.equal(r.status, 'unknown');
});

test('multi-marchands : iPhone 16 absent du catalogue reste identifiable par son titre', () => {
  const cat = [{ nom: 'OnePlus 15', marque: 'OnePlus' }, { nom: 'Samsung Galaxy A56', marque: 'Samsung' }];
  const r = crosscheck.search(cat, { hints: ['Apple iPhone 16'] });
  assert.equal(r.status, 'unknown');
});

test('multi-marchands : Nokia G10 ne tombe pas sur un autre téléphone partageant un numéro', () => {
  const cat = [{ nom: 'OnePlus 15', marque: 'OnePlus' }, { nom: 'Nokia G20', marque: 'Nokia' }];
  const r = crosscheck.search(cat, { hints: ['Nokia G10, Dual, 32GB 3GB Ram, Dark Blue'] });
  assert.equal(r.status, 'unknown');
});
