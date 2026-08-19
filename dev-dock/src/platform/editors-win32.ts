/**
 * Windows editor detection: registry App Paths (HKCU then HKLM) with a
 * `where` PATH fallback.
 * @module @liyuera/dsh-dev-dock/platform/editors-win32
 */

import type { PlatformFacts } from './runner.ts'

/** Known Windows editor executables. */
export const WIN32_EDITOR_EXES: ReadonlyArray<{ name: string; exe: string }> = [
  { name: 'WebStorm', exe: 'webstorm64.exe' },
  { name: 'VS Code', exe: 'Code.exe' },
  { name: 'IntelliJ IDEA', exe: 'idea64.exe' },
  { name: 'Cursor', exe: 'cursor.exe' },
  { name: 'Sublime Text', exe: 'sublime_text.exe' },
  { name: 'HBuilderX', exe: 'HBuilderX.exe' },
]

/** Registry roots probed in order. */
const REGISTRY_ROOTS = [
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths',
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths',
] as const

/**
 * Query one registry App Paths key and return its default value.
 * @param facts - platform facts with an injectable runner.
 * @param root - registry root.
 * @param exe - executable name (the key name).
 * @returns the registered executable path or undefined.
 */
async function queryAppPath(
  facts: PlatformFacts,
  root: string,
  exe: string,
): Promise<string | undefined> {
  try {
    const { stdout } = await facts.run(
      'reg',
      ['query', `${root}\\${exe}`, '/ve'],
      new AbortController().signal,
    )
    const match = /REG_SZ\s+(.+)$/m.exec(stdout)
    return match?.[1]?.trim() || undefined
  } catch {
    return undefined
  }
}

/**
 * Locate one editor executable via registry then `where`.
 * @param facts - platform facts.
 * @param exe - executable name.
 * @returns the executable path or undefined when not installed.
 */
export async function detectWin32Editor(
  facts: PlatformFacts,
  exe: string,
): Promise<string | undefined> {
  for (const root of REGISTRY_ROOTS) {
    const path = await queryAppPath(facts, root, exe)
    if (path !== undefined) return path
  }
  try {
    const { stdout } = await facts.run('where', [exe], new AbortController().signal)
    const hit = stdout.trim().split('\n').find((line) => line.trim().length > 0)
    return hit?.trim() || undefined
  } catch {
    return undefined
  }
}

/**
 * Detect every known Windows editor.
 * @param facts - platform facts.
 * @returns detected editor paths keyed by editor name.
 */
export async function detectWin32Editors(
  facts: PlatformFacts,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const { name, exe } of WIN32_EDITOR_EXES) {
    const path = await detectWin32Editor(facts, exe)
    if (path !== undefined) result[name] = path
  }
  return result
}
