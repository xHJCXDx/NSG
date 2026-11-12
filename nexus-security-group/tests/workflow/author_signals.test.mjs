// Rule R8A-37 (also A-11, AD-49): no source exposes followers or verification,
// so both fields stay empty (NULL), the follower band is empty and Factor 4 adds 0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNode } from './runNode.mjs';

const HN_RESPONSE = {
  hits: [
    {
      objectID: '1001',
      title: 'Critical RCE in example library',
      story_text: null,
      url: 'https://example.org/advisory',
      author: 'someone',
      points: 4200,
      num_comments: 12,
      created_at_i: 1762905600,
    },
  ],
};

const GITHUB_RESPONSE = {
  items: [
    {
      id: 2002,
      number: 7,
      title: 'CVE-2026-0001 vulnerability report',
      body: 'Details of the vulnerability.',
      html_url: 'https://github.com/example/repo/issues/7',
      created_at: '2026-11-12T10:00:00Z',
      comments: 3,
      reactions: { total_count: 5 },
      user: { id: 99, login: 'reporter', type: 'User', followers: 250000 },
    },
  ],
};

const RSS_RESPONSE = {
  data: [
    '<rss><channel><item>',
    '<title>Example exploit</title>',
    '<link>https://www.exploit-db.com/exploits/3003</link>',
    '<guid>https://www.exploit-db.com/exploits/3003</guid>',
    '<pubDate>Wed, 12 Nov 2026 10:00:00 +0000</pubDate>',
    '<description>Remote code execution exploit.</description>',
    '</item></channel></rss>',
  ].join(''),
};

const PARSERS = [
  ['Parse Items', HN_RESPONSE],
  ['Parse GitHub Issues', GITHUB_RESPONSE],
  ['Parse RSS Items', RSS_RESPONSE],
];

for (const [nodeName, response] of PARSERS) {
  test(`${nodeName}: followers and verification are empty (NULL)`, () => {
    const out = runNode(nodeName, [response]);
    assert.ok(out.length > 0, 'the parser produced no items');
    for (const { json } of out) {
      assert.equal(json.author_followers_count, null);
      assert.equal(json.author_verified, null);
    }
  });
}

test('Hacker News points are still kept as likes_count', () => {
  const [{ json }] = runNode('Parse Items', [HN_RESPONSE]);
  assert.equal(json.likes_count, 4200);
});

test('Classify Threat: empty followers and verification add 0 (Factor 4)', () => {
  const [{ json: mention }] = runNode('Parse Items', [HN_RESPONSE]);
  const sentiment = { sentiment_score: -0.5, sentiment_label: 'negative', confidence: 0.8, method: 'ensemble' };
  const classify = (m) =>
    runNode('Classify Threat', [sentiment], { 'Filter Already Processed': [m] })[0].json.threat;

  const withEmpty = classify(mention);
  const withZero = classify({ ...mention, author_followers_count: 0, author_verified: false });
  assert.equal(withEmpty.raw_score, withZero.raw_score);
  assert.equal(withEmpty.criticality_level, withZero.criticality_level);
});

test('Prep Mention Insert writes NULL for empty followers and verification', () => {
  const [{ json: mention }] = runNode('Parse Items', [HN_RESPONSE]);
  const [{ json }] = runNode('Prep Mention Insert', [mention]);
  const valuesStart = json.query.indexOf('VALUES');
  assert.ok(valuesStart > 0, 'the query has no VALUES clause');
  const values = json.query.slice(valuesStart);
  assert.match(values, /'someone',\s*'someone',\s*NULL,\s*NULL,/);
  assert.equal(json.p_author_verified, null);
  assert.equal(json.p_author_followers_count, null);
});

test('Prep Mention Insert still writes real values when a source provides them', () => {
  const mention = runNode('Parse Items', [HN_RESPONSE])[0].json;
  const [{ json }] = runNode('Prep Mention Insert', [
    { ...mention, author_verified: true, author_followers_count: 1500 },
  ]);
  const values = json.query.slice(json.query.indexOf('VALUES'));
  assert.match(values, /'someone',\s*'someone',\s*TRUE,\s*1500,/);
});
