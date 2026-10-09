import { candidateName, previewText } from "../normalize.js";
import { IconBookmarkOutline16 } from "../strip/icons.js";
/** Source name; a picked chip routes back through it at submit time. */
export const FAVORITES_SOURCE_NAME = 'favorites';
/** Rows rendered for one query, at most. */
export const CANDIDATE_LIMIT = 50;
/**
 * Menu position among `@` sources. The menu lays groups out by ascending
 * `order`, and the file/session source (`ui-reference`) declares none (0), so
 * a negative value is what lifts saved prompts to the top of the `@` menu.
 */
export const FAVORITES_SOURCE_ORDER = -100;
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
        name: FAVORITES_SOURCE_NAME,
        order: FAVORITES_SOURCE_ORDER,
        showGroupTitle: false,
        candidates: (_session, req) => {
            const query = req.query.trim().toLowerCase();
            const items = [...state().items].sort((left, right) => right.createdAt - left.createdAt);
            const matched = query === '' ? items : items.filter(item => item.text.toLowerCase().includes(query));
            const taken = new Set();
            const rows = matched.slice(0, CANDIDATE_LIMIT).map((item) => {
                // The stored name is what the mention will be, so the row shows it; a
                // record the host has not named yet falls back to a derived one.
                const name = item.name ?? candidateName(item.text, taken);
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
            if (record === undefined)
                return undefined;
            if (record.name === undefined) {
                // No mention to cite yet: send the prompt itself rather than inventing a
                // reference the host cannot resolve.
                return { text: record.text };
            }
            return {
                insert: {
                    source: FAVORITES_SOURCE_NAME,
                    // The ref IS the name, so the chip serializes without a lookup and a
                    // later rename turns the message into an unresolved mention (the
                    // designed failure path) instead of silently citing something else.
                    ref: record.name,
                    // The row the user clicked, not a freshly derived one.
                    label: pick.candidate.label ?? pick.candidate.name,
                    clipboardText: `@${record.name}`,
                },
            };
        },
        codec: {
            clipboardText: ref => `@${ref}`,
            serialize: ref => Promise.resolve(`@${ref}`),
        },
    };
}
//# sourceMappingURL=source.js.map