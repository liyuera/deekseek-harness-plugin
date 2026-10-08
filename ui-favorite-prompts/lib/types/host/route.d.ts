/**
 * Protocol layer of the favorite-prompts route: method dispatch, record
 * minting, and error wording. Transport (HTTP) and durability (the storage
 * domain) are the callers' concerns, so every rule here is testable against a
 * plain table.
 */
import type { PromptRecord, PromptRequest, PromptResponse } from '../schema.ts';
/** The slice of a storage-domain table this route needs. */
export interface PromptTable {
    entries(): IterableIterator<[string, PromptRecord]>;
    get(key: string): PromptRecord | undefined;
    put(key: string, value: PromptRecord): Promise<void>;
    delete(key: string): Promise<boolean>;
}
/**
 * Answer one parsed request against one table.
 * @param table - saved-prompt table (the storage domain's `prompts` table).
 * @param request - parsed method, `id` query parameter, and JSON body.
 * @param now - clock injection for tests.
 * @returns the response body the transport serializes.
 */
export declare function handlePromptRequest(table: PromptTable, request: PromptRequest, now?: () => number): Promise<PromptResponse>;
//# sourceMappingURL=route.d.ts.map