import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Settings page managing the saved-prompt list. */
import { useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './FavoritesSettingsPage.module.css';
/** No row is open. */
const IDLE = { editingId: null, draft: '', confirmingId: null, adding: false };
/**
 * Render the management page: edit, delete, and add saved prompts.
 * @param props - favorites hook and actions, plus the locale seat.
 * @returns the page body.
 */
export function FavoritesSettingsPage({ useFavorites, actions, t }) {
    const status = useFavorites(state => state.status);
    const error = useFavorites(state => state.error);
    const items = useFavorites(state => state.items);
    const [row, setRow] = useState(IDLE);
    const submitEdit = async () => {
        if (row.editingId === null || row.draft.trim() === '')
            return;
        await actions.update(row.editingId, row.draft);
        setRow(IDLE);
    };
    const submitAdd = async () => {
        if (row.draft.trim() === '')
            return;
        await actions.add(row.draft);
        setRow(IDLE);
    };
    const onDelete = async (id) => {
        if (row.confirmingId !== id) {
            setRow({ ...IDLE, confirmingId: id });
            return;
        }
        await actions.remove(id);
        setRow(IDLE);
    };
    if (status === 'loading')
        return _jsx("div", { className: css.notice, children: t('settings.loading') });
    if (status === 'error')
        return _jsx("div", { className: css.notice, children: t('settings.unavailable', { reason: error ?? '' }) });
    const busy = row.editingId !== null || row.adding;
    return (_jsxs("div", { className: css.page, children: [_jsx("div", { className: css.toolbar, children: _jsx(Button, { variant: "outline", size: "sm", disabled: busy, onClick: () => { setRow({ ...IDLE, adding: true }); }, children: t('settings.new') }) }), row.adding && (_jsxs("div", { className: css.rowBody, children: [_jsx("textarea", { className: css.editor, value: row.draft, placeholder: t('settings.placeholder'), onChange: (event) => { setRow(current => ({ ...current, draft: event.target.value })); } }), _jsxs("div", { className: css.rowActions, children: [_jsx(Button, { variant: "primary", size: "sm", onClick: () => { void submitAdd(); }, children: t('settings.save') }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => { setRow(IDLE); }, children: t('settings.cancel') })] })] })), items.length === 0 && !row.adding
                ? _jsx("div", { className: css.empty, children: t('settings.empty') })
                : (_jsx("ul", { className: css.list, children: items.map(item => (_jsxs("li", { className: css.row, children: [_jsx("div", { className: css.rowBody, children: row.editingId === item.id
                                    ? (_jsx("textarea", { className: css.editor, value: row.draft, onChange: (event) => { setRow(current => ({ ...current, draft: event.target.value })); } }))
                                    : (_jsxs(_Fragment, { children: [_jsx("span", { className: css.text, children: item.text }), _jsx("span", { className: css.meta, children: t('settings.createdAt', { time: new Date(item.createdAt).toLocaleString() }) })] })) }), _jsx("div", { className: css.rowActions, children: row.editingId === item.id
                                    ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "primary", size: "sm", onClick: () => { void submitEdit(); }, children: t('settings.save') }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => { setRow(IDLE); }, children: t('settings.cancel') })] }))
                                    : (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", size: "sm", disabled: busy, onClick: () => { setRow({ ...IDLE, editingId: item.id, draft: item.text }); }, children: t('settings.edit') }), _jsx(Button, { variant: row.confirmingId === item.id ? 'primary' : 'ghost', size: "sm", disabled: busy, onClick: () => { void onDelete(item.id); }, children: row.confirmingId === item.id ? t('settings.confirmDelete') : t('settings.delete') })] })) })] }, item.id))) }))] }));
}
//# sourceMappingURL=FavoritesSettingsPage.js.map