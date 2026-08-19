import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * devDock import page: pick a directory through the system chooser and let
 * the agent scan candidates, analyze which are frontend projects, and
 * present the save list for confirmation. The analysis and saving run
 * through agent tools; the page shows a waiting skeleton and detects
 * completion through the project-registry count.
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './ImportPage.module.css';
/** Skeleton rows shown while the agent analyzes. */
const SKELETON_ROWS = 3;
/**
 * Render the import page.
 * @param props - prompt channel, directory picker, data hook, translator.
 * @returns the import form.
 */
export function ImportPage({ useDevDockData, promptAgent, pickDirectory, t }) {
    const settings = useDevDockData(data => data.settings);
    const [dir, setDir] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [savedCount, setSavedCount] = useState(0);
    const [picking, setPicking] = useState(false);
    // Project count before the request: completion is the registry growing.
    const baseCountRef = useRef(0);
    const pick = async () => {
        setPicking(true);
        try {
            const path = await pickDirectory();
            if (path !== null) {
                setDir(path);
                setStatus('idle');
                setError('');
            }
        }
        finally {
            setPicking(false);
        }
    };
    const start = async () => {
        const target = dir.trim();
        if (target.length === 0)
            return;
        baseCountRef.current = settings?.projects.length ?? 0;
        const ok = await promptAgent(`使用 dev-dock_scan-candidates 扫描目录 ${target}，判断其中哪些候选是前端工程`
            + `（node / uni-app / 小程序），为每个前端工程分析：类型、包管理器、Node 版本、scripts、构建命令、别名，`
            + `然后逐个调用 dev-dock_save-project 保存。保存前先在对话中列出待保存清单让用户确认。`);
        if (!ok) {
            setStatus('error');
            setError(t('import.noSession'));
            return;
        }
        setStatus('waiting');
    };
    // Completion detection: once waiting, a growing registry means the agent
    // saved projects; the state settles into the done banner.
    useEffect(() => {
        if (status !== 'waiting')
            return;
        const count = settings?.projects.length ?? 0;
        if (count > baseCountRef.current) {
            setSavedCount(count - baseCountRef.current);
            setStatus('done');
        }
    }, [settings, status]);
    const busy = status === 'waiting';
    return (_jsxs("div", { className: css.page, children: [_jsx("h2", { className: css.title, children: t('drawer.tab.import') }), _jsx("p", { className: css.desc, children: "\u9009\u62E9\u4E00\u4E2A\u76EE\u5F55\uFF08\u76EE\u5F55\u672C\u8EAB\u6216\u5176\u76F4\u63A5\u5B50\u76EE\u5F55\u90FD\u4F1A\u88AB\u626B\u63CF\u4E3A\u5019\u9009\u5DE5\u7A0B\uFF09\uFF0CAI \u5C06\u5206\u6790\u5E76\u5217\u51FA\u5F85\u4FDD\u5B58\u7684\u524D\u7AEF\u5DE5\u7A0B\u6E05\u5355\u3002" }), _jsx("span", { className: css.label, children: t('import.dirLabel') }), _jsxs("div", { className: css.controlRow, children: [_jsx(Input, { className: css.input, value: dir, readOnly: true, placeholder: t('import.noDir'), onClick: pick }), _jsx(Button, { size: "sm", variant: "outline", onClick: pick, disabled: picking || busy, children: t('import.pickDir') })] }), _jsx(Button, { size: "sm", variant: "primary", className: css.startButton, onClick: () => { void start(); }, disabled: dir.trim().length === 0 || busy, children: t('import.start') }), status === 'waiting' && (_jsxs("div", { className: css.waiting, role: "status", children: [_jsx("div", { className: css.skeletonList, children: Array.from({ length: SKELETON_ROWS }).map((_, i) => (_jsx("div", { className: css.skeletonRow }, i))) }), _jsx("p", { className: css.hint, children: t('import.waiting') })] })), status === 'done' && (_jsx("p", { className: css.hint, role: "status", children: t('import.done', { count: String(savedCount) }) })), status === 'error' && (_jsx("p", { className: css.error, role: "alert", children: error }))] }));
}
//# sourceMappingURL=ImportPage.js.map