/**
 * Protocol layer of the favorite-prompts route: method dispatch, record
 * minting, and error wording. Transport (HTTP) and durability (the storage
 * domain) are the callers' concerns, so every rule here is testable against a
 * plain table.
 */
import type { PromptRecord, PromptRequest, PromptResponse, PromptSourceRef } from '../schema.ts'
import { isValidName, NAME_LIMIT, slugify, uniqueName } from './slug.ts'

/** The slice of a storage-domain table this route needs. */
export interface PromptTable {
  entries(): IterableIterator<[string, PromptRecord]>
  get(key: string): PromptRecord | undefined
  put(key: string, value: PromptRecord): Promise<void>
  delete(key: string): Promise<boolean>
}

/** Response carrying the HTTP status the transport should answer with. */
function fail(status: number, error: string): PromptResponse {
  return { ok: false, error: `${status} ${error}` }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(body: Record<string, unknown>): string | undefined {
  return typeof body.text === 'string' && body.text.trim() !== '' ? body.text : undefined
}

function readId(body: Record<string, unknown>): string | undefined {
  return typeof body.id === 'string' && body.id !== '' ? body.id : undefined
}

function readSource(body: Record<string, unknown>): PromptSourceRef | undefined {
  if (!isRecord(body.source)) return undefined
  const { sessionId, seq } = body.source
  if (typeof sessionId !== 'string' || sessionId === '') return undefined
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) return undefined
  return { sessionId, seq }
}

/** Names already in use, for minting a free one. */
function takenNames(table: PromptTable, except?: string): Set<string> {
  const taken = new Set<string>()
  for (const [key, record] of table.entries()) {
    if (key === except) continue
    if (record.name !== undefined) taken.add(record.name)
  }
  return taken
}

/**
 * Answer one parsed request against one table.
 * @param table - saved-prompt table (the storage domain's `prompts` table).
 * @param request - parsed method, `id` query parameter, and JSON body.
 * @param now - clock injection for tests.
 * @returns the response body the transport serializes.
 */
export async function handlePromptRequest(
  table: PromptTable,
  request: PromptRequest,
  now: () => number = Date.now,
): Promise<PromptResponse> {
  const body = isRecord(request.body) ? request.body : undefined

  if (request.method === 'GET') {
    const items = [...table.entries()].map(([, record]) => record)
      .sort((left, right) => right.createdAt - left.createdAt)
    return { ok: true, items }
  }

  if (request.method === 'POST') {
    if (body === undefined) return fail(400, 'body must be a JSON object')
    const text = readText(body)
    if (text === undefined) return fail(400, 'text must be a non-empty string')
    const source = readSource(body)
    const record: PromptRecord = {
      id: crypto.randomUUID(),
      name: uniqueName(slugify(text), takenNames(table)),
      text,
      createdAt: now(),
      ...(source === undefined ? {} : { source }),
    }
    await table.put(record.id, record)
    return { ok: true, item: record }
  }

  if (request.method === 'PUT') {
    if (body === undefined) return fail(400, 'body must be a JSON object')
    const text = readText(body)
    const id = readId(body)
    const createdAt = typeof body.createdAt === 'number' && Number.isFinite(body.createdAt)
      ? body.createdAt
      : undefined
    const name = typeof body.name === 'string' && body.name !== '' ? body.name : undefined
    if (text === undefined || id === undefined || createdAt === undefined) {
      return fail(400, 'id, text, and createdAt are required')
    }
    const source = readSource(body)
    const record: PromptRecord = {
      id,
      text,
      createdAt,
      ...(name === undefined ? {} : { name }),
      ...(source === undefined ? {} : { source }),
    }
    await table.put(id, record)
    return { ok: true, item: record }
  }

  if (request.method === 'PATCH') {
    if (body === undefined) return fail(400, 'body must be a JSON object')
    const text = readText(body)
    const id = readId(body)
    const requestedName = typeof body.name === 'string' && body.name !== '' ? body.name : undefined
    if (id === undefined || (text === undefined && requestedName === undefined)) {
      return fail(400, 'id and at least one of text/name are required')
    }
    const current = table.get(id)
    if (current === undefined) return fail(404, `no saved prompt with id ${id}`)
    if (requestedName !== undefined) {
      if (!isValidName(requestedName)) {
        return fail(400, `name "${requestedName}" may only contain letters, digits, CJK, or hyphens, up to ${NAME_LIMIT} characters`)
      }
      if (takenNames(table, id).has(requestedName)) {
        return fail(409, `name "${requestedName}" is already used by another saved prompt`)
      }
    }
    const next: PromptRecord = {
      ...current,
      ...(text === undefined ? {} : { text }),
      ...(requestedName === undefined ? {} : { name: requestedName }),
    }
    await table.put(id, next)
    return { ok: true, item: next }
  }

  if (request.method === 'DELETE') {
    const id = request.queryId
    if (id === undefined || id === '') return fail(400, 'id query parameter is required')
    if (!(await table.delete(id))) return fail(404, `no saved prompt with id ${id}`)
    return { ok: true }
  }

  return fail(405, `method ${request.method} is not allowed`)
}
