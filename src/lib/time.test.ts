import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTime12h } from './time';

test('formatTime12h convierte HH:MM y HH:MM:SS a 12 horas', () => {
  assert.equal(formatTime12h('17:30'), '5:30 p. m.');
  assert.equal(formatTime12h('17:30:00'), '5:30 p. m.');
  assert.equal(formatTime12h('09:05'), '9:05 a. m.');
  assert.equal(formatTime12h('00:00'), '12:00 a. m.');
  assert.equal(formatTime12h('12:15'), '12:15 p. m.');
});

test('formatTime12h devuelve null con valores vacíos o inválidos', () => {
  assert.equal(formatTime12h(''), null);
  assert.equal(formatTime12h(undefined), null);
  assert.equal(formatTime12h(null), null);
  assert.equal(formatTime12h('25:00'), null);
  assert.equal(formatTime12h('abc'), null);
});
