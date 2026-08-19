/**
 * devDock overlay drawer: a right-docked panel with page tabs (projects,
 * quick-start, import). Rendered into `shell.overlay`; open state rides the
 * shared viewing store.
 */
import { useEffect, useRef } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { DevDockActions, DevDockData } from './api.ts'
import { NS, type DevDockKey } from './locales.ts'
import type { createDevDockStore } from './stores.ts'
import { ProjectListPage } from './pages/ProjectListPage.tsx'
import { QuickStartPage } from './pages/QuickStartPage.tsx'
import { ImportPage } from './pages/ImportPage.tsx'
import css from './DevDockDrawer.module.css'

/** Registration-side inject face for the drawer. */
export interface DevDockDrawerInjected {
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
  /** Data mutation actions. */
  actions: DevDockActions
  /** Prompt the current session to run a dev-dock action tool. */
  promptAgent: (text: string) => Promise<boolean>
}

/** Full component props for the drawer. */
export type DevDockDrawerProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createDevDockStore>>
  & PropsLocale<typeof NS>
  & InjectFace<DevDockDrawerInjected>

/** Page tabs with their locale keys. */
const TABS: Array<{ page: 'projects' | 'quickStart' | 'import'; key: DevDockKey }> = [
  { page: 'projects', key: 'drawer.tab.projects' },
  { page: 'quickStart', key: 'drawer.tab.quickStart' },
  { page: 'import', key: 'drawer.tab.import' },
]

/**
 * The devDock overlay drawer.
 * @param props - overlay runtime, view store, data hook, actions, translator.
 * @returns the drawer panel, or null when closed.
 */
export function DevDockDrawer({ useStore, actions: view, useDevDockData, actions, promptAgent, t }: DevDockDrawerProps) {
  const { open, page } = useStore(state => state)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Close on Escape; focus lands on the panel on open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') view.setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [open, view])

  if (!open) return null

  const navigate = (page: 'projects' | 'quickStart' | 'import'): void => { view.setPage(page) }
  const pageProps = {
    useDevDockData,
    actions,
    promptAgent,
    t,
    onNavigate: navigate,
  }

  return (
    <div className={css.root} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={() => { view.setOpen(false) }} />
      <div ref={panelRef} className={css.panel} role="dialog" aria-modal="true" aria-label={t('drawer.title')} tabIndex={-1}>
        <nav className={css.tabs} aria-label={t('drawer.title')}>
          {TABS.map((tab) => (
            <button
              key={tab.page}
              type="button"
              className={tab.page === page ? css.tabActive : css.tab}
              aria-current={tab.page === page ? 'true' : undefined}
              onClick={() => { view.setPage(tab.page) }}
            >
              {t(tab.key)}
            </button>
          ))}
          <button
            type="button"
            className={css.close}
            aria-label={t('drawer.close')}
            onClick={() => { view.setOpen(false) }}
          >
            ×
          </button>
        </nav>
        <div className={css.content}>
          {page === 'projects' && <ProjectListPage {...pageProps} />}
          {page === 'quickStart' && <QuickStartPage {...pageProps} />}
          {page === 'import' && <ImportPage {...pageProps} />}
        </div>
      </div>
    </div>
  )
}
