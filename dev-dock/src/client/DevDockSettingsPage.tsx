/**
 * devDock settings page (`settings.section`): per-workspace editor
 * preference, editor manual paths + detection refresh, and the terminal
 * preference. Data rides the settings namespace mirror; desktop detection
 * goes through the host route.
 */
import { useState } from 'react'
import { Button, IconChevronDownOutline14, Input, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { EDITOR_NAMES, type DevDockActions, type DevDockData } from './data.ts'
import { DevIdeIcon, DevTerminalIcon } from './icons.tsx'
import { NS } from './locales.ts'
import css from './DevDockSettingsPage.module.css'

/** Registration-side inject face for the settings page. */
export interface DevDockSettingsInjected {
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
  /** Data mutation and desktop actions. */
  dataActions: DevDockActions
}

/** Full component props for the settings page. */
export type DevDockSettingsPageProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<typeof NS>
  & InjectFace<DevDockSettingsInjected>

/** Stable union of editor names for the preference selects. */
const EDITOR_OPTIONS: readonly string[] = EDITOR_NAMES

/**
 * dsh-style editor pill: rounded-chrome trigger plus the primitives Menu
 * trailing-check popup (same pattern as the permission preset selector).
 * @param props - current editor, available options, change callback.
 * @returns the pill and its menu.
 */
function WorkspaceEditorSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly string[]
  onChange: (editor: string) => void
}) {
  const [open, setOpen] = useState(false)
  const items = [{ id: '', label: '自动' }, ...options.map(name => ({ id: name, label: name }))]
  const display = value === '' ? '自动' : value
  return (
    <Menu
      open={open}
      items={items}
      selectedId={value === '' ? '' : value}
      onSelect={(id) => { setOpen(false); onChange(id) }}
      onClose={() => { setOpen(false) }}
      align="end"
      side="bottom"
      anchor={(
        <button
          type="button"
          className={css.selector}
          onClick={() => { setOpen(!open) }}
        >
          <span>{display}</span>
          <span className={`${css.chevron} ${open ? css.chevronOpen : ''}`} aria-hidden>
            <IconChevronDownOutline14 />
          </span>
        </button>
      )}
    />
  )
}

/**
 * Render the devDock settings page.
 * @param props - settings runtime, data hook, actions, translator.
 * @returns the settings sections.
 */
export function DevDockSettingsPage({ useWorkspaces, useDevDockData, dataActions, t }: DevDockSettingsPageProps) {
  const workspaces = useWorkspaces(state => state.items)
  const settings = useDevDockData(data => data.settings)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')
  // Icons that failed to load (no detected path, non-macOS) fall back to the
  // generic </> glyph.
  const [iconFailed, setIconFailed] = useState<Record<string, boolean>>({})

  const prefs = settings?.workspacePrefs ?? []
  const editors = settings?.editors ?? []
  const editorNames = [...new Set([...EDITOR_OPTIONS, ...editors.map(e => e.name)])]

  const prefOf = (workspaceId: string): string => prefs.find(p => p.workspaceId === workspaceId)?.editor ?? ''

  const setPref = async (workspaceId: string, editor: string): Promise<void> => {
    // Empty editor resets the preference: the auto-detection default applies.
    await dataActions.setWorkspacePref(workspaceId, editor)
  }

  const saveManual = async (name: string, value: string): Promise<void> => {
    await dataActions.setEditorManualPath(name, value)
  }

  const refresh = async (): Promise<void> => {
    setDetecting(true)
    setDetectError('')
    const answer = await dataActions.listEditors()
    setDetecting(false)
    if (!answer.ok) setDetectError(answer.error ?? 'detection failed')
  }

  return (
    <div className={css.page}>
      <h2 className={css.heading}>{t('settings.workspacePref.title')}</h2>
      <p className={css.hint}>{t('settings.workspacePref.hint')}</p>
      {workspaces.length === 0 && <p className={css.hint}>{t('start.noWorkspace')}</p>}
      <ul className={css.rows}>
        {workspaces.map((workspace) => (
          <li key={workspace.workspaceId} className={css.row}>
            <span className={css.name}>{workspace.title || workspace.path}</span>
            <WorkspaceEditorSelect
              value={prefOf(workspace.workspaceId)}
              options={editorNames}
              onChange={(editor) => { void setPref(workspace.workspaceId, editor) }}
            />
          </li>
        ))}
      </ul>

      <h2 className={css.heading}>{t('settings.editors.title')}</h2>
      <p className={css.hint}>{t('settings.editors.hint')}</p>
      <div className={css.refreshRow}>
        <Button size="sm" variant="outline" onClick={() => { void refresh() }} disabled={detecting}>
          {detecting ? `${t('settings.editors.refresh')}…` : t('settings.editors.refresh')}
        </Button>
        {detectError !== '' && <span className={css.error} role="alert">{detectError}</span>}
      </div>
      <ul className={css.rows}>
        {editorNames.map((name) => {
          const editor = editors.find(e => e.name === name)
          // manualPath is a string when set, undefined otherwise — keep the
          // nullish chain honest so the detected path becomes the prefill.
          const manual = editor?.manualPath
          const detected = editor?.detectedPath ?? ''
          const draft = drafts[name] ?? manual ?? detected
          return (
            <li key={name} className={css.editorRow}>
              <span className={`${css.name} ${css.editorName}`}>
                {iconFailed[name] ? (
                  <DevIdeIcon size={16} />
                ) : (
                  <img
                    className={css.editorIcon}
                    src={`/dev-dock/editor-icon?editor=${encodeURIComponent(name)}`}
                    alt=""
                    onError={() => { setIconFailed(current => ({ ...current, [name]: true })) }}
                  />
                )}
                <span className={css.editorLabel}>{name}</span>
              </span>
              <Input
                className={css.editorInput as string}
                value={draft}
                placeholder={t('settings.editors.manual')}
                onChange={(event) => { setDrafts(current => ({ ...current, [name]: event.target.value })) }}
              />
              <Button size="sm" variant="outline" className={css.editorSave} onClick={() => { void saveManual(name, draft) }}>
                {t('settings.editors.save')}
              </Button>
            </li>
          )
        })}
      </ul>

      <h2 className={css.heading}>{t('settings.terminal.title')}</h2>
      {TERMINAL_APPS.map(({ key, labelKey }) => {
        const failed = iconFailed[key]
        return (
          <label key={key} className={css.radioRow}>
            <input
              type="radio"
              name="dev-dock-terminal"
              checked={(settings?.terminalApp ?? 'default') === key}
              onChange={() => { void dataActions.setTerminalApp(key as 'default' | 'iterm') }}
            />
            {failed ? <DevTerminalIcon size={16} /> : (
              <img
                className={css.editorIcon}
                src={`/dev-dock/terminal-icon?app=${key}`}
                alt=""
                onError={() => { setIconFailed(current => ({ ...current, [key]: true })) }}
              />
            )}
            <span>{t(labelKey)}</span>
          </label>
        )
      })}
    </div>
  )
}

/** Terminal preference options with their icon route keys. */
const TERMINAL_APPS = [
  { key: 'default', labelKey: 'settings.terminal.default' },
  { key: 'iterm', labelKey: 'settings.terminal.iterm' },
] as const
