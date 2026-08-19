import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * devDock import page: enter a directory and let the agent scan candidates,
 * analyze which are frontend projects, and present the save list for
 * confirmation. The analysis and saving run through agent tools.
 */
import { useState } from 'react';
import css from './ImportPage.module.css';
/**
 * Render the import page.
 * @param props - prompt channel and translator.
 * @returns the import form.
 */
export function ImportPage({ promptAgent, t }) {
    const [dir, setDir] = useState('');
    const [sent, setSent] = useState(false);
    const start = () => {
        const target = dir.trim();
        if (target.length === 0)
            return;
        setSent(true);
        void promptAgent(`使用 dev-dock_scan-candidates 扫描目录 ${target}，判断其中哪些候选是前端工程`
            + `（node / uni-app / 小程序），为每个前端工程分析：类型、包管理器、Node 版本、scripts、构建命令、别名，`
            + `然后逐个调用 dev-dock_save-project 保存。保存前先在对话中列出待保存清单让用户确认。`);
    };
    return (_jsxs("div", { className: css.page, children: [_jsx("h2", { className: css.title, children: t('drawer.tab.import') }), _jsx("p", { className: css.desc, children: "\u8F93\u5165\u8981\u5BFC\u5165\u7684\u76EE\u5F55\uFF08\u76EE\u5F55\u672C\u8EAB\u6216\u5176\u76F4\u63A5\u5B50\u76EE\u5F55\u90FD\u4F1A\u88AB\u626B\u63CF\u4E3A\u5019\u9009\u5DE5\u7A0B\uFF09\uFF0CAI \u5C06\u5206\u6790\u5E76\u5217\u51FA\u5F85\u4FDD\u5B58\u7684\u524D\u7AEF\u5DE5\u7A0B\u6E05\u5355\u3002" }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.label, children: "\u76EE\u5F55\u8DEF\u5F84" }), _jsx("input", { className: css.input, placeholder: "/Users/you/Documents/projects", value: dir, onChange: (e) => { setDir(e.target.value); setSent(false); } })] }), _jsx("button", { type: "button", className: css.actionPrimary, onClick: start, disabled: dir.trim().length === 0 || sent, children: sent ? '已发送，请查看对话' : '开始分析' }), sent && _jsx("p", { className: css.hint, children: "\u5206\u6790\u8BF7\u6C42\u5DF2\u53D1\u9001\u7ED9\u5F53\u524D\u4F1A\u8BDD\u7684 AI\uFF0C\u8BF7\u5728\u5BF9\u8BDD\u4E2D\u786E\u8BA4\u4FDD\u5B58\u6E05\u5355\u3002" })] }));
}
//# sourceMappingURL=ImportPage.js.map