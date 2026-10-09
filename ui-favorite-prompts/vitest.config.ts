/**
 * Standalone vitest project.
 *
 * Harness packages resolve from this package's own node_modules — the published
 * versions the plugin ships against. Two deliberate substitutions:
 *
 * - `/client` entries are the Web shell's lazy-CJS browser artifacts, which only
 *   run inside the page. Their packages also publish `./src/*`, so the specs
 *   import that source instead: same version, loadable under Node.
 * - `ui-primitives`' Node entry pulls a browser-only dependency chain the shell
 *   supplies at runtime, so the specs use a test double of the one control the
 *   plugin passes props to.
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Published client source of one harness package. */
const clientSource = (name: string): string =>
  fileURLToPath(new URL(`./node_modules/@deepseek-ai/${name}/src/client/index.ts`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(new URL('./tests/support/ui-primitives.tsx', import.meta.url)),
      '@deepseek-ai/dsh-client-ui-renderer/client': clientSource('dsh-client-ui-renderer'),
      '@deepseek-ai/dsh-client-ui-conversation/client': clientSource('dsh-client-ui-conversation'),
      '@deepseek-ai/dsh-client-ui-chat/client': clientSource('dsh-client-ui-chat'),
      '@deepseek-ai/dsh-client-ui-input-trigger/client': clientSource('dsh-client-ui-input-trigger'),
      '@deepseek-ai/dsh-client-ui-settings/client': clientSource('dsh-client-ui-settings'),
      '@deepseek-ai/dsh-client-ui-session/client': clientSource('dsh-client-ui-session'),
      '@deepseek-ai/dsh-client-locale/client': clientSource('dsh-client-locale'),
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
