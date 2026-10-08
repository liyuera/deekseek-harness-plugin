/** HTTP transport of the favorite-prompts route (browser half). */
import { PROMPT_ROUTE } from "../schema.js";
/**
 * Call the route and unwrap one JSON answer.
 * @param path - route path, query included.
 * @param init - fetch options.
 * @returns the successful answer.
 */
async function call(path, init) {
    const response = await fetch(path, {
        headers: { 'content-type': 'application/json' },
        ...init,
    });
    const answer = await response.json();
    if (!response.ok || answer.ok !== true)
        throw new Error(answer.error ?? `HTTP ${response.status}`);
    return answer;
}
/** The live transport. */
export const promptTransport = {
    list: async () => (await call(PROMPT_ROUTE, { method: 'GET' })).items ?? [],
    create: async (text, source) => {
        const answer = await call(PROMPT_ROUTE, {
            method: 'POST',
            body: JSON.stringify(source === undefined ? { text } : { text, source }),
        });
        return answer.item;
    },
    update: async (id, text) => {
        const answer = await call(PROMPT_ROUTE, { method: 'PATCH', body: JSON.stringify({ id, text }) });
        return answer.item;
    },
    restore: async (record) => {
        const answer = await call(PROMPT_ROUTE, { method: 'PUT', body: JSON.stringify(record) });
        return answer.item;
    },
    remove: async (id) => {
        await call(`${PROMPT_ROUTE}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
};
//# sourceMappingURL=transport.js.map