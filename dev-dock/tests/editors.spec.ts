/**
 * Editor detection: platform runners against injected command stubs, and the
 * merge of detected paths with manual configuration.
 */
import { describe, expect, it } from 'vitest'
import type { PlatformFacts } from '../src/platform/runner.ts'
import { detectDarwinApp, detectDarwinEditors } from '../src/platform/editors-darwin.ts'
import { detectWin32Editor, detectWin32Editors } from '../src/platform/editors-win32.ts'
import { mergeEditors, KNOWN_EDITORS } from '../src/tools/editors.ts'
import type { EditorRecord } from '../src/schema.ts'

/** Build platform facts with a scripted runner. */
function factsWith(
  script: Record<string, { ok: boolean; stdout?: string }>,
): PlatformFacts {
  return {
    platform: 'darwin',
    home: '/Users/tester',
    run: async (command, args) => {
      const key = `${command} ${args.join(' ')}`
      const entry = script[key]
      if (entry === undefined) throw new Error(`unexpected command: ${key}`)
      if (!entry.ok) throw new Error(`command failed: ${key}`)
      return { stdout: entry.stdout ?? '', stderr: '' }
    },
  }
}

describe('detectDarwinApp', () => {
  it('finds an app through mdfind', async () => {
    const facts = factsWith({
      'mdfind kMDItemContentType == \'com.apple.application-bundle\' && kMDItemFSName == \'WebStorm.app\'': {
        ok: true,
        stdout: '/Applications/WebStorm.app\n',
      },
    })
    await expect(detectDarwinApp(facts, 'WebStorm.app')).resolves.toBe('/Applications/WebStorm.app')
  })

  it('falls back to the filesystem probe when mdfind fails', async () => {
    const facts = factsWith({
      'mdfind kMDItemContentType == \'com.apple.application-bundle\' && kMDItemFSName == \'Cursor.app\'': {
        ok: false,
      },
      '/bin/test -d /Applications/Cursor.app': { ok: false },
      '/bin/test -d /Users/tester/Applications/Cursor.app': { ok: true },
    })
    await expect(detectDarwinApp(facts, 'Cursor.app')).resolves.toBe('/Users/tester/Applications/Cursor.app')
  })

  it('returns undefined when nothing is found', async () => {
    const facts = factsWith({
      'mdfind kMDItemContentType == \'com.apple.application-bundle\' && kMDItemFSName == \'Nope.app\'': {
        ok: false,
      },
      '/bin/test -d /Applications/Nope.app': { ok: false },
      '/bin/test -d /Users/tester/Applications/Nope.app': { ok: false },
    })
    await expect(detectDarwinApp(facts, 'Nope.app')).resolves.toBeUndefined()
  })
})

describe('detectDarwinEditors', () => {
  it('collects every detected editor by name', async () => {
    const facts = factsWith({
      'mdfind kMDItemContentType == \'com.apple.application-bundle\' && kMDItemFSName == \'WebStorm.app\'': {
        ok: true, stdout: '/Applications/WebStorm.app\n',
      },
      'mdfind kMDItemContentType == \'com.apple.application-bundle\' && kMDItemFSName == \'Visual Studio Code.app\'': {
        ok: true, stdout: '/Applications/Visual Studio Code.app\n',
      },
    })
    const detected = await detectDarwinEditors(facts)
    expect(detected['WebStorm']).toBe('/Applications/WebStorm.app')
    expect(detected['VS Code']).toBe('/Applications/Visual Studio Code.app')
    expect(detected['Cursor']).toBeUndefined()
  })
})

describe('detectWin32Editor', () => {
  it('finds an editor via the HKCU App Paths registry', async () => {
    const facts = factsWith({
      'reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Code.exe /ve': {
        ok: true,
        stdout: '    (默认)    REG_SZ    C:\\Program Files\\Microsoft VS Code\\Code.exe\n',
      },
    })
    await expect(detectWin32Editor(facts, 'Code.exe')).resolves.toBe(
      'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    )
  })

  it('falls back to where when the registry misses', async () => {
    const facts = factsWith({
      'reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\cursor.exe /ve': {
        ok: false,
      },
      'reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\cursor.exe /ve': {
        ok: false,
      },
      'where cursor.exe': { ok: true, stdout: 'C:\\Users\\tester\\AppData\\Local\\Programs\\cursor\\cursor.exe\n' },
    })
    await expect(detectWin32Editor(facts, 'cursor.exe')).resolves.toBe(
      'C:\\Users\\tester\\AppData\\Local\\Programs\\cursor\\cursor.exe',
    )
  })
})

describe('detectWin32Editors', () => {
  it('skips editors that are not installed', async () => {
    const facts = factsWith({})
    const detected = await detectWin32Editors(facts)
    expect(detected).toEqual({})
  })
})

describe('mergeEditors', () => {
  it('merges detected paths into stored records', () => {
    const merged = mergeEditors(
      { WebStorm: '/Applications/WebStorm.app' },
      [{ name: 'WebStorm' }],
    )
    expect(merged).toEqual([{ name: 'WebStorm', detectedPath: '/Applications/WebStorm.app' }])
  })

  it('manual path overrides detection for the same editor', () => {
    const merged = mergeEditors(
      { 'VS Code': '/Applications/Visual Studio Code.app' },
      [{ name: 'VS Code', manualPath: '/custom/code.app' }],
    )
    expect(merged).toEqual([{ name: 'VS Code', manualPath: '/custom/code.app', detectedPath: '/Applications/Visual Studio Code.app' }])
  })

  it('drops editors with neither path and appends new detected ones', () => {
    const merged = mergeEditors({ Cursor: '/Applications/Cursor.app' }, [
      { name: 'Sublime Text', detectedPath: '/Applications/Sublime Text.app' },
    ])
    const names = merged.map((e) => e.name)
    expect(names).toContain('Cursor')
    expect(names).not.toContain('Sublime Text')
  })

  it('keeps known editors order and known names only', () => {
    const merged = mergeEditors({}, [{ name: 'Unknown Editor', manualPath: '/x' }])
    expect(merged).toEqual([])
    for (const e of merged) {
      expect(KNOWN_EDITORS).toContain(e.name)
    }
  })

  it('keeps a manually configured HBuilderX even when not detected', () => {
    const merged = mergeEditors({}, [{ name: 'HBuilderX', manualPath: '/Applications/HBuilderX.app' }])
    expect(merged).toEqual([{ name: 'HBuilderX', manualPath: '/Applications/HBuilderX.app' }])
  })
})
