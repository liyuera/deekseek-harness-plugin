/**
 * Editor detection service: merges live auto-detection with user-configured
 * paths from settings. The detection routines themselves live in the
 * platform directory.
 * @module @liyuera/dsh-dev-dock/editors
 */

import type { EditorRecord } from './schema.ts'
import { detectDarwinEditors } from './platform/editors-darwin.ts'
import { detectWin32Editors } from './platform/editors-win32.ts'
import type { PlatformFacts } from './platform/runner.ts'

/** Known editor names across platforms (union for stable UI display). */
export const KNOWN_EDITORS = [
  'WebStorm', 'VS Code', 'IntelliJ IDEA', 'Cursor', 'Sublime Text', 'HBuilderX',
] as const

/** Preferable non-uni-app editors, in preference order. */
export const PREFERRED_EDITORS = ['WebStorm', 'VS Code', 'Cursor', 'IntelliJ IDEA', 'Sublime Text'] as const

/**
 * Run platform editor detection.
 * @param facts - platform facts.
 * @returns detected paths keyed by editor name.
 */
export async function detectEditors(facts: PlatformFacts): Promise<Record<string, string>> {
  if (facts.platform === 'win32') return detectWin32Editors(facts)
  return detectDarwinEditors(facts)
}

/**
 * Merge detected paths with manual configuration: manual overrides detection
 * for the same editor; detected paths refresh the cache.
 * @param detected - live detection result.
 * @param stored - editors from settings.
 * @returns merged editor records; empty entries are dropped.
 */
export function mergeEditors(
  detected: Record<string, string>,
  stored: readonly EditorRecord[],
): EditorRecord[] {
  const byName = new Map(stored.map((e) => [e.name, { ...e }]))
  for (const name of KNOWN_EDITORS) {
    const current = byName.get(name)
    const detectedPath = detected[name]
    if (current !== undefined) {
      if (detectedPath !== undefined) current.detectedPath = detectedPath
      else delete current.detectedPath
    } else {
      const entry: EditorRecord = { name }
      if (detectedPath !== undefined) entry.detectedPath = detectedPath
      byName.set(name, entry)
    }
  }
  for (const [name, entry] of byName) {
    if (!KNOWN_EDITORS.includes(name as (typeof KNOWN_EDITORS)[number])) {
      byName.delete(name)
      continue
    }
    if (entry.detectedPath === undefined && entry.manualPath === undefined) byName.delete(name)
  }
  return [...byName.values()]
}
