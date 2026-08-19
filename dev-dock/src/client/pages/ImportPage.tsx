/**
 * devDock import page: pick a directory through the system chooser and let
 * the agent scan candidates, analyze which are frontend projects, and
 * present the save list for confirmation. The analysis and saving run
 * through agent tools; the page shows a waiting skeleton and detects
 * completion through the project-registry count.
 */
import { useEffect, useRef, useState } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { DevDockData } from '../api.ts'
import { NS } from '../locales.ts'
import css from './ImportPage.module.css'

/** Registration-side inject face (same shape as the drawer's). */
export interface ImportInjected {
  hooks: {
    /** Settings snapshot bound by the renderer as useDevDockData. */
    devDockData: { getSnapshot(): DevDockData; subscribe(fn: () => void): () => void }
  }
  /** Prompt the current session to run a dev-dock action tool. */
  promptAgent: (text: string) => Promise<boolean>
  /** Open the host's native single-directory chooser; null when cancelled. */
  pickDirectory: () => Promise<string | null>
}

/** Full component props. */
export type ImportPageProps =
  PropsLocale<typeof NS>
  & InjectFace<ImportInjected>

/** Import flow status. */
type ImportStatus = 'idle' | 'waiting' | 'done' | 'error'

/** Skeleton rows shown while the agent analyzes. */
const SKELETON_ROWS = 3

/**
 * Render the import page.
 * @param props - prompt channel, directory picker, data hook, translator.
 * @returns the import form.
 */
export function ImportPage({ useDevDockData, promptAgent, pickDirectory, t }: ImportPageProps) {
  const settings = useDevDockData(data => data.settings)
  const [dir, setDir] = useState('')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const [picking, setPicking] = useState(false)
  // Project count before the request: completion is the registry growing.
  const baseCountRef = useRef(0)

  const pick = async (): Promise<void> => {
    setPicking(true)
    try {
      const path = await pickDirectory()
      if (path !== null) {
        setDir(path)
        setStatus('idle')
        setError('')
      }
    } finally {
      setPicking(false)
    }
  }

  const start = async (): Promise<void> => {
    const target = dir.trim()
    if (target.length === 0) return
    baseCountRef.current = settings?.projects.length ?? 0
    const ok = await promptAgent(
      `使用 dev-dock_scan-candidates 扫描目录 ${target}，判断其中哪些候选是前端工程`
      + `（node / uni-app / 小程序），为每个前端工程分析：类型、包管理器、Node 版本、scripts、构建命令、别名，`
      + `然后逐个调用 dev-dock_save-project 保存。保存前先在对话中列出待保存清单让用户确认。`,
    )
    if (!ok) {
      setStatus('error')
      setError(t('import.noSession'))
      return
    }
    setStatus('waiting')
  }

  // Completion detection: once waiting, a growing registry means the agent
  // saved projects; the state settles into the done banner.
  useEffect(() => {
    if (status !== 'waiting') return
    const count = settings?.projects.length ?? 0
    if (count > baseCountRef.current) {
      setSavedCount(count - baseCountRef.current)
      setStatus('done')
    }
  }, [settings, status])

  const busy = status === 'waiting'

  return (
    <div className={css.page}>
      <h2 className={css.title}>{t('drawer.tab.import')}</h2>
      <p className={css.desc}>
        选择一个目录（目录本身或其直接子目录都会被扫描为候选工程），AI 将分析并列出待保存的前端工程清单。
      </p>
      <span className={css.label}>{t('import.dirLabel')}</span>
      <div className={css.controlRow}>
        <Input
          className={css.input as string}
          value={dir}
          readOnly
          placeholder={t('import.noDir')}
          onClick={pick}
        />
        <Button size="sm" variant="outline" onClick={pick} disabled={picking || busy}>
          {t('import.pickDir')}
        </Button>
      </div>
      <Button
        size="sm"
        variant="primary"
        className={css.startButton}
        onClick={() => { void start() }}
        disabled={dir.trim().length === 0 || busy}
      >
        {t('import.start')}
      </Button>

      {status === 'waiting' && (
        <div className={css.waiting} role="status">
          <div className={css.skeletonList}>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <div key={i} className={css.skeletonRow} />
            ))}
          </div>
          <p className={css.hint}>{t('import.waiting')}</p>
        </div>
      )}
      {status === 'done' && (
        <p className={css.hint} role="status">
          {t('import.done', { count: String(savedCount) })}
        </p>
      )}
      {status === 'error' && (
        <p className={css.error} role="alert">{error}</p>
      )}
    </div>
  )
}
