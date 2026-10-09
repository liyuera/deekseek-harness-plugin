/**
 * Favorite-prompts host half: opens the storage domain its records live in and
 * serves the browser half's same-origin route. A composition without a web
 * server has no browser half either, so the plugin stays inert there.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DomainError, type Domain, type DomainFacility } from '@deepseek-ai/dsh-storage-domain'
// The `message` subpath keeps this import off the LLM entry's wider graph.
import { createUserMessage, type UserMessage } from '@deepseek-ai/dsh-llm/message'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { favoritesDomain } from './domain.ts'
import { backfillNames, type NameableTable } from './host/backfill.ts'
import { renderReferenceContext, resolveMessageMentions } from './host/expand.ts'
import { referenceSource } from './host/source.ts'
import { handlePromptRequest, type PromptTable } from './host/route.ts'
import { PROMPT_ROUTE, PROMPT_TABLE, type PromptRequest, type PromptResponse } from './schema.ts'

/** Host plugin name. */
export const name = 'favorite-prompts'

/**
 * Services the host half needs. Both arrive from plugins that mount later in
 * the tree than this row, so `apply` runs when they land instead of reading
 * an empty context and staying inert for the rest of the process.
 */
export const inject = ['webServer', 'storageDomain']

/** Background open attempts tolerated while a previous fiber releases the domain. */
const OPEN_ATTEMPTS = 10
/** Delay between open attempts, in ms. */
const OPEN_RETRY_MS = 100

/**
 * Open the domain, tolerating the short window in which a reloaded fiber's
 * predecessor still holds the installation-wide domain name.
 * @param facility - mounted domain facility.
 * @returns the opened domain.
 */
async function openDomain(facility: DomainFacility): Promise<Domain<typeof favoritesDomain>> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await facility.open(favoritesDomain)
    } catch (error) {
      const retryable = error instanceof DomainError && error.code === 'already-open'
      if (!retryable || attempt >= OPEN_ATTEMPTS) throw error
      await new Promise(resolve => setTimeout(resolve, OPEN_RETRY_MS))
    }
  }
}

/**
 * Read the request body as JSON, tolerating an empty or malformed body.
 * @param req - incoming request.
 * @returns the parsed body, or undefined.
 */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf-8').trim()
  if (raw === '') return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * Concatenate the text blocks of one message, the way the mention scan sees it.
 * @param message - user message entering the step.
 * @returns the message's plain text.
 */
function textContent(message: UserMessage): string {
  return message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

/**
 * Write one JSON answer.
 * @param res - response to own.
 * @param status - HTTP status code.
 * @param value - response body.
 */
function writeJson(res: ServerResponse, status: number, value: PromptResponse): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value))
}

/**
 * Mount the domain, name any records that predate mentions, expand `@name`
 * citations in user messages, and serve the browser half's route.
 *
 * Both services are declared in `inject`: the profile mounts their providers
 * after this row, so reading the context at activate time would find nothing and
 * leave the plugin inert for the rest of the process.
 * @param ctx - host context carrying `storageDomain` and `webServer`.
 */
export function apply(ctx: Context): void {
  const facility = ctx.get('storageDomain') as DomainFacility | undefined
  if (facility === undefined) return

  let disposed = false
  const ready = openDomain(facility).then(async (domain) => {
    // A late open still has to reach quiescence: close it here instead of
    // leaking the domain, and let consumers report the failure.
    if (disposed) {
      void domain.close()
      throw new Error('favorite-prompts: domain opened after disposal')
    }
    // Records saved before mentions existed get their name before anything can
    // cite them, so the route and the expansion never see a nameless record.
    await backfillNames(domain.table(PROMPT_TABLE) as unknown as NameableTable)
    return domain
  })
  // Consumers observe this promise; its rejection becomes a 503 or a skipped
  // expansion rather than an unhandled rejection.
  ready.catch(() => {})

  ctx.effect(() => () => {
    disposed = true
    void ready.then(domain => domain.close()).catch(() => {})
  }, 'favorite-prompts: domain lifetime')

  // A message that cites saved prompts gains one context message carrying their
  // text. Only the messages this step claims are scanned, so a turn never
  // expands the same mention twice.
  ctx.on('agent/pre-step', async (_payload, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    // A domain that failed to open must not break the turn: the mention stays
    // ordinary text and the route reports the failure to the browser.
    const domain = await ready.then(value => value, () => undefined)
    if (domain === undefined) return decision
    const records = [...domain.table(PROMPT_TABLE).entries()].map(([, record]) => record)
    const messages: UserMessage[] = []
    let expanded = false
    for (const message of decision.messages) {
      messages.push(message)
      if (message.source.kind !== 'user') continue
      const { names, resolved, unresolved, omitted } = resolveMessageMentions(textContent(message), records)
      if (resolved.length === 0 && unresolved.length === 0) continue
      messages.push(createUserMessage({
        source: referenceSource(names),
        content: [{ type: 'text', text: renderReferenceContext(resolved, unresolved, omitted) }],
      }))
      expanded = true
    }
    return expanded ? { ...decision, messages } : decision
  }, { prepend: true })

  const webServer = ctx.get('webServer') as WebServer | undefined
  if (webServer === undefined) return

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: PROMPT_ROUTE,
    handler: async (req, res) => {
      const url = new URL(req.url ?? PROMPT_ROUTE, 'http://localhost')
      const queryId = url.searchParams.get('id')
      const method = req.method ?? 'GET'
      const request: PromptRequest = {
        method,
        ...(queryId === null ? {} : { queryId }),
        ...(method === 'POST' || method === 'PATCH' || method === 'PUT'
          ? { body: await readJsonBody(req) }
          : {}),
      }
      try {
        const domain = await ready
        const table = domain.table(PROMPT_TABLE) as unknown as PromptTable
        const response = await handlePromptRequest(table, request)
        // The protocol layer prefixes every failure with its HTTP status.
        writeJson(res, response.ok ? 200 : Number.parseInt(response.error, 10) || 500, response)
      } catch (error) {
        writeJson(res, 503, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'favorite-prompts: route')
}
