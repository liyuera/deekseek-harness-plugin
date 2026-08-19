/**
 * Candidate scanning: fixture directory trees must produce the expected
 * signals, and skip rules must hold.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectSignals, scanCandidates } from '../src/tools/scan.ts'

/** Build a temp fixture tree and return its root. */
function fixtureTree(layout: Record<string, string | null>): string {
  const root = mkdtempSync(join(tmpdir(), 'devdock-scan-'))
  for (const [rel, content] of Object.entries(layout)) {
    const target = join(root, rel)
    if (content === null) {
      mkdirSync(target, { recursive: true })
    } else {
      mkdirSync(join(target, '..'), { recursive: true })
      writeFileSync(target, content)
    }
  }
  return root
}

describe('collectSignals', () => {
  it('detects a node project with lock file, nvmrc, deps, and scripts', () => {
    const root = fixtureTree({
      'app/package.json': JSON.stringify({
        name: 'app',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { vue: '^3.4.0' },
      }),
      'app/pnpm-lock.yaml': '',
      'app/.nvmrc': '18\n',
    })
    const signals = collectSignals(join(root, 'app'))
    expect(signals.hasPackageJson).toBe(true)
    expect(signals.hasManifest).toBe(false)
    expect(signals.lockFile).toBe('pnpm-lock.yaml')
    expect(signals.hasNodeVersionFile).toBe(true)
    expect(signals.dependencies).toContain('vue')
    expect(signals.scriptNames).toEqual(['dev', 'build'])
  })

  it('detects a uni-app project from manifest.json without package.json', () => {
    const root = fixtureTree({
      'uniapp-app/manifest.json': '{}',
    })
    const signals = collectSignals(join(root, 'uniapp-app'))
    expect(signals.hasPackageJson).toBe(false)
    expect(signals.hasManifest).toBe(true)
    expect(signals.dependencies).toEqual([])
  })

  it('detects a miniapp project from project.config.json', () => {
    const root = fixtureTree({
      'mini/project.config.json': '{}',
    })
    const signals = collectSignals(join(root, 'mini'))
    expect(signals.hasMiniappConfig).toBe(true)
  })

  it('omits optional fields when absent', () => {
    const root = fixtureTree({ 'plain/package.json': '{}' })
    const signals = collectSignals(join(root, 'plain'))
    expect(signals.lockFile).toBeUndefined()
    expect(signals.hasNodeVersionFile).toBe(false)
    expect(signals.description).toBeUndefined()
  })

  it('tolerates malformed package.json', () => {
    const root = fixtureTree({ 'broken/package.json': '{not json' })
    const signals = collectSignals(join(root, 'broken'))
    expect(signals.hasPackageJson).toBe(true)
    expect(signals.scriptNames).toEqual([])
  })
})

describe('scanCandidates', () => {
  it('returns the root and direct children, skipping hidden and noisy dirs', () => {
    const root = fixtureTree({
      'root-project/package.json': '{}',
      'child-a/package.json': '{}',
      'child-b/package.json': '{}',
      'node_modules/dep/package.json': '{}',
      '.hidden/package.json': '{}',
      'dist/package.json': '{}',
    })
    const candidates = scanCandidates(root)
    const paths = candidates.map((c) => c.path).sort()
    expect(paths).toEqual([
      root,
      join(root, 'child-a'),
      join(root, 'child-b'),
      join(root, 'root-project'),
    ])
  })

  it('does not recurse past direct children', () => {
    const root = fixtureTree({
      'parent/child/package.json': '{}',
    })
    const candidates = scanCandidates(root)
    const names = candidates.map((c) => c.name).sort()
    expect(names).toContain('parent')
    expect(names).not.toContain('child')
  })

  it('returns only the root for an unreadable or empty directory', () => {
    const root = fixtureTree({ 'empty-dir/keep': null })
    const candidates = scanCandidates(root)
    expect(candidates.length).toBeGreaterThanOrEqual(1)
    expect(candidates[0].path).toBe(root)
  })
})
