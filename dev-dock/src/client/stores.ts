/**
 * devDock panel viewing store: the start-work dialog open state. Shared by
 * the sidebar footer button and entry row so the dialog opens from either
 * and survives entry/overlay remounts.
 * @module @liyuera/dsh-dev-dock/client/stores
 */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

/** Panel viewing state. */
export type DevDockViewState = {
  /** Whether the start-work dialog is open. */
  open: boolean
}

/** Annotation twin of the actions literal (see defineStore contract). */
export type DevDockViewActions = {
  setOpen: (draft: DevDockViewState, open: boolean) => void
}

/**
 * Create the devDock viewing store.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createDevDockStore(): EngineStoreHandle<DevDockViewState, DevDockViewActions> {
  return defineStore({
    init: (): DevDockViewState => ({ open: false }),
    actions: {
      setOpen: (draft, open) => { draft.open = open },
    },
  })
}
