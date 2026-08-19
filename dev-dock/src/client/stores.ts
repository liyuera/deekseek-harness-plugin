/**
 * devDock panel viewing store: drawer open state, active page, and the
 * selected project must survive entry/drawer remounts, so they live in one
 * store handle shared by the sidebar entry and the overlay drawer.
 * @module @liyuera/dsh-dev-dock/client/stores
 */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** Drawer pages. */
export type DevDockPage = 'projects' | 'quickStart' | 'import'

/** Panel viewing state. */
export type DevDockViewState = {
  /** Whether the drawer is open. */
  open: boolean
  /** Active drawer page. */
  page: DevDockPage
  /** Selected project id on the projects page (detail view). */
  selectedProjectId: string | undefined
}

/** Annotation twin of the actions literal (see defineStore contract). */
export type DevDockViewActions = {
  setOpen: (draft: DevDockViewState, open: boolean) => void
  setPage: (draft: DevDockViewState, page: DevDockPage) => void
  setSelectedProject: (draft: DevDockViewState, projectId: string | undefined) => void
}

/**
 * Create the devDock panel viewing store.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createDevDockStore(): EngineStoreHandle<DevDockViewState, DevDockViewActions> {
  return defineStore({
    init: (): DevDockViewState => ({
      open: false,
      page: 'projects',
      selectedProjectId: undefined,
    }),
    actions: {
      setOpen: (draft, open) => { draft.open = open },
      setPage: (draft, page) => { draft.page = page },
      setSelectedProject: (draft, projectId) => { draft.selectedProjectId = projectId },
    },
  })
}
