/**
 * `@` trigger source listing saved prompts. The menu's own group title is
 * owned by ui-input-trigger's dictionary, so this source declares no group
 * title and carries a localized `section` heading on every row instead.
 */
import type { InputTriggerCandidate, InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { FavoritePromptsKey } from '../locales.ts'
import type { FavoritesState } from '../store.ts'
import { candidateName, previewText } from '../normalize.ts'
import { IconBookmarkOutline16 } from '../strip/icons.tsx'

/** Translation seat of this plugin's dictionary. */
export type Translate = (key: FavoritePromptsKey, params?: Record<string, string>) => string

/** Rows rendered for one query, at most. */
export const CANDIDATE_LIMIT = 50

/** Longest row preview, in code points. */
const PREVIEW_LIMIT = 60

/**
 * Build the saved-prompt trigger source.
 * @param state - current store snapshot, read per keystroke.
 * @param t - dictionary-bound translator.
 * @returns the source registered on `ctx.inputTriggers`.
 */
export function createFavoritesSource(state: () => FavoritesState, t: Translate): InputTriggerSource {
  return {
    trigger: '@',
    name: 'favorites',
    order: 100,
    showGroupTitle: false,
    candidates: (_session, req) => {
      const query = req.query.trim().toLowerCase()
      const items = [...state().items].sort((left, right) => right.createdAt - left.createdAt)
      const matched = query === '' ? items : items.filter(item => item.text.toLowerCase().includes(query))
      const taken = new Set<string>()
      const rows: InputTriggerCandidate[] = matched.slice(0, CANDIDATE_LIMIT).map((item) => {
        const name = candidateName(item.text, taken)
        taken.add(name)
        return {
          name,
          label: name,
          description: previewText(item.text, PREVIEW_LIMIT),
          section: t('group'),
          icon: IconBookmarkOutline16,
          value: item.id,
        }
      })
      return Promise.resolve(rows)
    },
    onPick: (pick) => {
      const id = pick.candidate.value
      const record = id === undefined ? undefined : state().items.find(item => item.id === id)
      return record === undefined ? undefined : { text: record.text }
    },
  }
}
