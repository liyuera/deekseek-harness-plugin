import { isValidName, NAME_LIMIT, slugify, uniqueName } from "./slug.js";
/** Response carrying the HTTP status the transport should answer with. */
function fail(status, error) {
    return { ok: false, error: `${status} ${error}` };
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readText(body) {
    return typeof body.text === 'string' && body.text.trim() !== '' ? body.text : undefined;
}
function readId(body) {
    return typeof body.id === 'string' && body.id !== '' ? body.id : undefined;
}
function readSource(body) {
    if (!isRecord(body.source))
        return undefined;
    const { sessionId, seq } = body.source;
    if (typeof sessionId !== 'string' || sessionId === '')
        return undefined;
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0)
        return undefined;
    return { sessionId, seq };
}
/** Names already in use, for minting a free one. */
function takenNames(table, except) {
    const taken = new Set();
    for (const [key, record] of table.entries()) {
        if (key === except)
            continue;
        if (record.name !== undefined)
            taken.add(record.name);
    }
    return taken;
}
/**
 * Answer one parsed request against one table.
 * @param table - saved-prompt table (the storage domain's `prompts` table).
 * @param request - parsed method, `id` query parameter, and JSON body.
 * @param now - clock injection for tests.
 * @returns the response body the transport serializes.
 */
export async function handlePromptRequest(table, request, now = Date.now) {
    const body = isRecord(request.body) ? request.body : undefined;
    if (request.method === 'GET') {
        const items = [...table.entries()].map(([, record]) => record)
            .sort((left, right) => right.createdAt - left.createdAt);
        return { ok: true, items };
    }
    if (request.method === 'POST') {
        if (body === undefined)
            return fail(400, 'body must be a JSON object');
        const text = readText(body);
        if (text === undefined)
            return fail(400, 'text must be a non-empty string');
        const source = readSource(body);
        const record = {
            id: crypto.randomUUID(),
            name: uniqueName(slugify(text), takenNames(table)),
            text,
            createdAt: now(),
            ...(source === undefined ? {} : { source }),
        };
        await table.put(record.id, record);
        return { ok: true, item: record };
    }
    if (request.method === 'PUT') {
        if (body === undefined)
            return fail(400, 'body must be a JSON object');
        const text = readText(body);
        const id = readId(body);
        const createdAt = typeof body.createdAt === 'number' && Number.isFinite(body.createdAt)
            ? body.createdAt
            : undefined;
        const name = typeof body.name === 'string' && body.name !== '' ? body.name : undefined;
        if (text === undefined || id === undefined || createdAt === undefined) {
            return fail(400, 'id, text, and createdAt are required');
        }
        const source = readSource(body);
        const record = {
            id,
            text,
            createdAt,
            ...(name === undefined ? {} : { name }),
            ...(source === undefined ? {} : { source }),
        };
        await table.put(id, record);
        return { ok: true, item: record };
    }
    if (request.method === 'PATCH') {
        if (body === undefined)
            return fail(400, 'body must be a JSON object');
        const text = readText(body);
        const id = readId(body);
        const requestedName = typeof body.name === 'string' && body.name !== '' ? body.name : undefined;
        if (id === undefined || (text === undefined && requestedName === undefined)) {
            return fail(400, 'id and at least one of text/name are required');
        }
        const current = table.get(id);
        if (current === undefined)
            return fail(404, `no saved prompt with id ${id}`);
        if (requestedName !== undefined) {
            if (!isValidName(requestedName)) {
                return fail(400, `name "${requestedName}" may only contain letters, digits, CJK, or hyphens, up to ${NAME_LIMIT} characters`);
            }
            if (takenNames(table, id).has(requestedName)) {
                return fail(409, `name "${requestedName}" is already used by another saved prompt`);
            }
        }
        const next = {
            ...current,
            ...(text === undefined ? {} : { text }),
            ...(requestedName === undefined ? {} : { name: requestedName }),
        };
        await table.put(id, next);
        return { ok: true, item: next };
    }
    if (request.method === 'DELETE') {
        const id = request.queryId;
        if (id === undefined || id === '')
            return fail(400, 'id query parameter is required');
        if (!(await table.delete(id)))
            return fail(404, `no saved prompt with id ${id}`);
        return { ok: true };
    }
    return fail(405, `method ${request.method} is not allowed`);
}
//# sourceMappingURL=route.js.map