/**
 * Name backfill: records saved before mentions existed carry no `name`. The
 * host half mints one per record at domain open, so an older favorite becomes
 * citable without the user renaming it by hand.
 */
import type { PromptRecord } from '../schema.ts';
/** The slice of a storage-domain table this backfill needs. */
export interface NameableTable {
    entries(): IterableIterator<[string, PromptRecord]>;
    put(key: string, value: PromptRecord): Promise<void>;
}
/**
 * Give every record without a name a unique one, keeping existing names.
 * @param table - saved-prompt table.
 * @returns how many records were named.
 */
export declare function backfillNames(table: NameableTable): Promise<number>;
//# sourceMappingURL=backfill.d.ts.map