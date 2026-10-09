/**
 * One bookmark strip under a user message: the citation line for saved prompts
 * this message cites, plus the bookmark action with an inline undo window.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
// Type-only: merges the session standard props (`sessionId`) this component reads.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { resolveMentions, scanMentions, type CitedPrompt, type MentionResolution } from '../../mentions.ts'
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
  const items = useFavorites(state => state.items)
  const ready = useFavorites(state => state.status === 'ready')
  const [removed, setRemoved] = useState<PromptRecord | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Citations mirror what the host expanded: the same grammar and the same cap
  // come from `src/mentions.ts`. Nothing renders until the list is known —
  // an unloaded list cannot tell a live reference from a deleted one.
  const cited: MentionResolution | null = useMemo(() => {
    if (!ready) return null
    const names = scanMentions(node.data.text)
    if (names.length === 0) return null
    const byName = new Map<string, CitedPrompt>()
    for (const item of items) {
      if (item.name !== undefined) byName.set(item.name, { name: item.name, text: item.text })
    }
    return resolveMentions(names, name => byName.get(name))
  }, [ready, items, node.data.text])

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

  const citedNames = cited === null ? [] : [...cited.resolved.map(item => item.name), ...cited.unresolved]
  const unresolved = new Set(cited?.unresolved ?? [])

  return (
    <div className={css.block}>
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
      {cited !== null && citedNames.length > 0 && (
        <div className={css.citations}>
          <button
            type="button"
            className={css.citationsToggle}
            aria-expanded={open}
            aria-label={open ? t('strip.collapse') : t('strip.expand')}
            onClick={() => { setOpen(value => !value) }}
          >
            {t('strip.cites')}
            {citedNames.map((name, index) => (
              <span key={name} className={css.citationName}>
                {index === 0 ? ' ' : t('strip.citesSeparator')}
                {`@${name}`}
                {unresolved.has(name) && <span className={css.citationNote}>{t('strip.notFound')}</span>}
              </span>
            ))}
            {cited.omitted > 0 && (
              <span className={css.citationNote}>
                {` (${t('strip.omitted', { count: String(cited.omitted) })})`}
              </span>
            )}
          </button>
          {open && (
            <div className={css.citationsBody}>
              {cited.resolved.map(item => (
                <div key={item.name} className={css.citation}>
                  <span className={css.citationName}>{`@${item.name}`}</span>
                  <div className={css.citationText}>{item.text}</div>
                </div>
              ))}
              {cited.unresolved.map(name => (
                <div key={name} className={css.citation}>
                  <span className={css.citationName}>{`@${name}`}</span>
                  <div className={css.citationNote}>{t('strip.notFound')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
