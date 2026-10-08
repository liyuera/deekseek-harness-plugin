import { candidateName, previewText } from "../normalize.js";
import { IconBookmarkOutline16 } from "../strip/icons.js";
/** Rows rendered for one query, at most. */
export const CANDIDATE_LIMIT = 50;
/** Longest row preview, in code points. */
const PREVIEW_LIMIT = 60;
/**
 * Build the saved-prompt trigger source.
 * @param state - current store snapshot, read per keystroke.
 * @param t - dictionary-bound translator.
 * @returns the source registered on `ctx.inputTriggers`.
 */
export function createFavoritesSource(state, t) {
    return {
        trigger: '@',
        name: 'favorites',
        order: 100,
        showGroupTitle: false,
        candidates: (_session, req) => {
            const query = req.query.trim().toLowerCase();
            const items = [...state().items].sort((left, right) => right.createdAt - left.createdAt);
            const matched = query === '' ? items : items.filter(item => item.text.toLowerCase().includes(query));
            const taken = new Set();
            const rows = matched.slice(0, CANDIDATE_LIMIT).map((item) => {
                const name = candidateName(item.text, taken);
                taken.add(name);
                return {
                    name,
                    label: name,
                    description: previewText(item.text, PREVIEW_LIMIT),
                    section: t('group'),
                    icon: IconBookmarkOutline16,
                    value: item.id,
                };
            });
            return Promise.resolve(rows);
        },
        onPick: (pick) => {
            const id = pick.candidate.value;
            const record = id === undefined ? undefined : state().items.find(item => item.id === id);
            return record === undefined ? undefined : { text: record.text };
        },
    };
}
//# sourceMappingURL=source.js.map