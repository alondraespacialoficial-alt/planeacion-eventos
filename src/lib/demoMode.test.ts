import assert from 'node:assert/strict';
import test from 'node:test';
import { isForceDemoValue } from './demoMode';

test('solo "true" activa el modo demo', () => {
  assert.equal(isForceDemoValue('true'), true);
  assert.equal(isForceDemoValue(' TRUE '), true);
  assert.equal(isForceDemoValue('false'), false);
  assert.equal(isForceDemoValue('1'), false);
  assert.equal(isForceDemoValue(''), false);
  assert.equal(isForceDemoValue(undefined), false);
});
