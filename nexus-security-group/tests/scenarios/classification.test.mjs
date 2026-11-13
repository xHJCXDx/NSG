// Scenarios E01-E05 (thesis Annex E, Table E1): scoring and thresholds of the
// "Classify Threat" node, run on the inputs the thesis builds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNode, getNodeCode } from '../workflow/runNode.mjs';

const NEUTRAL = { sentiment_label: 'neutral', ensemble_score: 0, confidence_score: 0.5 };

function classify(mention) {
  const [out] = runNode('Classify Threat', [NEUTRAL], {
    'Filter Already Processed': [{ likes_count: 0, shares_count: 0, replies_count: 0, ...mention }],
  });
  return out.json.threat;
}

test('E01: Exploit-DB RCE title with own URL scores 30 + 25 + 5 = 60, critical, critical incident', () => {
  const t = classify({
    platform: 'exploit-db',
    text_content: 'X 1.0 - Remote Code Execution (RCE)',
    urls: ['https://www.exploit-db.com/exploits/1'],
  });
  assert.equal(t.raw_score, 60);
  assert.equal(t.criticality_level, 'critical');
  assert.equal(t.threat_type, 'critical_security_incident');
  assert.equal(t.threat_category, 'critical_incident');
  assert.deepEqual(t.matched_keywords.sort(), ['rce', 'remote code execution']);
});

test('E02: "apt install" and "vulnerability" with e <= 10 and URL scores 25 + 10 + 5 = 40, high, critical incident (declared false positive)', () => {
  const t = classify({
    platform: 'github',
    text_content: 'Run apt install to patch the vulnerability',
    likes_count: 4,
    replies_count: 3,
    urls: ['https://github.com/example/repo/issues/1'],
  });
  assert.equal(t.raw_score, 40);
  assert.equal(t.criticality_level, 'high');
  assert.equal(t.threat_type, 'critical_security_incident');
  assert.ok(t.matched_keywords.includes('apt'));
});

test('E03: nested pairs add both keywords: "supply chain attack" = 45 (high), "critical vulnerability" = 35 (medium)', () => {
  const a = classify({ text_content: 'Supply chain attack reported', urls: ['https://example.org/a'] });
  assert.equal(a.raw_score, 45);
  assert.equal(a.criticality_level, 'high');
  assert.deepEqual(a.matched_keywords.sort(), ['attack', 'supply chain attack']);

  const b = classify({ text_content: 'Critical vulnerability disclosed', urls: ['https://example.org/b'] });
  assert.equal(b.raw_score, 35);
  assert.equal(b.criticality_level, 'medium');
  assert.deepEqual(b.matched_keywords.sort(), ['critical vulnerability', 'vulnerability']);
});

test('E04: "exploit" repeated ten times with URL and e <= 10 scores 20 + 5 = 25, medium; repetition does not add', () => {
  const t = classify({
    text_content: Array(10).fill('exploit').join(' '),
    likes_count: 10,
    urls: ['https://example.org/c'],
  });
  assert.equal(t.raw_score, 25);
  assert.equal(t.criticality_level, 'medium');
  assert.deepEqual(t.matched_keywords, ['exploit']);
});

// Every weight is a multiple of 5, so no input produces 19, 39 or 59. The test
// evaluates the threshold block taken verbatim from the node code.
test('E05: thresholds 19, 20, 39, 40, 59, 60 give low, medium, medium, high, high, critical', () => {
  const block = getNodeCode('Classify Threat').match(
    /let criticalityLevel;[\s\S]*?else criticalityLevel = 'low';/,
  );
  assert.ok(block, 'threshold block not found in Classify Threat');
  const level = new Function('score', `${block[0]}\nreturn criticalityLevel;`);
  assert.deepEqual(
    [19, 20, 39, 40, 59, 60].map((s) => level(s)),
    ['low', 'medium', 'medium', 'high', 'high', 'critical'],
  );
});
