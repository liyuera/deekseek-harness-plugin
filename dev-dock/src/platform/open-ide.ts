/**
 * Cross-platform "open project in IDE" actions. Every command goes through
 * the no-shell runner with an argv array; no shell string is ever built.
 * @module @liyuera/dsh-dev-dock/platform/open-ide
 */

import type { PlatformFacts } from './runner.ts'

/** IDE display name → macOS app bundle name. */
export const DARWIN_APP_NAMES: Record<string, string> = {
  WebStorm: 'WebStorm',
  'VS Code': 'Visual Studio Code',
  'IntelliJ IDEA': 'IntelliJ IDEA',
  Cursor: 'Cursor',
  'Sublime Text': 'Sublime Text',
}

/**
 * Open one project with an IDE.
 * @param facts - platform facts with an injectable runner.
 * @param projectPath - absolute project path.
 * @param editorName - canonical editor name.
 * @param editorPath - resolved editor executable/app path (detected or manual).
 * @returns ok, or an error message when the open failed.
 */
export async function openProjectInIde(
  facts: PlatformFacts,
  projectPath: string,
  editorName: string,
  editorPath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const signal = new AbortController().signal
  try {
    if (facts.platform === 'win32') {
      // `start` is a cmd builtin; the argv form passes the quoted program and
      // its argument so cmd does not re-parse anything beyond the two tokens.
      await facts.run('cmd', ['/c', 'start', '""', editorPath, projectPath], signal)
      return { ok: true }
    }
    const appName = DARWIN_APP_NAMES[editorName] ?? editorName
    await facts.run('open', ['-a', appName, projectPath], signal)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
