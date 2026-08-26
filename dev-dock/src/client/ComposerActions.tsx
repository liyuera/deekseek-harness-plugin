/**
 * Composer actions: the three devDock buttons (IDE / terminal / start) in
 * the input tool row's left seat, bound to the current session's workspace.
 * Same resolution and feedback as the session-header actions, in a compact
 * group beside the resident chrome.
 */
import { useEffect, useRef, useState } from 'react'
import { IconCheckOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DevDockActions, DevDockData } from './data.ts'
import { DevIdeAppIcon, DevTerminalAppIcon } from './icons.tsx'
import { StartTile } from './StartTile.tsx'
import { NS } from './locales.ts'
import css from './SessionActions.module.css'

/** Which desktop action one button performs. */
type ComposerActionKind = 'ide' | 'terminal' | 'start'

/** Registration-side inject face for the composer action group. */
export interface ComposerActionsInjected {
  /** Data mutation and desktop actions. */
  dataActions: DevDockActions
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
}

/** Full component props for the composer action group (left/right seats
 * carry the same InputZone standard props, so both registrations accept it). */
export type ComposerActionsProps =
  PropsRuntime<'conversation.input.left'>
  & PropsRuntime<'conversation.input.right'>
  & PropsLocale<typeof NS>
  & InjectFace<ComposerActionsInjected>

/** Per-button transient state. */
type ButtonState = 'idle' | 'busy' | 'ok' | 'error'

/** Locale key per action kind. */
const KIND_KEY: Record<ComposerActionKind, 'header.ide' | 'header.terminal' | 'header.start'> = {
  ide: 'header.ide',
  terminal: 'header.terminal',
  start: 'header.start',
}

/**
 * The composer tool-row action group.
 * @param props - input-zone runtime, settings mirror, actions, translator.
 * @returns the three buttons, or null when the session has no workspace.
 */
export function ComposerActions({ sessionId, useWorkspaces, useDevDockData, dataActions, t }: ComposerActionsProps) {
  const workspace = useWorkspaces(state => state.items.find(w => w.sessionIds.includes(sessionId)))
  const settings = useDevDockData(data => data.settings)
  const [states, setStates] = useState<Record<ComposerActionKind, ButtonState>>({
    ide: 'idle', terminal: 'idle', start: 'idle',
  })
  const [errors, setErrors] = useState<Partial<Record<ComposerActionKind, string>>>({})
  const [iconFailed, setIconFailed] = useState<Partial<Record<'ide' | 'terminal', boolean>>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  // All hooks stay above the conditional return; the URLs follow the current
  // preferences and re-try images when they change (same latch discipline as
  // the header actions).
  const editorPref = settings?.workspacePrefs.find(p => p.workspaceId === workspace?.workspaceId)?.editor ?? ''
  const terminalApp = settings?.terminalApp ?? 'default'
  const editorIconUrl = workspace === undefined
    ? ''
    : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(editorPref)}`
  const terminalIconUrl = `/dev-dock/terminal-icon?app=${encodeURIComponent(terminalApp)}`
  useEffect(() => {
    setIconFailed({})
  }, [editorIconUrl, terminalIconUrl])

  if (workspace === undefined) {
    // No workspace for this session: keep the seat but render nothing.
    return null
  }

  const run = async (kind: ComposerActionKind): Promise<void> => {
    if (states[kind] === 'busy') return
    setStates(current => ({ ...current, [kind]: 'busy' }))
    const answer = kind === 'ide'
      ? await dataActions.openIde(workspace.workspaceId)
      : kind === 'terminal'
        ? await dataActions.openTerminal(workspace.workspaceId)
        : await dataActions.start(workspace.workspaceId)
    setStates(current => ({ ...current, [kind]: answer.ok ? 'ok' : 'error' }))
    if (!answer.ok) setErrors(current => ({ ...current, [kind]: answer.error ?? 'unknown error' }))
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setStates({ ide: 'idle', terminal: 'idle', start: 'idle' })
    }, answer.ok ? 1500 : 4000)
  }

  const kindIcon = (kind: ComposerActionKind): React.ReactElement => {
    if (kind === 'ide') {
      return iconFailed.ide === true
        ? <DevIdeAppIcon size={16} />
        : <img className={css.appIcon} src={editorIconUrl} alt="" onError={() => { setIconFailed(c => ({ ...c, ide: true })) }} />
    }
    if (kind === 'terminal') {
      return iconFailed.terminal === true
        ? <DevTerminalAppIcon size={16} />
        : <img className={css.appIcon} src={terminalIconUrl} alt="" onError={() => { setIconFailed(c => ({ ...c, terminal: true })) }} />
    }
    return <StartTile ideSrc={editorIconUrl} termSrc={terminalIconUrl} />
  }

  return (
    <span className={css.group}>
      {(['ide', 'terminal', 'start'] as const).map((kind) => {
        const state = states[kind]
        const title = state === 'error'
          ? t('header.error', { error: errors[kind] ?? '' })
          : t(KIND_KEY[kind])
        return (
          <button
            key={kind}
            type="button"
            className={`${css.button} ${state === 'error' ? css.error : ''}`}
            title={title}
            aria-label={title}
            aria-disabled={state === 'busy'}
            onClick={() => { void run(kind) }}
          >
            {state === 'ok' ? <IconCheckOutline16 size={16} /> : kindIcon(kind)}
          </button>
        )
      })}
    </span>
  )
}
