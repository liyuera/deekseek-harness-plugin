/**
 * Sidebar footer start-work button: the "开始上班" row that opens the
 * workspace-selection dialog. Follows the sidebar footer action style —
 * ghost row, icon + label on the wide sidebar, icon-only on the 56px rail.
 */
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { DevDockData } from './data.ts'
import { StartTile } from './StartTile.tsx'
import { NS } from './locales.ts'
import type { createDevDockStore } from './stores.ts'
import css from './StartWorkButton.module.css'

/** Registration-side inject face: the settings mirror bound as useDevDockData. */
export interface StartWorkButtonInjected {
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
}

/** Full component props for the start-work footer button. */
export type StartWorkButtonProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsStore<ReturnType<typeof createDevDockStore>>
  & PropsLocale<typeof NS>
  & InjectFace<StartWorkButtonInjected>

/**
 * The sidebar footer start-work button.
 * @param props - footer owner state, view store, settings mirror, translator.
 * @returns the button row.
 */
export function StartWorkButton({ wide, useWorkspaces, useDevDockData, actions, t }: StartWorkButtonProps) {
  const label = t('start.button')
  const settings = useDevDockData(data => data.settings)
  // The tile wears real app icons: the first workspace's configured editor
  // plus the configured terminal app (a global entry has no single session).
  const firstWorkspaceId = useWorkspaces(state => state.items[0]?.workspaceId)
  const editorPref = settings?.workspacePrefs.find(p => p.workspaceId === firstWorkspaceId)?.editor ?? ''
  const ideSrc = firstWorkspaceId === undefined
    ? undefined
    : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(firstWorkspaceId)}&v=${encodeURIComponent(editorPref)}`
  const termSrc = `/dev-dock/terminal-icon?app=${encodeURIComponent(settings?.terminalApp ?? 'default')}`

  if (!wide) {
    return (
      <button
        type="button"
        className={css.railButton}
        title={label}
        aria-label={label}
        onClick={() => { actions.setOpen(true) }}
      >
        {/* Rail controls use the 18px icon slot (settings trigger precedent). */}
        <StartTile ideSrc={ideSrc} termSrc={termSrc} size={18} />
      </button>
    )
  }

  return (
    <button
      type="button"
      className={css.row}
      title={label}
      onClick={() => { actions.setOpen(true) }}
    >
      <StartTile ideSrc={ideSrc} termSrc={termSrc} />
      <span className={css.label}>{label}</span>
    </button>
  )
}
