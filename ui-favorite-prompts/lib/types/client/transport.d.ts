/** HTTP transport of the favorite-prompts route (browser half). */
import { type PromptRecord, type PromptSourceRef } from '../schema.ts';
/** Every call the store makes; tests substitute an in-memory implementation. */
export interface PromptTransport {
    list(): Promise<PromptRecord[]>;
    create(text: string, source?: PromptSourceRef): Promise<PromptRecord>;
    update(id: string, text: string): Promise<PromptRecord>;
    rename(id: string, name: string): Promise<PromptRecord>;
    restore(record: PromptRecord): Promise<PromptRecord>;
    remove(id: string): Promise<void>;
}
/** The live transport. */
export declare const promptTransport: PromptTransport;
//# sourceMappingURL=transport.d.ts.map