/**
 * devDock projects page: the registered project list with per-project
 * actions (open in terminal / IDE via the agent, remove from registry).
 */
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { DevDockActions, DevDockData } from '../api.ts'
import { NS, type DevDockKey } from '../locales.ts'
import type { DevDockPage } from '../stores.ts'
import type { ProjectRecord } from '../../schema.ts'
import css from './ProjectListPage.module.css'

/** Registration-side inject face (same shape as the drawer's). */
export interface ProjectListInjected {
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
export type ProjectListPageProps =
  PropsLocale<typeof NS>
  & InjectFace<ProjectListInjected>
  & {
    /** Navigate to another drawer page. */
    onNavigate: (page: DevDockPage) => void
  }

/** Project kind label key. */
const TYPE_KEYS: Record<ProjectRecord['type'], DevDockKey> = {
  node: 'project.type.node',
  uniapp: 'project.type.uniapp',
  miniapp: 'project.type.miniapp',
}

/**
 * Render the projects page.
 * @param props - data hook, actions, navigator, translator.
 * @returns the project list.
 */
export function ProjectListPage({ useDevDockData, actions, promptAgent, onNavigate, t }: ProjectListPageProps) {
  const settings = useDevDockData(data => data.settings)

  const remove = async (project: ProjectRecord): Promise<void> => {
    if (!window.confirm(t('project.remove.confirm', { name: project.name }))) return
    await actions.removeProject(project.id)
  }

  const openTerminal = (project: ProjectRecord): void => {
    void promptAgent(`使用 dev-dock_open-terminal 打开项目 ${project.name}（id=${project.id}）的终端`)
  }

  const openIde = (project: ProjectRecord): void => {
    void promptAgent(`使用 dev-dock_open-ide 用编辑器打开项目 ${project.name}（id=${project.id}）`)
  }

  return (
    <div className={css.page}>
      <div className={css.header}>
        <h2 className={css.title}>{t('drawer.title')}</h2>
        <span className={css.count}>{t('entry.projects', { count: String(settings?.projects.length ?? 0) })}</span>
      </div>
      {settings === undefined ? (
        <p className={css.empty}>{t('drawer.loading')}</p>
      ) : settings.projects.length === 0 ? (
        <p className={css.empty}>{t('projects.empty')}</p>
      ) : (
        <ul className={css.list}>
          {settings.projects.map((project) => (
            <li key={project.id} className={css.card}>
              <div className={css.cardHeader}>
                <span className={css.name} title={project.path}>{project.name}</span>
                <span className={css.badge}>{t(TYPE_KEYS[project.type])}</span>
              </div>
              <div className={css.meta}>
                <span className={css.pm}>{project.packageManager}</span>
                <span className={css.scripts}>{t('project.scripts', { count: String(Object.keys(project.scripts).length) })}</span>
              </div>
              <div className={css.cardActions}>
                <button type="button" className={css.action} onClick={() => { void openTerminal(project) }}>
                  {t('project.openTerminal')}
                </button>
                <button type="button" className={css.action} onClick={() => { void openIde(project) }}>
                  {t('project.openIde')}
                </button>
                <button type="button" className={css.actionDanger} onClick={() => { void remove(project) }}>
                  {t('project.remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={css.importButton}
        onClick={() => { onNavigate('import') }}
      >
        {t('projects.import')}
      </button>
    </div>
  )
}
