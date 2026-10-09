import { slugify, uniqueName } from "./slug.js";
/**
 * Give every record without a name a unique one, keeping existing names.
 * @param table - saved-prompt table.
 * @returns how many records were named.
 */
export async function backfillNames(table) {
    const records = [...table.entries()].map(([, record]) => record);
    const taken = new Set(records.flatMap(record => record.name === undefined ? [] : [record.name]));
    let named = 0;
    for (const record of records) {
        if (record.name !== undefined)
            continue;
        const name = uniqueName(slugify(record.text), taken);
        taken.add(name);
        await table.put(record.id, { ...record, name });
        named += 1;
    }
    return named;
}
//# sourceMappingURL=backfill.js.map