/** One bookmark strip under a user message, with an inline undo window. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PromptRecord } from '../../schema.ts'
import type { FavoritesActions, FavoritesState } from '../store.ts'
import { normalizeText } from '../normalize.ts'
import { NS } from '../locales.ts'
import { IconBookmarkFill16, IconBookmarkOutline16 } from './icons.tsx'
import css from './FavoriteStrip.module.css'

/** How long the inline undo stays available, in ms. */
export const UNDO_WINDOW_MS = 5000

/** Business face injected into the strip registration. */
export interface FavoriteStripInjected {
  hooks: { favorites: SnapshotStore<FavoritesState> }
  actions: FavoritesActions
}

/** Composed props of the strip component. */
export type FavoriteStripProps =
  PropsRuntime<'conversation.chat.node', 'favorite-strip'>
  & PropsLocale<typeof NS>
  & InjectFace<FavoriteStripInjected>

/**
 * Render the bookmark strip for one message.
 * @param props - node payload, session id, favorites hook and actions, copy.
 * @returns the strip row.
 */
export function FavoriteStrip({ node, sessionId, useFavorites, actions, t }: FavoriteStripProps): ReactNode {
  const key = normalizeText(node.data.text)
  const saved = useFavorites(state => state.byText.get(key))
  const [removed, setRemoved] = useState<PromptRecord | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  const announce = (text: string): void => {
    setMessage(text)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setMessage(null)
      setRemoved(null)
    }, UNDO_WINDOW_MS)
  }

  const onToggle = async (): Promise<void> => {
    if (saved === undefined) {
      const ok = await actions.add(node.data.text, { sessionId, seq: node.data.seq })
      announce(ok ? t('strip.added') : t('strip.failed'))
      return
    }
    const record = await actions.remove(saved.id)
    if (record === null) return
    setRemoved(record)
    announce(t('strip.undone'))
  }

  const onUndo = async (): Promise<void> => {
    if (removed === null) return
    await actions.restore(removed)
    setRemoved(null)
    setMessage(null)
  }

  return (
    <div className={css.strip}>
      {message !== null && (
        <span className={css.undo} role="status">
          {message}
          {removed !== null && (
            <button type="button" className={css.undoButton} onClick={() => { void onUndo() }}>
              {t('strip.undo')}
            </button>
          )}
        </span>
      )}
      <button
        type="button"
        className={css.action}
        data-saved={saved === undefined ? undefined : true}
        aria-label={saved === undefined ? t('strip.favorite') : t('strip.unfavorite')}
        aria-pressed={saved !== undefined}
        onClick={() => { void onToggle() }}
      >
        {saved === undefined ? <IconBookmarkOutline16 /> : <IconBookmarkFill16 />}
      </button>
    </div>
  )
}
