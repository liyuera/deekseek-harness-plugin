/**
 * Bookmark strip: one extra Chat node directly under each user message.
 *
 * ORDERING CONTRACT — the node key is `${kind.length}:${kind}${id}`, and the
 * Chat view orders equal anchors by that key's dictionary order (anchor → rank
 * → originalAnchor → key). The built-in user node is `13:input-message…`, so
 * this kind's 14-character name keeps every strip AFTER its message. Renaming
 * the kind, or moving `anchorSeq` off `event.seq`, moves the strip: a shorter
 * name sorts it above the bubble, and an anchor below the turn's
 * `openingHumanAnchor` folds it into the process group.
 */
import type { ConversationLocation, ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { isAppendSurfaceEvent } from '@deepseek-ai/dsh-session/surface'

/** Renderer dispatch key; see the ordering contract above before changing it. */
export const FAVORITE_STRIP_KIND = 'favorite-strip'

/** Payload of one strip node. */
export interface FavoriteStripData {
  readonly text: string
  readonly seq: number
}

declare module '@deepseek-ai/dsh-client-ui-chat/client' {
  interface ChatNodeDataMap {
    /** Bookmark strip under one user message. */
    'favorite-strip': FavoriteStripData
  }
}

/**
 * Join the text blocks of one message the way the built-in copy action does,
 * so the saved text is exactly what the user sees.
 * @param content - message content blocks.
 * @returns the joined plain text.
 */
function messageText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const texts: string[] = []
  for (const block of content) {
    const candidate = block as { type?: string; text?: string }
    if (candidate.type === 'text' && typeof candidate.text === 'string') texts.push(candidate.text)
  }
  return texts.join('')
}

/** One bookmark strip per user-authored message with visible text. */
export const favoriteStripDefinition: ConversationNodeDefinition<FavoriteStripData> = {
  kind: FAVORITE_STRIP_KIND,
  target: 'chat',
  match: (event) => {
    if (event.type !== 'user/message' || !isAppendSurfaceEvent(event)) return null
    if (event.data.source.kind !== 'user') return null
    const text = messageText(event.data.content)
    return text.trim() === '' ? null : { id: String(event.data.id), role: 'start' }
  },
  start: (_context, match) => {
    if (match.event.type !== 'user/message') throw new Error('favorite-strip start requires user/message')
    return { text: messageText(match.event.data.content), seq: match.event.seq }
  },
  update: context => context.state,
  buildViewNode: (context) => {
    if (context.state === undefined || context.start === undefined) return null
    const location: ConversationLocation = context.start.location
    return {
      key: context.key,
      kind: FAVORITE_STRIP_KIND,
      id: context.id,
      target: 'chat',
      anchorSeq: context.start.event.seq,
      location,
      visibility: 'visible',
      data: context.state,
    } satisfies ChatNode<typeof FAVORITE_STRIP_KIND>
  },
}
