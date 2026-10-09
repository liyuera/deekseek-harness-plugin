import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * One bookmark strip under a user message: the citation line for saved prompts
 * this message cites, plus the bookmark action with an inline undo window.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveMentions, scanMentions } from "../../mentions.js";
import { normalizeText } from "../normalize.js";
import { IconBookmarkFill16, IconBookmarkOutline16 } from "./icons.js";
import css from './FavoriteStrip.module.css';
/** How long the inline undo stays available, in ms. */
export const UNDO_WINDOW_MS = 5000;
/**
 * Render the bookmark strip for one message.
 * @param props - node payload, session id, favorites hook and actions, copy.
 * @returns the strip row.
 */
export function FavoriteStrip({ node, sessionId, useFavorites, actions, t }) {
    const key = normalizeText(node.data.text);
    const saved = useFavorites(state => state.byText.get(key));
    const items = useFavorites(state => state.items);
    const ready = useFavorites(state => state.status === 'ready');
    const [removed, setRemoved] = useState(null);
    const [message, setMessage] = useState(null);
    const [open, setOpen] = useState(false);
    const timer = useRef(null);
    // Citations mirror what the host expanded: the same grammar and the same cap
    // come from `src/mentions.ts`. Nothing renders until the list is known —
    // an unloaded list cannot tell a live reference from a deleted one.
    const cited = useMemo(() => {
        if (!ready)
            return null;
        const names = scanMentions(node.data.text);
        if (names.length === 0)
            return null;
        const byName = new Map();
        for (const item of items) {
            if (item.name !== undefined)
                byName.set(item.name, { name: item.name, text: item.text });
        }
        return resolveMentions(names, name => byName.get(name));
    }, [ready, items, node.data.text]);
    useEffect(() => () => {
        if (timer.current !== null)
            clearTimeout(timer.current);
    }, []);
    const announce = (text) => {
        setMessage(text);
        if (timer.current !== null)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            setMessage(null);
            setRemoved(null);
        }, UNDO_WINDOW_MS);
    };
    const onToggle = async () => {
        if (saved === undefined) {
            const ok = await actions.add(node.data.text, { sessionId, seq: node.data.seq });
            announce(ok ? t('strip.added') : t('strip.failed'));
            return;
        }
        const record = await actions.remove(saved.id);
        if (record === null)
            return;
        setRemoved(record);
        announce(t('strip.undone'));
    };
    const onUndo = async () => {
        if (removed === null)
            return;
        await actions.restore(removed);
        setRemoved(null);
        setMessage(null);
    };
    const citedNames = cited === null ? [] : [...cited.resolved.map(item => item.name), ...cited.unresolved];
    const unresolved = new Set(cited?.unresolved ?? []);
    return (_jsxs("div", { className: css.block, children: [_jsxs("div", { className: css.strip, children: [message !== null && (_jsxs("span", { className: css.undo, role: "status", children: [message, removed !== null && (_jsx("button", { type: "button", className: css.undoButton, onClick: () => { void onUndo(); }, children: t('strip.undo') }))] })), _jsx("button", { type: "button", className: css.action, "data-saved": saved === undefined ? undefined : true, "aria-label": saved === undefined ? t('strip.favorite') : t('strip.unfavorite'), "aria-pressed": saved !== undefined, onClick: () => { void onToggle(); }, children: saved === undefined ? _jsx(IconBookmarkOutline16, {}) : _jsx(IconBookmarkFill16, {}) })] }), cited !== null && citedNames.length > 0 && (_jsxs("div", { className: css.citations, children: [_jsxs("button", { type: "button", className: css.citationsToggle, "aria-expanded": open, "aria-label": open ? t('strip.collapse') : t('strip.expand'), onClick: () => { setOpen(value => !value); }, children: [t('strip.cites'), citedNames.map((name, index) => (_jsxs("span", { className: css.citationName, children: [index === 0 ? ' ' : t('strip.citesSeparator'), `@${name}`, unresolved.has(name) && _jsx("span", { className: css.citationNote, children: t('strip.notFound') })] }, name))), cited.omitted > 0 && (_jsx("span", { className: css.citationNote, children: ` (${t('strip.omitted', { count: String(cited.omitted) })})` }))] }), open && (_jsxs("div", { className: css.citationsBody, children: [cited.resolved.map(item => (_jsxs("div", { className: css.citation, children: [_jsx("span", { className: css.citationName, children: `@${item.name}` }), _jsx("div", { className: css.citationText, children: item.text })] }, item.name))), cited.unresolved.map(name => (_jsxs("div", { className: css.citation, children: [_jsx("span", { className: css.citationName, children: `@${name}` }), _jsx("div", { className: css.citationNote, children: t('strip.notFound') })] }, name)))] }))] }))] }));
}
//# sourceMappingURL=FavoriteStrip.js.map