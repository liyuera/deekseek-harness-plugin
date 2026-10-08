/** Storage domain declaration for saved prompts. Host half only. */
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
import { PROMPT_DOMAIN, PROMPT_TABLE } from "./schema.js";
const PromptSourceSchema = z.object({
    sessionId: z.string().min(1),
    seq: z.number().int().nonnegative(),
});
const PromptRecordSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    createdAt: z.number().int().nonnegative(),
    source: PromptSourceSchema.optional(),
});
/**
 * One JSON document per saved prompt under `$DSH_HOME/storages`; a record that
 * fails its schema is moved aside instead of bricking the whole domain.
 */
export const favoritesDomain = defineDomain({
    name: PROMPT_DOMAIN,
    version: 1,
    layout: 'per-record',
    invalidRecords: 'backup-and-skip',
    tables: {
        [PROMPT_TABLE]: domainTable(PromptRecordSchema),
    },
});
//# sourceMappingURL=domain.js.map