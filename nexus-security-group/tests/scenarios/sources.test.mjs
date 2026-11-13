// Scenarios E18, E20 and E31 (thesis Annex E, Table E1): source requests and
// normalization nodes, run without n8n.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNode, getNode } from '../workflow/runNode.mjs';
import { expectedFailure } from './expectedFailure.mjs';

// E18: only the fixed window of 50 is testable. Sixty new stories on an external
// source cannot be provoked, and saturation is not recorded (AD-93, declared).
test('E18 (partial): the Hacker News request asks for 50 items', () => {
  const url = JSON.stringify(getNode('Hacker News API Search').parameters);
  assert.match(url, /hitsPerPage=50\b/);
});

const githubResponse = (incomplete) => ({
  total_count: 1,
  incomplete_results: incomplete,
  items: [
    {
      id: 501,
      number: 3,
      title: 'Security issue',
      body: 'Details.',
      html_url: 'https://github.com/example/repo/issues/3',
      created_at: '2026-11-12T10:00:00Z',
      comments: 0,
      user: { id: 7, login: 'reporter', type: 'User' },
    },
  ],
});

test('E20: a GitHub response flagged incomplete still counts as a valid response (its items are normalized)', () => {
  const out = runNode('Parse GitHub Issues', [githubResponse(true)]);
  assert.equal(out.length, 1);
  assert.equal(out[0].json.external_id, '501');
});

expectedFailure('E20: the incomplete-results indication is reported apart', 'R8A-46, R8B-15, AD-50', () => {
  const out = runNode('Parse GitHub Issues', [githubResponse(true)]);
  const reported = out.some(
    (i) => i.json.incomplete_results === true || i.json.source_status === 'incomplete',
  );
  assert.ok(reported, 'no normalized item or source status carries incomplete_results');
});

const HN_STORY = {
  objectID: '9001',
  title: 'Security advisory',
  story_text: null,
  url: 'https://example.org/advisory',
  author: 'hn_user',
  points: 321,
  num_comments: 45,
  created_at: '2026-11-12T10:00:00Z',
  created_at_i: 1762941600,
  _tags: ['story', 'author_hn_user', 'story_9001'],
  _highlightResult: { title: { value: '<em>Security</em> advisory', matchLevel: 'full' } },
  children: [9002, 9003],
};

// Compact story fields from thesis Table 19: id, title, text, URL, author,
// votes, comments, date.
const HN_COMPACT_KEYS = new Set([
  'objectID', 'title', 'story_text', 'url', 'author', 'points', 'num_comments', 'created_at', 'created_at_i',
]);

test('E31: a normalized Hacker News story keeps the username; followers and verification stay empty and Factor 4 adds 0', () => {
  const [item] = runNode('Parse Items', [{ hits: [HN_STORY] }]);
  assert.equal(item.json.author_username, 'hn_user');
  assert.equal(item.json.author_followers_count, null);
  assert.equal(item.json.author_verified, null);

  const neutral = { sentiment_label: 'neutral' };
  const [withAuthor] = runNode('Classify Threat', [neutral], { 'Filter Already Processed': [item.json] });
  const [noAuthor] = runNode('Classify Threat', [neutral], {
    'Filter Already Processed': [{ ...item.json, author_followers_count: 0, author_verified: false }],
  });
  assert.equal(withAuthor.json.threat.raw_score, noAuthor.json.threat.raw_score);
});

expectedFailure('E31: the stored original content is the compact story object, not the full response', 'A-12, R8A-42', () => {
  const [item] = runNode('Parse Items', [{ hits: [HN_STORY] }]);
  const extra = Object.keys(item.json.raw_data).filter((k) => !HN_COMPACT_KEYS.has(k));
  assert.deepEqual(extra, [], `raw_data keeps fields outside the compact object: ${extra.join(', ')}`);
});
