/**
 * Shared vocabulary of the favorite-prompts plugin: names, record types, and
 * HTTP bodies. Types only — the zod record schema lives in `domain.ts` so the
 * browser bundle never carries zod.
 */

/** Storage domain name; `UNIT_NAME_RE` forbids hyphens. */
export const PROMPT_DOMAIN = 'favorite_prompts'
/** Table holding one record per saved prompt. */
export const PROMPT_TABLE = 'prompts'
/** Same-origin HTTP route serving the browser half. */
export const PROMPT_ROUTE = '/favorite-prompts'

/** Origin message of a saved prompt. Reference only; never part of identity. */
export interface PromptSourceRef {
  sessionId: string
  seq: number
}

/** One saved prompt. */
export interface PromptRecord {
  id: string
  text: string
  createdAt: number
  /** Absent for prompts typed by hand; `| undefined` because zod emits it. */
  source?: PromptSourceRef | undefined
}

/** Successful list answer. */
export interface PromptListResponse { ok: true; items: PromptRecord[] }
/** Successful single-record answer. */
export interface PromptItemResponse { ok: true; item: PromptRecord }
/** Successful delete/restore answer. */
export interface PromptOkResponse { ok: true }
/** Failed answer; `error` is one sentence shown in a toast. */
export interface PromptErrorResponse { ok: false; error: string }
/** Every answer of the route. */
export type PromptResponse = PromptListResponse | PromptItemResponse | PromptOkResponse | PromptErrorResponse

/** Parsed request handed to the protocol layer. */
export interface PromptRequest {
  method: string
  /** `id` query parameter, when present. */
  queryId?: string
  /** Parsed JSON body, or undefined when absent/invalid. */
  body?: unknown
}
