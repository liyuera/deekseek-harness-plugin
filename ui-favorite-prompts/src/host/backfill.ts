/**
 * Name backfill: records saved before mentions existed carry no `name`. The
 * host half mints one per record at domain open, so an older favorite becomes
 * citable without the user renaming it by hand.
 */
import type { PromptRecord } from '../schema.ts'
import { slugify, uniqueName } from './slug.ts'

/** The slice of a storage-domain table this backfill needs. */
export interface NameableTable {
  entries(): IterableIterator<[string, PromptRecord]>
  put(key: string, value: PromptRecord): Promise<void>
}

/**
 * Give every record without a name a unique one, keeping existing names.
 * @param table - saved-prompt table.
 * @returns how many records were named.
 */
export async function backfillNames(table: NameableTable): Promise<number> {
  const records = [...table.entries()].map(([, record]) => record)
  const taken = new Set(records.flatMap(record => record.name === undefined ? [] : [record.name]))
  let named = 0
  for (const record of records) {
    if (record.name !== undefined) continue
    const name = uniqueName(slugify(record.text), taken)
    taken.add(name)
    await table.put(record.id, { ...record, name })
    named += 1
  }
  return named
}
