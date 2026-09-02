import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Composer-row balance readout: a compact red amount pill beside the
 * access-mode control. Clicking triggers an immediate refresh independent of
 * the 5-minute poll cycle (both share only the in-flight counter that drives
 * the loading indicator).
 */
import { useEffect, useRef, useState } from 'react';
import css from './BalanceFooter.module.css';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
function parsePayload(value) {
    if (typeof value !== 'object' || value === null)
        return {};
    const record = value;
    return {
        ...(typeof record.ok === 'boolean' ? { ok: record.ok } : {}),
        ...(typeof record.error === 'string' ? { error: record.error } : {}),
        ...(typeof record.available === 'boolean' ? { available: record.available } : {}),
        ...(typeof record.currency === 'string' ? { currency: record.currency } : {}),
        ...(typeof record.totalBalance === 'string' ? { totalBalance: record.totalBalance } : {}),
    };
}
/** Render one composer-row balance cell. */
export function BalanceFooter(_props) {
    const [view, setView] = useState({ loading: false, data: undefined, error: undefined });
    const inFlight = useRef(0);
    const refresh = () => {
        inFlight.current += 1;
        setView(current => ({ ...current, loading: true }));
        fetch('/ds-balance', { headers: { Accept: 'application/json' } })
            .then(async (response) => {
            const payload = parsePayload(await response.json());
            inFlight.current -= 1;
            const ok = payload.ok === true;
            setView(current => ({
                ...current,
                loading: inFlight.current > 0,
                data: ok ? payload : current.data,
                error: ok ? undefined : String(payload.error ?? '查询失败'),
            }));
        })
            .catch((error) => {
            inFlight.current -= 1;
            setView(current => ({
                ...current,
                loading: inFlight.current > 0,
                error: error instanceof Error ? error.message : String(error),
            }));
        });
    };
    useEffect(() => {
        refresh();
        const id = window.setInterval(refresh, POLL_INTERVAL_MS);
        return () => {
            window.clearInterval(id);
        };
        // refresh is stable: it only closes over refs and the setter.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const data = view.data;
    const amount = data === undefined
        ? undefined
        : `${data.currency === 'USD' ? '$' : '¥'}${data.totalBalance ?? ''}`;
    const title = view.error === undefined
        ? (amount === undefined ? 'DeepSeek 余额查询中' : `DeepSeek 余额 ${amount} · 点击刷新`)
        : `DeepSeek 余额查询失败：${view.error}`;
    return (_jsxs("button", { type: "button", className: css.cell, "data-loading": view.loading || undefined, "aria-label": amount === undefined ? 'DeepSeek 余额' : `DeepSeek 余额 ${amount}`, title: title, onClick: refresh, children: [_jsx("span", { className: css.money, children: amount === undefined ? '--' : amount }), view.loading ? _jsx("span", { className: css.spinner, "aria-hidden": true }) : null] }));
}
//# sourceMappingURL=BalanceFooter.js.map