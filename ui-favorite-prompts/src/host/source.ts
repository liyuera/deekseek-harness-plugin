/**
 * Message-source identity of the reference context this plugin injects.
 *
 * `MessageSourceMap` is the harness's merge point for message producers, so a
 * context message this plugin adds never claims to be a user or model message.
 * The type-only import is required: a merge declared without importing its
 * target does not resolve against the package graph.
 */
import type {} from '@deepseek-ai/dsh-llm/message'

declare module '@deepseek-ai/dsh-llm/message' {
  interface MessageSourceMap {
    'favorite-prompts': FavoritePromptsSource
  }
}

/** One saved-prompt reference message appended after the message that cited it. */
export interface FavoritePromptsSource {
  readonly kind: 'favorite-prompts'
  /** What the message carries: the cited prompts' text. */
  readonly form: 'reference'
  readonly version: 1
  /** Mention names this message expanded, in citation order. */
  readonly names: readonly string[]
}

/**
 * Build the source of one injected context message.
 * @param names - mention names the message expanded, in citation order.
 * @returns the source field of the message.
 */
export function referenceSource(names: readonly string[]): FavoritePromptsSource {
  return { kind: 'favorite-prompts', form: 'reference', version: 1, names }
}
