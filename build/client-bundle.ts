/**
 * Shared tsdown helper for out-of-tree dsh client plugins.
 *
 * The harness workspace preset (`packages/client/tsdown.client.ts`) resolves
 * package manifests only under `packages (group/package glob)`, so it cannot build a plugin
 * repo that lives outside the workspace. This helper replicates the dynamic
 * client channel faithfully: the same `window.__ModuleLoader__.load({ id,
 * factory })` closure artifact, module-table externals driven by the shell's
 * platform seed (`packages/client/web/src/platform.ts`, read-only), CSS
 * Modules inlining with tagged style injection, chained tsc source maps,
 * build-environment defines, and a build-time purity gate that rejects
 * undeclared cross-plugin value imports. See `chrome-browser/tsdown.config.ts`
 * for the single-config form this helper replaced.
 * @module build/client-bundle
 */

import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import { basename, dirname, resolve as resolvePath, sep } from 'node:path'
import type { UserConfig } from 'tsdown'
import { transform } from 'lightningcss'
import { clientBuildEnvironmentDefines } from '../../scripts/client-build-environment.ts'
import { PLATFORM_MODULES, PRELOADED_CLIENT_EXTERNALS } from '../../packages/client/web/src/platform.ts'

/** Virtual-id wrapper for CSS Modules, mirroring the harness preset. */
const CSS_MODULE_PREFIX = '\0dsh-css:'
const CSS_MODULE_SUFFIX = '.mjs'

/** Path segment separating a package's tsc output from the sources it was emitted from. */
const TYPES_MARKER = `${sep}lib${sep}types${sep}`

/** Trailing sourcemap reference tsc appends to every emitted module. */
const SOURCEMAP_COMMENT = /\n\/\/# sourceMappingURL=.*\s*$/

/**
 * Vendored framework libraries: rescoped into @deepseek-ai, so the purity
 * gate would read them as plugin packages. They carry no cross-plugin
 * runtime identity to share and inline like ordinary libraries.
 */
const VENDORED_LIBRARY = /^@deepseek-ai\/(cosmokit|schemastery)(\/|$)/

/**
 * Contract layers and pure folds a client bundle may inline: browser-safe
 * values with no runtime identity to share. Mirrors the harness preset.
 */
const INLINE_SAFE = /^(?:@deepseek-ai\/dsh-(?:file-reference|session|llm|tools|brand|deque|typert-protocol|util-crypto|util-values|util-workspace-path)(?:\/|$)|@deepseek-ai\/dsh-token-meter\/client$|@deepseek-ai\/dsh-agent-presets\/display$)/

/** Generated descriptor/codec contribution with no shared runtime identity. */
const GENERATED_REMOTE = /^@deepseek-ai\/dsh-[a-z0-9]+(?:-[a-z0-9]+)*\/remote$/

/** Keep CSS modules from tsdown's own css pipeline (the suffix must not end in `.css`). */
function styleInjectionModule(
  id: string,
  fileId: string,
  css: string,
  classMap?: Readonly<Record<string, string>>,
): string {
  const source = [
    `const css = ${JSON.stringify(css)};`,
    `const tagId = ${JSON.stringify(`${id}/${basename(fileId)}`)};`,
    'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
    '  const tag = document.createElement(\'style\');',
    `  tag.dataset.plugin = ${JSON.stringify(id)};`,
    '  tag.dataset.pluginCss = tagId;',
    '  tag.textContent = css;',
    '  document.head.appendChild(tag);',
    '}',
  ]
  source.push(classMap === undefined ? 'export {};' : `export default ${JSON.stringify(classMap)};`)
  return source.join('\n')
}

/** Module-table specifiers a dynamic bundle may request; the rest bundles privately. */
function requestedExternals(): ReadonlySet<string> {
  return new Set<string>([...PLATFORM_MODULES, ...PRELOADED_CLIENT_EXTERNALS])
}

/**
 * Build one dynamic client bundle config: `lib/types/client/index.js` (or a
 * custom entry) into the factory-form `lib/client.js`.
 * @param id - plugin package name; the module-table graph row it registers.
 * @param entry - client entry relative to the package root.
 * @returns the tsdown config for the browser bundle.
 */
export function clientBundleConfig(id: string, entry = 'lib/types/client/index.js'): UserConfig {
  const requested = requestedExternals()
  const isRequested = (specifier: string): boolean => requested.has(specifier)
  return {
    name: `${id}/client`,
    entry: { client: entry },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2024',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: isRequested,
      // Anything NOT requested from the loader module table must inline:
      // a require() the table cannot answer is a guaranteed runtime throw.
      alwaysBundle: (specifier: string) => !isRequested(specifier),
    },
    inputOptions: {
      resolve: {
        conditionNames: [
          (process.env.NODE_ENV ?? 'production') === 'development' ? 'development' : 'production',
          'browser', 'import', 'module', 'default',
        ],
      },
    },
    define: {
      ...clientBuildEnvironmentDefines(process.env),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    plugins: [{
      // Build-time mirror of the module-edge rules: baseline and package
      // requests stay external, inline-safe wire layers inline, and every
      // other @deepseek-ai value import is a build error (cross-plugin value
      // imports would inline a duplicate runtime instance).
      name: 'dsh-client-bundle-purity',
      resolveId(source: string) {
        if (!source.startsWith('@deepseek-ai/')) return null
        if (isRequested(source)) return null
        if (VENDORED_LIBRARY.test(source)) return null
        if (INLINE_SAFE.test(source) || GENERATED_REMOTE.test(source)) return null
        throw new Error(
          `client bundle purity: "${source}" is not a platform seed module or ${id}'s dsh.client.external, `
          + 'an inline-safe wire layer, or a generated /remote contribution — '
          + 'cross-plugin value imports are forbidden; declare a non-default module request or collaborate through cordis services '
          + '(type-only imports are erased and never reach this gate)',
        )
      },
    }, {
      name: 'dsh-css-modules-inline',
      resolveId(source: string, importer: string | undefined) {
        if (!source.endsWith('.module.css')) return null
        // The emitted import hangs under lib/types from tsc; resolve the
        // physical stylesheet in src when the emitted copy is absent.
        const emitted = importer === undefined ? source : resolvePath(dirname(importer), source)
        const fileId = existsSync(emitted)
          ? emitted
          : emitted.includes(TYPES_MARKER)
            ? resolvePath(emitted.slice(0, emitted.indexOf(TYPES_MARKER)), 'src', emitted.slice(emitted.indexOf(TYPES_MARKER) + TYPES_MARKER.length))
            : emitted
        return CSS_MODULE_PREFIX + fileId + CSS_MODULE_SUFFIX
      },
      async load(virtualId: string) {
        if (!virtualId.startsWith(CSS_MODULE_PREFIX)) return null
        const fileId = virtualId.slice(CSS_MODULE_PREFIX.length, -CSS_MODULE_SUFFIX.length)
        this.addWatchFile(fileId)
        const source = await readFile(fileId)
        const { code, exports: cssExports } = transform({
          filename: fileId,
          code: source,
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        const classMap: Record<string, string> = {}
        const exportEntries = Object.entries(cssExports ?? {})
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        for (const [local, exp] of exportEntries) classMap[local] = exp.name
        return styleInjectionModule(id, fileId, code.toString(), classMap)
      },
    }, {
      // Chain tsc's emitted maps into the bundle when the entry consumes
      // lib/types, so browser stacks reach the TypeScript/TSX sources.
      name: 'dsh-tsc-sourcemap',
      async load(id: string) {
        if (!id.includes(TYPES_MARKER) || !id.endsWith('.js') || !existsSync(`${id}.map`)) return null
        const code = readFileSync(id, 'utf8')
        const map = JSON.parse(readFileSync(`${id}.map`, 'utf8')) as {
          sources?: string[]
          sourcesContent?: unknown[]
        }
        const sources = map.sources ?? []
        if (!Array.isArray(sources) || sources.some(source => typeof source !== 'string')) {
          throw new Error(`client sourcemap: ${id}.map has invalid sources`)
        }
        if (
          !Array.isArray(map.sourcesContent)
          || map.sourcesContent.length !== sources.length
        ) {
          map.sourcesContent = await Promise.all(sources.map(async source =>
            readFile(resolvePath(id, '..', source), 'utf8')))
        }
        return { code: code.replace(SOURCEMAP_COMMENT, ''), map }
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      sourcemapExcludeSources: false,
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  }
}

/**
 * Build the Node half from tsc-emitted `lib/types` entries. Production
 * sections of the invoking package stay external (a real install materializes
 * them); everything else bundles.
 * @param id - plugin package name.
 * @param entries - `lib/types` entry files for the emitted bundles.
 * @returns the tsdown config for the node halves.
 */
export function nodeLibraryConfig(id: string, entries: readonly string[]): UserConfig {
  const manifest = JSON.parse(readFileSync(resolvePath(process.cwd(), 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
  }
  const production = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ])
  const isProduction = (specifier: string): boolean => production.has(specifier)
  return {
    name: id,
    entry: [...entries],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      neverBundle: isProduction,
      alwaysBundle: (specifier: string) => !isBuiltin(specifier) && !isProduction(specifier),
    },
  }
}
