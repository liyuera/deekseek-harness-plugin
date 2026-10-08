/**
 * Standalone vitest project. Workspace packages resolve through explicit
 * aliases because this repo has no node_modules links for them; react resolves
 * to the local install so the renderer, ui-primitives, and the testing library
 * share one instance.
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('../../', import.meta.url))
const reactDir = fileURLToPath(new URL('./node_modules/react', import.meta.url))
const reactDomDir = fileURLToPath(new URL('./node_modules/react-dom', import.meta.url))

const ALIASES: Array<[string, string]> = [
  ['react$', `${reactDir}/index.js`],
  ['react/jsx-runtime$', `${reactDir}/jsx-runtime.js`],
  ['react-dom$', `${reactDomDir}/index.js`],
  ['react-dom/client$', `${reactDomDir}/client.js`],
  ['@deepseek-ai/cordis$', 'vendor/cordis/src/index.ts'],
  ['@deepseek-ai/cordis/', 'vendor/cordis/src/'],
  ['@deepseek-ai/schemastery$', 'vendor/schemastery/src/index.ts'],
  ['@deepseek-ai/dsh-storage-domain$', 'packages/storage/storage-domain/src/index.ts'],
  ['@deepseek-ai/dsh-storage$', 'packages/storage/storage/src/index.ts'],
  ['@deepseek-ai/dsh-storage-json$', 'packages/storage/storage-json/src/index.ts'],
  ['@deepseek-ai/dsh-client-store$', 'packages/client/store/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-slots$', 'packages/client/ui-slots/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-primitives$', 'packages/client/ui-primitives/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-renderer/client$', 'packages/client/ui-renderer/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-locale/client$', 'packages/client/locale/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-conversation/client$', 'packages/client/ui-conversation/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-chat/client$', 'packages/client/ui-chat/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-input-trigger/client$', 'packages/client/ui-input-trigger/src/client/index.ts'],
  ['@deepseek-ai/dsh-session/surface$', 'packages/core/session/src/surface.ts'],
  ['@deepseek-ai/dsh-session/types$', 'packages/core/session/src/types.ts'],
  ['@deepseek-ai/dsh-host-webserver$', 'packages/host/webserver/src/index.ts'],
]

export default defineConfig({
  resolve: {
    alias: ALIASES.map(([find, replacement]) => ({
      find: new RegExp(`^${find}`),
      replacement: replacement.startsWith('/') ? replacement : `${root}${replacement}`,
    })),
  },
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    environment: 'node',
    server: { deps: { inline: ['@testing-library/react'] } },
  },
})
