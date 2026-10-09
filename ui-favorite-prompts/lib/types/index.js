import { DomainError } from '@deepseek-ai/dsh-storage-domain';
// The `message` subpath keeps this import off the LLM entry's wider graph.
import { createUserMessage } from '@deepseek-ai/dsh-llm/message';
import { favoritesDomain } from "./domain.js";
import { backfillNames } from "./host/backfill.js";
import { renderReferenceContext, resolveMentions, scanMentions } from "./host/expand.js";
import { handlePromptRequest } from "./host/route.js";
import { PROMPT_ROUTE, PROMPT_TABLE } from "./schema.js";
/** Host plugin name. */
export const name = 'favorite-prompts';
/** Message-source attribution of the injected context. */
const CONTEXT_SOURCE = { kind: 'plugin', plugin: name };
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
 * Concatenate the text blocks of one message, the way the mention scan sees it.
 * @param message - user message entering the step.
 * @returns the message's plain text.
 */
function textContent(message) {
    return message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n');
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
 * Mount the domain, name any records that predate mentions, and serve the
 * browser half's route. The domain and the mention expansion are independent of
 * the web server, so a composition without one still cites saved prompts.
 * @param ctx - host context carrying `storageDomain` (and `webServer` for the route).
 */
export function apply(ctx) {
    const facility = ctx.get('storageDomain');
    if (facility === undefined)
        return;
    let disposed = false;
    const ready = openDomain(facility).then(async (domain) => {
        // A late open still has to reach quiescence: close it here instead of
        // leaking the domain, and let consumers report the failure.
        if (disposed) {
            void domain.close();
            throw new Error('favorite-prompts: domain opened after disposal');
        }
        // Records saved before mentions existed get their name before anything can
        // cite them, so the route and the expansion never see a nameless record.
        await backfillNames(domain.table(PROMPT_TABLE));
        return domain;
    });
    // Consumers observe this promise; its rejection becomes a 503 or a skipped
    // expansion rather than an unhandled rejection.
    ready.catch(() => { });
    ctx.effect(() => () => {
        disposed = true;
        void ready.then(domain => domain.close()).catch(() => { });
    }, 'favorite-prompts: domain lifetime');
    // A message that cites saved prompts gains one context message carrying their
    // text. Only the messages this step claims are scanned, so a turn never
    // expands the same mention twice.
    ctx.on('agent/pre-step', async (_payload, next) => {
        const decision = await next();
        if (decision.kind === 'reject')
            return decision;
        // A domain that failed to open must not break the turn: the mention stays
        // ordinary text and the route reports the failure to the browser.
        const domain = await ready.then(value => value, () => undefined);
        if (domain === undefined)
            return decision;
        const records = [...domain.table(PROMPT_TABLE).entries()].map(([, record]) => record);
        const messages = [];
        let expanded = false;
        for (const message of decision.messages) {
            messages.push(message);
            if (message.source.kind !== 'user')
                continue;
            const names = scanMentions(textContent(message));
            if (names.length === 0)
                continue;
            const { resolved, unresolved, omitted } = resolveMentions(names, records);
            messages.push(createUserMessage({
                source: CONTEXT_SOURCE,
                content: [{ type: 'text', text: renderReferenceContext(resolved, unresolved, omitted) }],
            }));
            expanded = true;
        }
        return expanded ? { ...decision, messages } : decision;
    }, { prepend: true });
    const webServer = ctx.get('webServer');
    if (webServer === undefined)
        return;
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