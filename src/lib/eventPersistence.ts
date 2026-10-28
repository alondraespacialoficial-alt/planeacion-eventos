import { hasNewTimeValues, isMissingNewTimeColumn, MISSING_TIME_COLUMNS_MESSAGE, withoutNewTimeColumns } from './eventColumns';

// Error explícito de la base de datos: nunca debe convertirse en guardado local ni en éxito aparente.
export class EventWriteError extends Error {}

type EventRow = Record<string, unknown>;

// Cliente mínimo de Supabase necesario para escribir eventos (permite probar con un cliente simulado).
export interface EventsClient {
  from(table: 'eventos'): {
    insert(rows: EventRow[]): { select(): { single(): PromiseLike<{ data: any; error: { message: string } | null }> } };
    update(fields: EventRow): { eq(col: string, val: string): { select(): { single(): PromiseLike<{ data: any; error: { message: string } | null }> } } };
  };
}

export async function insertEventRow<T extends EventRow>(client: EventsClient, event: T): Promise<any> {
  const run = (row: EventRow) => client.from('eventos').insert([row]).select().single();
  let { data, error } = await run(event);
  if (error && isMissingNewTimeColumn(error.message)) {
    if (hasNewTimeValues(event)) throw new EventWriteError(`No se pudo guardar la invitación. ${MISSING_TIME_COLUMNS_MESSAGE}`);
    ({ data, error } = await run(withoutNewTimeColumns(event)));
  }
  if (error) throw new EventWriteError(`No se pudo guardar la invitación en Supabase: ${error.message}`);
  return data;
}

export async function updateEventRow(client: EventsClient, id: string, fields: EventRow): Promise<any> {
  const run = (row: EventRow) => client.from('eventos').update(row).eq('id', id).select().single();
  let { data, error } = await run(fields);
  if (error && isMissingNewTimeColumn(error.message)) {
    if (hasNewTimeValues(fields)) throw new EventWriteError(`No se pudo actualizar la invitación. ${MISSING_TIME_COLUMNS_MESSAGE}`);
    ({ data, error } = await run(withoutNewTimeColumns(fields)));
  }
  if (error) throw new EventWriteError(`No se pudo actualizar la invitación en Supabase: ${error.message}`);
  return data;
}
