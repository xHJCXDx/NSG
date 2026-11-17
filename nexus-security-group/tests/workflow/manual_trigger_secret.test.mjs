// R8B-09, R8B-39: the manual HTTP trigger is accepted only when the API sends
// the shared secret (WEBHOOK_SECRET); without it n8n answers 401 and no source
// is queried. The scheduled trigger is not affected.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const workflowPath = fileURLToPath(new URL('../../workflow.json', import.meta.url));
const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));
const node = (name) => {
  const found = workflow.nodes.find((n) => n.name === name);
  assert.ok(found, `node not found: ${name}`);
  return found;
};
const targets = (name, output = 0) =>
  (workflow.connections[name]?.main?.[output] ?? []).map((c) => c.node).sort();

const SOURCES = ['Fetch Exploit-DB RSS', 'Fetch GitHub Security Issues', 'Hacker News API Search'];

test('the manual webhook answers through a response node', () => {
  const webhook = node('Manual OSINT Trigger');
  assert.equal(webhook.parameters.path, 'osint-trigger');
  assert.equal(webhook.parameters.httpMethod, 'POST');
  assert.equal(webhook.parameters.responseMode, 'responseNode');
});

test('the manual webhook reaches only the secret check', () => {
  assert.deepEqual(targets('Manual OSINT Trigger'), ['Check Webhook Secret']);
});

test('the secret check compares the header with a non-empty WEBHOOK_SECRET', () => {
  const check = node('Check Webhook Secret');
  assert.equal(check.type, 'n8n-nodes-base.if');
  const { conditions, combinator } = check.parameters.conditions;
  assert.equal(combinator, 'and');
  const equals = conditions.find((c) => c.operator.operation === 'equals');
  assert.match(equals.leftValue, /\$json\.headers\['x-webhook-secret'\]/);
  assert.match(equals.rightValue, /\$env\.WEBHOOK_SECRET/);
  const notEmpty = conditions.find((c) => c.operator.operation === 'notEmpty');
  assert.match(notEmpty.leftValue, /\$env\.WEBHOOK_SECRET/);
});

test('a valid secret answers 200 and then queries the three sources', () => {
  assert.deepEqual(targets('Check Webhook Secret', 0), ['Respond Trigger Accepted']);
  const accepted = node('Respond Trigger Accepted');
  assert.equal(accepted.type, 'n8n-nodes-base.respondToWebhook');
  assert.equal(accepted.parameters.options.responseCode, 200);
  assert.deepEqual(targets('Respond Trigger Accepted'), SOURCES);
});

test('a missing or wrong secret answers 401 and queries no source', () => {
  assert.deepEqual(targets('Check Webhook Secret', 1), ['Respond Trigger Unauthorized']);
  const rejected = node('Respond Trigger Unauthorized');
  assert.equal(rejected.type, 'n8n-nodes-base.respondToWebhook');
  assert.equal(rejected.parameters.options.responseCode, 401);
  assert.deepEqual(targets('Respond Trigger Unauthorized'), []);
});

test('the scheduled trigger still queries the three sources directly', () => {
  assert.deepEqual(targets('Schedule Every 15 Minutes'), SOURCES);
});
