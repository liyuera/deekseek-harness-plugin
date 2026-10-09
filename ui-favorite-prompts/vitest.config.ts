/**
 * Standalone vitest project.
 *
 * Harness packages resolve from this package's own node_modules — the published
 * versions the plugin ships against — with one substitution:
 *
 * `ui-primitives`' Node entry pulls a browser-only dependency chain (shiki,
 * simple-icons, …) that the Web shell supplies at runtime through its module
 * table, so specs use a test double of the one control the plugin passes props
 * to (`tests/support/ui-primitives.tsx`).
 *
 * The `/client` entries cannot be substituted the same way: they are the shell's
 * lazy-CJS browser artifacts (`window.__ModuleLoader__.load`) and their packages
 * publish no sources. Specs that need client-side contracts drive recording
 * doubles instead — see `tests/registration.spec.ts`.
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(new URL('./tests/support/ui-primitives.tsx', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    environment: 'node',
    // Keep the testing library on the vite pipeline so its react/react-dom
    // imports resolve through the same instance the components use.
    server: { deps: { inline: ['@testing-library/react'] } },
  },
})
