// Rules A-09, AD-11 (alerts do not include authorship), AD-10 (alerts speak of
// "señales para revisión" and "puntaje", not of confirmed threats or
// probability), AD-98 (stored title "Señal <nivel> para revisión") and AD-08
// (email shows "Puntaje": normalized score x 100, one decimal, no percent sign).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNode } from './runNode.mjs';

const AUTHOR = 'alice_reporter';

const enriched = (overrides) => ({
  external_id: '1001',
  platform: 'hackernews',
  text_content: 'Remote code execution in example library',
  author_username: AUTHOR,
  urls: ['https://example.org/advisory'],
  created_at: '2026-11-12T10:00:00.000Z',
  criticality_level: 'critical',
  threat: { threat_type: 'vulnerability', criticality_level: 'critical', confidence_score: 0.85 },
  ...overrides,
});

const ITEMS = [
  enriched(),
  enriched({
    external_id: '1002',
    criticality_level: 'high',
    threat: { threat_type: 'vulnerability', criticality_level: 'high', confidence_score: 0.6 },
  }),
];

const buildContent = () => {
  const aggregated = runNode('Aggregate Alerts', ITEMS).map((item) => item.json);
  return runNode('Build Alert Content', aggregated)[0].json;
};

test('Aggregate Alerts does not carry the author', () => {
  const [{ json }] = runNode('Aggregate Alerts', ITEMS);
  for (const alert of json.alerts) assert.equal('author' in alert, false);
  assert.doesNotMatch(JSON.stringify(json), new RegExp(AUTHOR));
});

test('Build Alert Content: no channel includes the author', () => {
  const out = buildContent();
  for (const field of ['email_html', 'email_subject', 'slack_blocks', 'alert_message']) {
    assert.doesNotMatch(out[field], new RegExp(AUTHOR), field);
  }
  assert.doesNotMatch(out.email_html, />Author</);
});

test('Build Alert Content: speaks of "señales para revisión", not of threats', () => {
  const out = buildContent();
  for (const field of ['email_html', 'email_subject', 'slack_blocks', 'alert_message']) {
    assert.match(out[field], /2 señales para revisión/, field);
    assert.doesNotMatch(out[field], /\bthreats?\b/i, field);
    assert.doesNotMatch(out[field], /amenaza/i, field);
  }
});

test('Build Alert Content: email shows "Puntaje" as score x 100 with one decimal, no percent', () => {
  const { email_html } = buildContent();
  assert.match(email_html, />Puntaje</);
  assert.doesNotMatch(email_html, /Confidence/i);
  assert.match(email_html, />85\.0</);
  assert.match(email_html, />60\.0</);
  assert.doesNotMatch(email_html, /\d+\.\d%/);
});

test('Build Alert Content: counts by level are unchanged', () => {
  const { email_subject, slack_blocks } = buildContent();
  assert.match(email_subject, /\(1 critical, 1 high\)/);
  assert.match(slack_blocks, /1 critical/);
  assert.match(slack_blocks, /1 high/);
});

test('Build Alert Content: every label is in Spanish', () => {
  const out = buildContent();
  const english = [
    'Scan Report', 'AUTOMATED REPORT', '>Summary<', 'Total Alerts', 'Scan Time', 'Scan time',
    '>Severity<', 'Type / Preview', '>Platform<', '>Detected<', 'This is an automated report',
    'lang="en"', 'more signal', 'check the full report',
  ];
  for (const field of ['email_html', 'email_subject', 'slack_blocks', 'alert_message']) {
    for (const label of english) assert.equal(out[field].includes(label), false, `${field}: ${label}`);
  }
  for (const label of [
    'lang="es"', 'Aviso consolidado', '>Resumen<', 'Total de señales', 'Hora de la ejecución',
    '>Nivel<', 'Tipo / Vista previa', '>Plataforma<', '>Fecha de publicación<', 'Aviso automático de',
  ]) {
    assert.ok(out.email_html.includes(label), `email_html: ${label}`);
  }
  assert.match(out.email_subject, /^\[NSG\] Aviso consolidado — 2 señales para revisión/);
  assert.match(out.slack_blocks, /Aviso consolidado/);
  assert.match(out.slack_blocks, /Hora de la ejecución/);
});

test('Build Alert Content: Slack lists up to five signals and says how many remain, in Spanish', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ ...ITEMS[0], external_id: String(2000 + i) }));
  const aggregated = runNode('Aggregate Alerts', many).map((item) => item.json);
  const { slack_blocks } = runNode('Build Alert Content', aggregated)[0].json;
  const blocks = JSON.parse(slack_blocks);
  assert.equal(blocks.filter((b) => b.type === 'section').length, 1 + 5);
  assert.match(slack_blocks, /…y \*2\* señales más: el detalle completo está en el correo\./);
});

test('Prep Alert Insert: title "Señal <nivel> para revisión", message without author', () => {
  const [{ json }] = runNode('Prep Alert Insert', [enriched({ alert_severity: 'critical' })]);
  assert.equal(json.p_alert_title, 'Señal critical para revisión');
  assert.doesNotMatch(json.p_alert_message, new RegExp(AUTHOR));
  assert.doesNotMatch(json.p_alert_message, /amenaza/i);
  assert.doesNotMatch(json.query, new RegExp(AUTHOR));
  assert.match(json.query, /'Señal critical para revisión'/);
});
