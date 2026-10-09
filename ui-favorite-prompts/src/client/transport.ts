/** HTTP transport of the favorite-prompts route (browser half). */
import { PROMPT_ROUTE, type PromptRecord, type PromptSourceRef } from '../schema.ts'

/** Every call the store makes; tests substitute an in-memory implementation. */
export interface PromptTransport {
  list(): Promise<PromptRecord[]>
  create(text: string, source?: PromptSourceRef): Promise<PromptRecord>
  update(id: string, text: string): Promise<PromptRecord>
  rename(id: string, name: string): Promise<PromptRecord>
  restore(record: PromptRecord): Promise<PromptRecord>
  remove(id: string): Promise<void>
}

interface Answer { ok: boolean; error?: string; items?: PromptRecord[]; item?: PromptRecord }

/**
 * Call the route and unwrap one JSON answer.
 * @param path - route path, query included.
 * @param init - fetch options.
 * @returns the successful answer.
 */
async function call(path: string, init: RequestInit): Promise<Answer> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  const answer = await response.json() as Answer
  if (!response.ok || answer.ok !== true) throw new Error(answer.error ?? `HTTP ${response.status}`)
  return answer
}

/** The live transport. */
export const promptTransport: PromptTransport = {
  list: async () => (await call(PROMPT_ROUTE, { method: 'GET' })).items ?? [],
  create: async (text, source) => {
    const answer = await call(PROMPT_ROUTE, {
      method: 'POST',
      body: JSON.stringify(source === undefined ? { text } : { text, source }),
    })
    return answer.item as PromptRecord
  },
  update: async (id, text) => {
    const answer = await call(PROMPT_ROUTE, { method: 'PATCH', body: JSON.stringify({ id, text }) })
    return answer.item as PromptRecord
  },
  rename: async (id, name) => {
    const answer = await call(PROMPT_ROUTE, { method: 'PATCH', body: JSON.stringify({ id, name }) })
    return answer.item as PromptRecord
  },
  restore: async (record) => {
    const answer = await call(PROMPT_ROUTE, { method: 'PUT', body: JSON.stringify(record) })
    return answer.item as PromptRecord
  },
  remove: async (id) => {
    await call(`${PROMPT_ROUTE}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
