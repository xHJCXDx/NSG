// Rules R8A-24, AD-62 and R8B-06: when two executions overlap, the second one
// does not create or modify anything. Mention, sentiment and detection inserts
// use ON CONFLICT ... DO NOTHING, so an existing row is never overwritten and a
// detection is never reclassified in place.
//
// Scope: these checks read the SQL that the workflow builds. They do not run
// PostgreSQL; the overlap scenario itself is E09 (Anexo E).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNode, runNode } from './runNode.mjs';

const MENTION = {
  platform: 'hackernews',
  external_id: '1001',
  text_content: 'Critical RCE in example library',
  language: 'en',
  created_at: '2026-11-12T10:00:00.000Z',
  author_username: 'someone',
  author_id: 'someone',
  author_verified: null,
  author_followers_count: null,
  author_description: null,
  likes_count: 10,
  shares_count: 0,
  replies_count: 2,
  views_count: 0,
  urls: [],
  hashtags: [],
  mentions: [],
  raw_data: {},
};

const onConflictClause = (sql) => {
  const match = sql.match(/ON CONFLICT\s*\(([^)]*)\)\s*DO\s+(\w+)/i);
  assert.ok(match, 'the query has no ON CONFLICT clause');
  return { target: match[1].trim(), action: match[2].toUpperCase() };
};

test('Prep Mention Insert: an existing mention is not modified', () => {
  const [{ json }] = runNode('Prep Mention Insert', [MENTION]);
  assert.deepEqual(onConflictClause(json.query), { target: 'platform, external_id', action: 'NOTHING' });
  assert.doesNotMatch(json.query, /DO\s+UPDATE/i);
});

test('Insert Sentiment Analysis: an existing analysis is not modified', () => {
  const sql = getNode('Insert Sentiment Analysis').parameters.query;
  assert.deepEqual(onConflictClause(sql), { target: 'mention_id', action: 'NOTHING' });
  assert.doesNotMatch(sql, /DO\s+UPDATE/i);
});

test('Insert Threat Detection: an existing detection is not reclassified', () => {
  const sql = getNode('Insert Threat Detection').parameters.query;
  assert.deepEqual(onConflictClause(sql), { target: 'mention_id', action: 'NOTHING' });
  assert.doesNotMatch(sql, /DO\s+UPDATE/i);
});

test('Enrich Mention + Prep Sentiment keeps every item when the insert returns no rows', () => {
  // With DO NOTHING, RETURNING yields no row for a conflicting mention.
  // The next stage must not depend on that output.
  const prepped = runNode('Prep Mention Insert', [MENTION, { ...MENTION, external_id: '1002' }]);
  const out = runNode('Enrich Mention + Prep Sentiment', [], {
    'Prep Mention Insert': prepped.map((item) => item.json),
  });
  assert.deepEqual(out.map((item) => item.json.p_external_id), ['1001', '1002']);
});
