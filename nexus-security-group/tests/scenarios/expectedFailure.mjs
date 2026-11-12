// Strict expected failure for scenarios whose thesis result the prototype does
// not meet. The assertion always states the thesis rule. The test passes only
// while the rule still fails, and it reports the declared matrix rows. If the
// rule starts to hold, the test fails so the mark and the matrix get updated.
import { test } from 'node:test';
import assert from 'node:assert/strict';

export function expectedFailure(name, declaredRows, fn) {
  test(`[falla esperada] ${name}`, async (t) => {
    let error = null;
    try {
      await fn();
    } catch (e) {
      error = e;
    }
    if (error) {
      t.diagnostic(`Declarada en la matriz (${declaredRows}): ${error.message.split('\n')[0]}`);
      return;
    }
    assert.fail(
      `The rule now holds. Remove the expected-failure mark and update the matrix rows ${declaredRows}.`,
    );
  });
}
