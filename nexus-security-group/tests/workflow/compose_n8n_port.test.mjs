// R8B-38: the n8n editor must be published only on the loopback interface.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const composePath = fileURLToPath(new URL('../../docker-compose.yml', import.meta.url));
const compose = readFileSync(composePath, 'utf8');

// Collect every published port mapping that targets container port 5678.
const n8nMappings = [...compose.matchAll(/^\s*-\s*"([^"]*:5678)"\s*$/gm)].map((m) => m[1]);

test('n8n port 5678 is published', () => {
  assert.equal(n8nMappings.length, 1);
});

test('n8n port 5678 is bound to 127.0.0.1 only', () => {
  assert.deepEqual(n8nMappings, ['127.0.0.1:5678:5678']);
});
