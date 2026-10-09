import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** One bookmark strip under a user message, with an inline undo window. */
import { useEffect, useRef, useState } from 'react';
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
    const [removed, setRemoved] = useState(null);
    const [message, setMessage] = useState(null);
    const timer = useRef(null);
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
    return (_jsxs("div", { className: css.strip, children: [message !== null && (_jsxs("span", { className: css.undo, role: "status", children: [message, removed !== null && (_jsx("button", { type: "button", className: css.undoButton, onClick: () => { void onUndo(); }, children: t('strip.undo') }))] })), _jsx("button", { type: "button", className: css.action, "data-saved": saved === undefined ? undefined : true, "aria-label": saved === undefined ? t('strip.favorite') : t('strip.unfavorite'), "aria-pressed": saved !== undefined, onClick: () => { void onToggle(); }, children: saved === undefined ? _jsx(IconBookmarkOutline16, {}) : _jsx(IconBookmarkFill16, {}) })] }));
}
//# sourceMappingURL=FavoriteStrip.js.map