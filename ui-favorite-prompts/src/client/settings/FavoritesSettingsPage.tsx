/** Settings page managing the saved-prompt list. */
import { useState, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
// Type-only: the settings shell's SlotMap merge that declares `settings.section`.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { FavoritesActions, FavoritesState } from '../store.ts'
import { NS } from '../locales.ts'
import css from './FavoritesSettingsPage.module.css'

/** Business face injected into the settings registration. */
export interface FavoritesSettingsInjected {
  hooks: { favorites: SnapshotStore<FavoritesState> }
  actions: FavoritesActions
}

/** Composed props of the settings page. */
export type FavoritesSettingsProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<typeof NS>
  & InjectFace<FavoritesSettingsInjected>

/** Which row is being edited, which awaits delete confirmation, and the draft. */
interface RowState {
  editingId: string | null
  draft: string
  confirmingId: string | null
  adding: boolean
  /** Name draft of the row being edited. */
  draftName: string
}

/** No row is open. */
const IDLE: RowState = { editingId: null, draft: '', confirmingId: null, adding: false, draftName: '' }

/**
 * Render the management page: edit, delete, and add saved prompts.
 * @param props - favorites hook and actions, plus the locale seat.
 * @returns the page body.
 */
export function FavoritesSettingsPage({ useFavorites, actions, t }: FavoritesSettingsProps): ReactNode {
  const status = useFavorites(state => state.status)
  const error = useFavorites(state => state.error)
  const items = useFavorites(state => state.items)
  const [row, setRow] = useState<RowState>(IDLE)
  const [renameError, setRenameError] = useState<string | null>(null)

  const submitEdit = async (): Promise<void> => {
    if (row.editingId === null || row.draft.trim() === '') return
    const current = items.find(item => item.id === row.editingId)
    const name = row.draftName.trim()
    setRenameError(null)
    if (name !== '' && name !== current?.name) {
      const renamed = await actions.rename(row.editingId, name)
      // A rejected name keeps the row open with the reason, so the draft is not
      // silently rewritten or lost.
      if (!renamed.ok) {
        setRenameError(renamed.error)
        return
      }
    }
    await actions.update(row.editingId, row.draft)
    setRow(IDLE)
  }

  const submitAdd = async (): Promise<void> => {
    if (row.draft.trim() === '') return
    await actions.add(row.draft)
    setRow(IDLE)
  }

  const onDelete = async (id: string): Promise<void> => {
    if (row.confirmingId !== id) {
      setRow({ ...IDLE, confirmingId: id })
      return
    }
    await actions.remove(id)
    setRow(IDLE)
  }

  if (status === 'loading') return <div className={css.notice}>{t('settings.loading')}</div>
  if (status === 'error') return <div className={css.notice}>{t('settings.unavailable', { reason: error ?? '' })}</div>

  const busy = row.editingId !== null || row.adding

  return (
    <div className={css.page}>
      {renameError !== null && (
        <div className={css.notice} role="alert">{t('settings.renameFailed', { reason: renameError })}</div>
      )}
      <div className={css.toolbar}>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => { setRow({ ...IDLE, adding: true }) }}
        >
          {t('settings.new')}
        </Button>
      </div>

      {row.adding && (
        <div className={css.rowBody}>
          <textarea
            className={css.editor}
            aria-label={t('settings.text')}
            value={row.draft}
            placeholder={t('settings.placeholder')}
            onChange={(event) => { setRow(current => ({ ...current, draft: event.target.value })) }}
          />
          <div className={css.rowActions}>
            <Button variant="primary" size="sm" onClick={() => { void submitAdd() }}>{t('settings.save')}</Button>
            <Button variant="ghost" size="sm" onClick={() => { setRow(IDLE) }}>{t('settings.cancel')}</Button>
          </div>
        </div>
      )}

      {items.length === 0 && !row.adding
        ? <div className={css.empty}>{t('settings.empty')}</div>
        : (
          <ul className={css.list}>
            {items.map(item => (
              <li key={item.id} className={css.row}>
                <div className={css.rowBody}>
                  {row.editingId === item.id
                    ? (
                      <>
                        <input
                          className={css.nameInput}
                          aria-label={t('settings.name')}
                          placeholder={t('settings.namePlaceholder')}
                          value={row.draftName}
                          onChange={(event) => { setRow(current => ({ ...current, draftName: event.target.value })) }}
                        />
                        <textarea
                          className={css.editor}
                          aria-label={t('settings.text')}
                          value={row.draft}
                          onChange={(event) => { setRow(current => ({ ...current, draft: event.target.value })) }}
                        />
                      </>
                    )
                    : (
                      <>
                        <span className={css.text}>{item.text}</span>
                        <span className={css.meta}>
                          {item.name === undefined ? '' : `@${item.name} · `}
                          {t('settings.createdAt', { time: new Date(item.createdAt).toLocaleString() })}
                        </span>
                      </>
                    )}
                </div>
                <div className={css.rowActions}>
                  {row.editingId === item.id
                    ? (
                      <>
                        <Button variant="primary" size="sm" onClick={() => { void submitEdit() }}>
                          {t('settings.save')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setRow(IDLE) }}>
                          {t('settings.cancel')}
                        </Button>
                      </>
                    )
                    : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => { setRenameError(null); setRow({ ...IDLE, editingId: item.id, draft: item.text, draftName: item.name ?? '' }) }}
                        >
                          {t('settings.edit')}
                        </Button>
                        <Button
                          variant={row.confirmingId === item.id ? 'primary' : 'ghost'}
                          size="sm"
                          disabled={busy}
                          onClick={() => { void onDelete(item.id) }}
                        >
                          {row.confirmingId === item.id ? t('settings.confirmDelete') : t('settings.delete')}
                        </Button>
                      </>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
