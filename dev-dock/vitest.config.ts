/**
 * devDock plugin test configuration: standalone vitest project that resolves
 * workspace imports through explicit aliases (the plugin repo has no
 * node_modules links to workspace packages; tsconfig-paths proved unreliable
 * for direct cordis imports under vitest 4).
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('../../', import.meta.url))

// React resolves to the plugin's local npm install: the renderer, the
// ui-primitives source (reached through the workspace alias), and the testing
// library must share ONE react instance — a second one breaks hooks with a
// null dispatcher. Absolute replacements skip the root prefix below.
const reactDir = fileURLToPath(new URL('./node_modules/react', import.meta.url))
const reactDomDir = fileURLToPath(new URL('./node_modules/react-dom', import.meta.url))

/**
 * Alias the workspace packages this plugin's code and tests import. Exact
 * regexes keep subpaths like `@deepseek-ai/dsh-llm/message` from matching a
 * shorter package alias.
 */
const ALIASES: Array<[string, string]> = [
  ['react$', `${reactDir}/index.js`],
  ['react/jsx-runtime$', `${reactDir}/jsx-runtime.js`],
  ['react-dom$', `${reactDomDir}/index.js`],
  ['react-dom/client$', `${reactDomDir}/client.js`],
  ['@deepseek-ai/cordis$', 'vendor/cordis/src/index.ts'],
  ['@deepseek-ai/cordis/', 'vendor/cordis/src/'],
  ['@deepseek-ai/schemastery$', 'vendor/schemastery/src/index.ts'],
  ['@deepseek-ai/dsh-invariants$', 'packages/runtime-diagnostics/invariants/src/index.ts'],
  ['@deepseek-ai/dsh-settings$', 'packages/settings/settings/src/index.ts'],
  ['@deepseek-ai/dsh-tools$', 'packages/core/tools/src/index.ts'],
  ['@deepseek-ai/dsh-tools/', 'packages/core/tools/src/'],
  ['@deepseek-ai/dsh-agent$', 'packages/core/agent/src/index.ts'],
  ['@deepseek-ai/dsh-user-approval$', 'packages/interaction/user-approval/src/index.ts'],
  ['@deepseek-ai/dsh-sandbox$', 'packages/sandbox/sandbox/src/index.ts'],
  ['@deepseek-ai/dsh-sandbox-policy$', 'packages/sandbox/sandbox-policy/src/index.ts'],
  ['@deepseek-ai/dsh-native-command$', 'packages/util/native-command/src/index.ts'],
  ['@deepseek-ai/dsh-api-remotes/client$', 'packages/api/remotes/src/client/index.ts'],
  ['@deepseek-ai/dsh-api-remotes/types$', 'packages/api/remotes/src/types.ts'],
  ['@deepseek-ai/dsh-session/types$', 'packages/core/session/src/types.ts'],
  ['@deepseek-ai/dsh-client-runtime/client$', 'packages/client/runtime/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-runtime/', 'packages/client/runtime/src/'],
  ['@deepseek-ai/dsh-client-locale/client$', 'packages/client/locale/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-conversation/client$', 'packages/client/ui-conversation/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-layout/client$', 'packages/client/ui-layout/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-sidebar/client$', 'packages/client/ui-sidebar/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-slots$', 'packages/client/ui-slots/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-primitives$', 'packages/client/ui-primitives/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-settings$', 'packages/client/ui-settings/src/index.ts'],
  ['@deepseek-ai/dsh-client-test-runtime$', 'packages/test-support/client-runtime/src/index.ts'],
  ['@deepseek-ai/dsh-typert-protocol$', 'packages/typert/protocol/src/index.ts'],
  ['@deepseek-ai/dsh-typert-protocol/types$', 'packages/typert/protocol/src/types.ts'],
  ['@deepseek-ai/dsh-llm$', 'packages/llm/llm/src/index.ts'],
  ['@deepseek-ai/dsh-llm/message$', 'packages/llm/llm/src/message.ts'],
  ['@deepseek-ai/dsh-llm/types$', 'packages/llm/llm/src/types.ts'],
  ['@deepseek-ai/dsh-llm/brand$', 'packages/llm/llm/src/brand.ts'],
  ['@deepseek-ai/dsh-brand$', 'packages/util/brand/src/index.ts'],
  ['@deepseek-ai/dsh-commands/types$', 'packages/interaction/commands/src/types.ts'],
  ['@deepseek-ai/dsh-goal/types$', 'packages/goal/goal/src/types.ts'],
  ['@deepseek-ai/dsh-host-plugin-inventory/types$', 'packages/host/plugin-inventory/src/types.ts'],
  ['@deepseek-ai/dsh-cordis-host-runner/types$', 'packages/extensions/cordis-host-runner/src/types.ts'],
  ['@deepseek-ai/dsh-message-feedback/remote$', 'packages/feedback/message-feedback/src/typert.remote-client.js'],
  ['@deepseek-ai/dsh-commands/remote$', 'packages/interaction/commands/src/typert.remote-client.js'],
  ['@deepseek-ai/dsh-goal/remote$', 'packages/goal/goal/src/typert.remote-client.js'],
  ['@deepseek-ai/dsh-cordis-host-runner/remote$', 'packages/extensions/cordis-host-runner/src/typert.remote-client.js'],
  ['@deepseek-ai/dsh-host-plugin-inventory/remote$', 'packages/host/plugin-inventory/src/typert.remote-client.js'],
]

export default defineConfig({
  resolve: {
    alias: ALIASES.map(([find, replacement]) => ({
      find: new RegExp(`^${find}`),
      // Absolute replacements (the react aliases) are used verbatim; relative
      // ones anchor to the harness checkout root.
      replacement: replacement.startsWith('/') ? replacement : `${root}${replacement}`,
    })),
  },
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    environment: 'node',
    // Keep the testing library on the vite pipeline so its react/react-dom
    // imports ride the same aliases as the plugin sources (one react instance).
    server: {
      deps: {
        inline: ['@testing-library/react'],
      },
    },
  },
})
