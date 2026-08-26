/**
 * Start-work dialog: check the workspace projects to launch, confirming
 * starts each selected project's editor + system terminal. The selection is
 * remembered in settings and prefilled next time.
 */
import { useEffect, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { DevDockActions, DevDockData } from './data.ts'
import { StartTile } from './StartTile.tsx'
import { NS } from './locales.ts'
import type { createDevDockStore } from './stores.ts'
import css from './StartWork.module.css'

/** Registration-side inject face for the dialog. */
export interface StartWorkModalInjected {
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
  /** Data mutation and desktop actions. */
  dataActions: DevDockActions
}

/** Full component props for the start-work dialog. */
export type StartWorkModalProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createDevDockStore>>
  & PropsLocale<typeof NS>
  & InjectFace<StartWorkModalInjected>

/** Dialog phase: idle selection, running, or a failed settle. */
type Phase = 'idle' | 'running' | 'error'

/**
 * The start-work dialog.
 * @param props - overlay runtime, view store, data hook, actions, translator.
 * @returns the modal, or null when closed.
 */
export function StartWorkModal({ useStore, actions, useWorkspaces, useDevDockData, dataActions, t }: StartWorkModalProps) {
  const { open } = useStore(state => state)
  const workspaces = useWorkspaces(state => state.items)
  const settings = useDevDockData(data => data.settings)
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')

  // Prefill from the remembered selection whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    const remembered = settings?.startWork ?? []
    const available = new Set<string>(workspaces.map(w => w.workspaceId))
    setSelection(new Set(remembered.filter(id => available.has(id))))
    setPhase('idle')
    setError('')
  }, [open, settings, workspaces])

  if (!open) return null

  const toggle = (workspaceId: string): void => {
    setSelection(current => {
      const next = new Set(current)
      if (next.has(workspaceId)) next.delete(workspaceId)
      else next.add(workspaceId)
      return next
    })
  }

  const confirm = async (): Promise<void> => {
    const ids = workspaces.map(w => w.workspaceId).filter(id => selection.has(id))
    if (ids.length === 0) return
    setPhase('running')
    const answer = await dataActions.startWork(ids)
    // Remember the selection regardless of the outcome.
    await dataActions.setStartWork(ids)
    if (answer.ok) {
      // Successful start closes the dialog (the workspaces are launched).
      actions.setOpen(false)
      return
    }
    setError('fetchError' in answer
      ? answer.error ?? String(answer.fetchError)
      : answer.error ?? 'start failed')
    setPhase('error')
  }

  const close = (): void => { actions.setOpen(false) }

  return (
    <Modal
      open
      onClose={close}
      title={t('start.button')}
      closeLabel={t('start.cancel')}
      description={t('start.notice')}
      className={css.dialog as string}
      footer={(
        <>
          <Button size="md" variant="outline" className={css.actionBtn} onClick={close} disabled={phase === 'running'}>
            {t('start.cancel')}
          </Button>
          <Button
            size="md"
            variant="primary"
            className={css.actionBtn}
            onClick={() => { void confirm() }}
            disabled={selection.size === 0 || phase === 'running'}
          >
            {phase === 'running' ? t('start.running') : t('start.confirm')}
          </Button>
        </>
      )}
    >
      {workspaces.length === 0 ? (
        <p className={css.empty}>{t('start.empty')}</p>
      ) : (
        <ul className={css.list} aria-label={t('start.button')}>
          {workspaces.map((workspace) => {
            // Per-workspace tile: the project's configured editor icon and
            // the terminal preference icon, in the fused start-work style.
            const pref = settings?.workspacePrefs.find(p => p.workspaceId === workspace.workspaceId)?.editor ?? ''
            const ideSrc = `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(pref)}`
            const termSrc = `/dev-dock/terminal-icon?app=${encodeURIComponent(settings?.terminalApp ?? 'default')}`
            return (
              <li key={workspace.workspaceId}>
                <label className={css.row}>
                  <input
                    type="checkbox"
                    checked={selection.has(workspace.workspaceId)}
                    onChange={() => { toggle(workspace.workspaceId) }}
                    disabled={phase === 'running'}
                  />
                  <span className={css.rowIcon}><StartTile ideSrc={ideSrc} termSrc={termSrc} /></span>
                  <span className={css.name}>{workspace.title || workspace.path}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {phase === 'error' && <p className={css.error} role="alert">{error}</p>}
    </Modal>
  )
}
