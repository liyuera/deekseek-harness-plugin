import { type PromptRecord } from './schema.ts';
/**
 * One JSON document per saved prompt under `$DSH_HOME/storages`; a record that
 * fails its schema is moved aside instead of bricking the whole domain.
 */
export declare const favoritesDomain: {
    name: string;
    version: number;
    layout: "per-record";
    invalidRecords: "backup-and-skip";
    tables: {
        prompts: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, PromptRecord>;
    };
};
//# sourceMappingURL=domain.d.ts.map