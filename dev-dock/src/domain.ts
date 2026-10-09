/** Storage domain declaration for the devDock document. Host half only. */
import { defineDomain } from '@deepseek-ai/dsh-storage-domain'
import {
  DEV_DOCK_DOMAIN,
  DevDockDocumentSchema,
  EMPTY_DEV_DOCK_SETTINGS,
} from './schema.ts'

/**
 * The whole document rides the domain's global slot: devDock has exactly one
 * settings document, and a `single` layout stores it as one readable file
 * under `$DSH_HOME/storages`. A stored document that fails the schema makes
 * `open` reject — this is authoritative user preference, not disposable cache,
 * so it must fail loud rather than silently reset.
 */
export const devDockDomain = defineDomain({
  name: DEV_DOCK_DOMAIN,
  version: 1,
  global: {
    schema: DevDockDocumentSchema,
    initial: EMPTY_DEV_DOCK_SETTINGS,
  },
  tables: {},
})
