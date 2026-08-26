/**
 * Session-header action button: one of IDE / terminal / start for the
 * current session's workspace. Deterministic — clicking calls the host route
 * directly; the button is disabled while the session has no workspace or
 * while an action is in flight.
 */
import { useEffect, useRef, useState } from 'react'
import { IconCheckOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DevDockActions, DevDockData } from './data.ts'
import { DevIdeAppIcon, DevTerminalAppIcon } from './icons.tsx'
import { StartTile } from './StartTile.tsx'
import { NS } from './locales.ts'
import css from './SessionActions.module.css'

/** Which desktop action one header button performs. */
export type SessionActionKind = 'ide' | 'terminal' | 'start'

/** Registration-side inject face for one header action button. */
export interface SessionActionInjected {
  /** Which action this button performs. */
  action: SessionActionKind
  /** Data mutation and desktop actions. */
  dataActions: DevDockActions
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
}

/** Full component props for one header action button. */
export type SessionActionButtonProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<typeof NS>
  & InjectFace<SessionActionInjected>

/** Transient per-button state. */
type ButtonState = 'idle' | 'busy' | 'ok' | 'error'

/** Which app-icon slots failed loading (fall back to the line glyph). */
type IconSlot = 'ide' | 'terminal'

/** Locale key per action kind. */
const KIND_KEY: Record<SessionActionKind, 'header.ide' | 'header.terminal' | 'header.start'> = {
  ide: 'header.ide',
  terminal: 'header.terminal',
  start: 'header.start',
}

/**
 * One session-header action button.
 * @param props - header action runtime, inject face, translator.
 * @returns the icon button, or null when the session has no workspace.
 */
export function SessionActionButton({ sessionId, useWorkspaces, useDevDockData, action, dataActions, t }: SessionActionButtonProps) {
  const workspace = useWorkspaces(state => state.items.find(w => w.sessionIds.includes(sessionId)))
  const settings = useDevDockData(data => data.settings)
  const [state, setState] = useState<ButtonState>('idle')
  const [error, setError] = useState('')
  const [iconFailed, setIconFailed] = useState<Partial<Record<IconSlot, boolean>>>({})
  const okTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (okTimer.current !== null) clearTimeout(okTimer.current)
  }, [])

  // All hooks stay above the conditional return: the workspace may disappear
  // between renders, so hook count must not depend on it. The URL derivations
  // stay safe for the no-workspace case.
  const editorPref = settings?.workspacePrefs.find(p => p.workspaceId === workspace?.workspaceId)?.editor ?? ''
  const terminalApp = settings?.terminalApp ?? 'default'
  const editorIconUrl = workspace === undefined
    ? ''
    : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(editorPref)}`
  const terminalIconUrl = `/dev-dock/terminal-icon?app=${encodeURIComponent(terminalApp)}`

  // Reconfiguring IDE/terminal in settings changes the URLs; a new URL must
  // re-try the image instead of keeping the old failure latch.
  useEffect(() => {
    setIconFailed({})
  }, [editorIconUrl, terminalIconUrl])

  if (workspace === undefined) {
    // No workspace for this session: keep the seat but render nothing.
    return null
  }

  const label = t(KIND_KEY[action])

  const failSlot = (slot: IconSlot): void => {
    setIconFailed(current => ({ ...current, [slot]: true }))
  }

  const run = async (): Promise<void> => {
    if (state === 'busy') return
    setState('busy')
    setError('')
    const answer = action === 'ide'
      ? await dataActions.openIde(workspace.workspaceId)
      : action === 'terminal'
        ? await dataActions.openTerminal(workspace.workspaceId)
        : await dataActions.start(workspace.workspaceId)
    if (answer.ok) {
      setState('ok')
      if (okTimer.current !== null) clearTimeout(okTimer.current)
      okTimer.current = setTimeout(() => { setState('idle') }, 1500)
    } else {
      setError(answer.error ?? 'unknown error')
      setState('error')
      if (okTimer.current !== null) clearTimeout(okTimer.current)
      okTimer.current = setTimeout(() => { setState('idle') }, 4000)
    }
  }

  const glyph = (): React.ReactElement => {
    if (action === 'ide') {
      if (iconFailed.ide === true) return <DevIdeAppIcon size={16} />
      return <img className={css.appIcon} src={editorIconUrl} alt="" onError={() => { failSlot('ide') }} />
    }
    if (action === 'terminal') {
      if (iconFailed.terminal === true) return <DevTerminalAppIcon size={16} />
      return <img className={css.appIcon} src={terminalIconUrl} alt="" onError={() => { failSlot('terminal') }} />
    }
    // Start: the combined tile, terminal upper-left and IDE lower-right.
    return <StartTile ideSrc={editorIconUrl} termSrc={terminalIconUrl} />
  }

  const title = state === 'error'
    ? t('header.error', { error })
    : label

  return (
    <button
      type="button"
      className={`${css.button} ${state === 'error' ? css.error : ''}`}
      title={title}
      aria-label={label}
      aria-disabled={state === 'busy'}
      onClick={() => { void run() }}
    >
      {state === 'ok' ? <IconCheckOutline16 size={16} /> : glyph()}
    </button>
  )
}
