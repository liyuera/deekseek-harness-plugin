/**
 * The whole document rides the domain's global slot: devDock has exactly one
 * settings document, and a `single` layout stores it as one readable file
 * under `$DSH_HOME/storages`. A stored document that fails the schema makes
 * `open` reject — this is authoritative user preference, not disposable cache,
 * so it must fail loud rather than silently reset.
 */
export declare const devDockDomain: {
    name: string;
    version: number;
    global: {
        schema: import("zod").ZodType<import("./schema.ts").DevDockSettings, unknown, import("zod/v4/core").$ZodTypeInternals<import("./schema.ts").DevDockSettings, unknown>>;
        initial: import("./schema.ts").DevDockSettings;
    };
    tables: {};
};
//# sourceMappingURL=domain.d.ts.map