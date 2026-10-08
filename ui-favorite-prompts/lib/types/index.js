import { DomainError } from '@deepseek-ai/dsh-storage-domain';
import { favoritesDomain } from "./domain.js";
import { handlePromptRequest } from "./host/route.js";
import { PROMPT_ROUTE, PROMPT_TABLE } from "./schema.js";
/** Host plugin name. */
export const name = 'favorite-prompts';
/**
 * Services the host half needs. Both arrive from plugins that mount later in
 * the tree than this row, so `apply` runs when they land instead of reading
 * an empty context and staying inert for the rest of the process.
 */
export const inject = ['webServer', 'storageDomain'];
/** Background open attempts tolerated while a previous fiber releases the domain. */
const OPEN_ATTEMPTS = 10;
/** Delay between open attempts, in ms. */
const OPEN_RETRY_MS = 100;
/**
 * Open the domain, tolerating the short window in which a reloaded fiber's
 * predecessor still holds the installation-wide domain name.
 * @param facility - mounted domain facility.
 * @returns the opened domain.
 */
async function openDomain(facility) {
    for (let attempt = 1;; attempt += 1) {
        try {
            return await facility.open(favoritesDomain);
        }
        catch (error) {
            const retryable = error instanceof DomainError && error.code === 'already-open';
            if (!retryable || attempt >= OPEN_ATTEMPTS)
                throw error;
            await new Promise(resolve => setTimeout(resolve, OPEN_RETRY_MS));
        }
    }
}
/**
 * Read the request body as JSON, tolerating an empty or malformed body.
 * @param req - incoming request.
 * @returns the parsed body, or undefined.
 */
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req)
        chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf-8').trim();
    if (raw === '')
        return undefined;
    try {
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
/**
 * Write one JSON answer.
 * @param res - response to own.
 * @param status - HTTP status code.
 * @param value - response body.
 */
function writeJson(res, status, value) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
}
/**
 * Mount the domain and the route.
 * @param ctx - host context carrying `webServer` and `storageDomain`.
 */
export function apply(ctx) {
    const webServer = ctx.get('webServer');
    const facility = ctx.get('storageDomain');
    if (webServer === undefined || facility === undefined)
        return;
    let disposed = false;
    const ready = openDomain(facility).then((domain) => {
        // A late open still has to reach quiescence: close it here instead of
        // leaking the domain, and let the route report the failure.
        if (disposed) {
            void domain.close();
            throw new Error('favorite-prompts: domain opened after disposal');
        }
        return domain;
    });
    // Only the route observes this promise; its rejection becomes a 503 there.
    ready.catch(() => { });
    ctx.effect(() => () => {
        disposed = true;
        void ready.then(domain => domain.close()).catch(() => { });
    }, 'favorite-prompts: domain lifetime');
    ctx.effect(() => webServer.register({
        kind: 'exact',
        path: PROMPT_ROUTE,
        handler: async (req, res) => {
            const url = new URL(req.url ?? PROMPT_ROUTE, 'http://localhost');
            const queryId = url.searchParams.get('id');
            const method = req.method ?? 'GET';
            const request = {
                method,
                ...(queryId === null ? {} : { queryId }),
                ...(method === 'POST' || method === 'PATCH' || method === 'PUT'
                    ? { body: await readJsonBody(req) }
                    : {}),
            };
            try {
                const domain = await ready;
                const table = domain.table(PROMPT_TABLE);
                const response = await handlePromptRequest(table, request);
                // The protocol layer prefixes every failure with its HTTP status.
                writeJson(res, response.ok ? 200 : Number.parseInt(response.error, 10) || 500, response);
            }
            catch (error) {
                writeJson(res, 503, { ok: false, error: error instanceof Error ? error.message : String(error) });
            }
        },
    }), 'favorite-prompts: route');
}
//# sourceMappingURL=index.js.map