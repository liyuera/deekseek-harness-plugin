/**
 * devDock quick-start page: edit named plans (projects with multi-selected
 * editors and one script each) and launch them through the agent.
 */
import { useMemo, useState } from 'react'
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { DevDockActions, DevDockData } from '../api.ts'
import { NS } from '../locales.ts'
import type { ProjectRecord, QuickStartItem, QuickStartPlan } from '../../schema.ts'
import css from './QuickStartPage.module.css'

/** Registration-side inject face (same shape as the drawer's). */
export interface QuickStartInjected {
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
  /** Data mutation actions. */
  actions: DevDockActions
  /** Prompt the current session to run a dev-dock action tool. */
  promptAgent: (text: string) => Promise<boolean>
}

/** Full component props. */
export type QuickStartPageProps =
  PropsLocale<typeof NS>
  & InjectFace<QuickStartInjected>

/** Editors offered for multi-selection. */
const EDITOR_CHOICES = ['WebStorm', 'VS Code', 'IntelliJ IDEA', 'Cursor', 'Sublime Text', 'HBuilderX']

/**
 * Render the quick-start page.
 * @param props - view store, data hook, actions, translator.
 * @returns the quick-start editor.
 */
export function QuickStartPage({ useDevDockData, actions, promptAgent, t }: QuickStartPageProps) {
  const settings = useDevDockData(data => data.settings)
  const projects = settings?.projects ?? []

  // Viewing state: the plan being edited plus a draft of its items. The draft
  // stays local — it only lands in settings when the user saves.
  const [planName, setPlanName] = useState<string>(settings?.quickStarts[0]?.name ?? '')
  const [draft, setDraft] = useState<QuickStartItem[]>(settings?.quickStarts[0]?.items ?? [])
  const [showPicker, setShowPicker] = useState(false)
  const [query, setQuery] = useState('')

  const plans = settings?.quickStarts ?? []
  const activePlan = plans.find((p) => p.name === planName)

  const availableProjects = useMemo(() => {
    const added = new Set(draft.map((item) => item.projectId))
    return projects.filter((p) => !added.has(p.id))
  }, [projects, draft])

  const toggleIde = (projectId: string, ide: string): void => {
    setDraft((prev) => prev.map((item) => {
      if (item.projectId !== projectId) return item
      const has = item.ides.includes(ide)
      return { ...item, ides: has ? item.ides.filter((i) => i !== ide) : [...item.ides, ide] }
    }))
  }

  const selectScript = (projectId: string, script: string): void => {
    setDraft((prev) => prev.map((item) => {
      if (item.projectId !== projectId) return item
      const next: QuickStartItem = { ...item }
      if (item.script === script) {
        delete next.script
      } else {
        next.script = script
      }
      return next
    }))
  }

  const removeItem = (projectId: string): void => {
    setDraft((prev) => prev.filter((item) => item.projectId !== projectId))
  }

  const addItems = (ids: string[]): void => {
    const items: QuickStartItem[] = ids.map((projectId) => ({ projectId, ides: [] }))
    setDraft((prev) => [...prev, ...items])
    setShowPicker(false)
    setQuery('')
  }

  const savePlan = (): void => {
    if (planName.trim().length === 0) return
    const plan: QuickStartPlan = { name: planName.trim(), items: draft }
    void actions.setQuickStartPlan(plan)
  }

  const launch = (): void => {
    const name = planName.trim()
    if (name.length === 0 || draft.length === 0) return
    void promptAgent(`使用 dev-dock_quick-start 执行一键启动方案 "${name}"`)
  }

  const projectById = (id: string): ProjectRecord | undefined => projects.find((p) => p.id === id)

  return (
    <div className={css.page}>
      <div className={css.header}>
        <span className={css.label}>{t('quickStart.planName')}</span>
        <div className={css.controlRow}>
          <Input
            className={css.input as string}
            value={planName}
            placeholder={t('quickStart.planNamePlaceholder')}
            onChange={(e) => { setPlanName(e.target.value) }}
          />
          <div className={css.headerActions}>
            <Button size="sm" onClick={savePlan} disabled={planName.trim().length === 0}>
              {t('quickStart.save')}
            </Button>
            <Button size="sm" variant="primary" onClick={launch} disabled={draft.length === 0}>
              {t('quickStart.launch')}
            </Button>
          </div>
        </div>
      </div>

      {draft.length === 0 ? (
        <p className={css.empty}>{t('quickStart.empty')}</p>
      ) : (
        <ul className={css.list}>
          {draft.map((item) => {
            const project = projectById(item.projectId)
            if (project === undefined) return null
            return (
              <li key={item.projectId} className={css.card}>
                <div className={css.cardHeader}>
                  <span className={css.name}>{project.name}</span>
                  <button
                    type="button"
                    className={css.remove}
                    aria-label={`${t('quickStart.removeItem')} ${project.name}`}
                    onClick={() => { removeItem(item.projectId) }}
                  >
                    ✕
                  </button>
                </div>
                <div className={css.editorRow}>
                  {EDITOR_CHOICES.map((ide) => {
                    const active = item.ides.includes(ide)
                    return (
                      <button
                        key={ide}
                        type="button"
                        className={active ? css.chipActive : css.chip}
                        onClick={() => { toggleIde(item.projectId, ide) }}
                      >
                        {ide}
                      </button>
                    )
                  })}
                </div>
                <div className={css.scriptRow}>
                  {Object.keys(project.scripts).map((script) => (
                    <button
                      key={script}
                      type="button"
                      className={item.script === script ? css.chipActive : css.chip}
                      onClick={() => { selectScript(item.projectId, script) }}
                    >
                      {script}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <button type="button" className={css.addButton} onClick={() => { setShowPicker(true) }}>
        {t('quickStart.addItem')}
      </button>

      <Modal
        open={showPicker}
        onClose={() => { setShowPicker(false) }}
        title={t('quickStart.addProject')}
        closeLabel={t('quickStart.cancel')}
        footer={(
          <Button variant="outline" onClick={() => { setShowPicker(false) }}>
            {t('quickStart.cancel')}
          </Button>
        )}
      >
        <div className={css.picker}>
          <Input
            value={query}
            placeholder={t('quickStart.searchPlaceholder')}
            onChange={(e) => { setQuery(e.target.value) }}
            autoFocus
          />
          <ul className={css.pickerList}>
            {availableProjects
              .filter((p) => query.trim().length === 0 || p.name.toLowerCase().includes(query.trim().toLowerCase()))
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={css.pickerRow}
                    onClick={() => { addItems([p.id]) }}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            {availableProjects.length === 0 && <li className={css.pickerEmpty}>{t('quickStart.noAvailable')}</li>}
          </ul>
        </div>
      </Modal>
      {plans.length > 0 && activePlan === undefined && planName !== '' && (
        <p className={css.hint}>{t('quickStart.unsaved', { name: planName })}</p>
      )}
    </div>
  )
}
