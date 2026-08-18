import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './SubagentSidebarCapsule.module.css';
/**
 * Frame-wide running-count capsule: one entry in `shell.overlay` that shows
 * how many subagent sessions are running anywhere, and opens the overview
 * panel on click. Renders nothing when nothing runs, so an idle host keeps
 * the corner clean.
 * @param props - overlay runtime hooks, shared store, translator.
 * @returns the capsule button, or null when no subagent is running.
 */
export function SubagentSidebarCapsule({ useSessions, actions, t }) {
    const runningCount = useSessions(state => Object.values(state.byId)
        .filter(summary => summary.origin === 'subagent' && summary.running).length);
    if (runningCount === 0)
        return null;
    const countKey = runningCount === 1 ? 'capsule.label.one' : 'capsule.label.other';
    return (_jsxs("button", { type: "button", className: css.capsule, title: t('capsule.title'), onClick: () => { actions.setOpen(true); }, children: [_jsx(StateDot, { state: "ongoing", className: css.dot }), _jsx("span", { children: t(countKey, { count: String(runningCount) }) })] }));
}
//# sourceMappingURL=SubagentSidebarCapsule.js.map