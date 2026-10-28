import assert from 'node:assert/strict';
import test from 'node:test';
import { isMissingNewTimeColumn, withoutNewTimeColumns } from './eventColumns';

test('detecta el error de PostgREST por columna nueva inexistente', () => {
  assert.equal(isMissingNewTimeColumn("Could not find the 'ceremony_time' column of 'eventos' in the schema cache"), true);
  assert.equal(isMissingNewTimeColumn('column "reception_time" of relation "eventos" does not exist'), true);
});

test('no reintenta con otros errores', () => {
  assert.equal(isMissingNewTimeColumn('new row violates row-level security policy'), false);
  assert.equal(isMissingNewTimeColumn(undefined), false);
});

test('withoutNewTimeColumns quita solo los horarios nuevos y conserva el resto', () => {
  const input = { title: 'Demo', time: '17:30', ceremony_time: '17:30', reception_time: null };
  const output = withoutNewTimeColumns(input);
  assert.deepEqual(output, { title: 'Demo', time: '17:30' });
  assert.equal('ceremony_time' in input, true);
});
