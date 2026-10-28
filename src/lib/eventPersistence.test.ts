import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOptionalTimes } from './eventColumns';
import { EventWriteError, EventsClient, insertEventRow, updateEventRow } from './eventPersistence';

type Result = { data: any; error: { message: string } | null };

// Cliente simulado: responde con la lista de resultados en orden y registra cada payload recibido.
function fakeClient(results: Result[]) {
  const calls: { op: string; payload: any }[] = [];
  const next = () => Promise.resolve(results.shift() as Result);
  const client: EventsClient = {
    from: () => ({
      insert: rows => { calls.push({ op: 'insert', payload: rows[0] }); return { select: () => ({ single: next }) }; },
      update: fields => { calls.push({ op: 'update', payload: fields }); return { eq: () => ({ select: () => ({ single: next }) }) }; },
    }),
  };
  return { client, calls };
}

const missingCol = { message: "Could not find the 'ceremony_time' column of 'eventos' in the schema cache" };
const rls = { message: 'new row violates row-level security policy for table "eventos"' };

test('un error de RLS al crear se propaga como EventWriteError (sin éxito aparente)', async () => {
  const { client, calls } = fakeClient([{ data: null, error: rls }]);
  await assert.rejects(insertEventRow(client, { title: 'X' }), (e: unknown) => e instanceof EventWriteError && /row-level security/.test((e as Error).message));
  assert.equal(calls.length, 1);
});

test('un error de RLS al editar se propaga y no se reintenta', async () => {
  const { client, calls } = fakeClient([{ data: null, error: rls }]);
  await assert.rejects(updateEventRow(client, 'id1', { title: 'X' }), EventWriteError);
  assert.equal(calls.length, 1);
});

test('columna faltante con horarios con valor: error, sin reintento ni éxito', async () => {
  const c1 = fakeClient([{ data: null, error: missingCol }]);
  await assert.rejects(insertEventRow(c1.client, { title: 'X', ceremony_time: '17:30' }), /migración 20261029120000/);
  assert.equal(c1.calls.length, 1);
  const c2 = fakeClient([{ data: null, error: missingCol }]);
  await assert.rejects(updateEventRow(c2.client, 'id1', { reception_time: '19:00' }), /migración 20261029120000/);
  assert.equal(c2.calls.length, 1);
});

test('columna faltante con horarios vacíos: reintenta sin esas columnas y conserva el resto', async () => {
  const { client, calls } = fakeClient([{ data: null, error: missingCol }, { data: { id: 'id1' }, error: null }]);
  const out = await updateEventRow(client, 'id1', { title: 'Boda', time: '17:00', ceremony_time: null, reception_time: null });
  assert.deepEqual(out, { id: 'id1' });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].payload, { title: 'Boda', time: '17:00' });
});

test('éxito normal devuelve la fila de la base de datos', async () => {
  const { client } = fakeClient([{ data: { id: 'n1', ceremony_time: '17:30:00' }, error: null }]);
  assert.deepEqual(await insertEventRow(client, { title: 'X', ceremony_time: '17:30' }), { id: 'n1', ceremony_time: '17:30:00' });
});

test('editar evento anterior sin columnas nuevas (migración pendiente): no envía horarios y no pierde datos', async () => {
  const legacy = { id: 'a', title: 'Boda', time: '17:00' };
  const optional = buildOptionalTimes({ ceremony_time: '', reception_time: '' }, legacy);
  assert.deepEqual(optional, {});
  const payload = { title: 'Boda editada', time: '17:00', location_name: 'Salón', ...optional };
  const { client, calls } = fakeClient([{ data: { ...legacy, ...payload }, error: null }]);
  const out = await updateEventRow(client, 'a', payload);
  assert.equal(calls.length, 1);
  assert.equal('ceremony_time' in calls[0].payload, false);
  assert.equal(out.title, 'Boda editada');
  assert.equal(out.time, '17:00');
});

test('editar evento anterior con columnas ya migradas (null): conserva null y permite fijar o vaciar', () => {
  const migrated = { id: 'a', time: '17:00', ceremony_time: null, reception_time: null };
  assert.deepEqual(buildOptionalTimes({ ceremony_time: '', reception_time: '' }, migrated), { ceremony_time: null, reception_time: null });
  assert.deepEqual(buildOptionalTimes({ ceremony_time: '17:30', reception_time: '' }, migrated), { ceremony_time: '17:30', reception_time: null });
  const withValues = { ceremony_time: '17:30:00', reception_time: '19:00:00' };
  assert.deepEqual(buildOptionalTimes({ ceremony_time: '', reception_time: '19:00' }, withValues), { ceremony_time: null, reception_time: '19:00' });
});

test('crear evento nuevo sin horarios no envía columnas nuevas', () => {
  assert.deepEqual(buildOptionalTimes({ ceremony_time: '', reception_time: '' }, undefined), {});
});
