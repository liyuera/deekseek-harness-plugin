/**
 * devDock import page: pick a directory through the system chooser and let
 * the agent scan candidates, analyze which are frontend projects, and
 * present the save list for confirmation. The analysis and saving run
 * through agent tools.
 */
import { useState } from 'react'
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

/**
 * Render the import page.
 * @param props - prompt channel, directory picker, translator.
 * @returns the import form.
 */
export function ImportPage({ promptAgent, pickDirectory, t }: ImportPageProps) {
  const [dir, setDir] = useState('')
  const [sent, setSent] = useState(false)
  const [picking, setPicking] = useState(false)

  const pick = async (): Promise<void> => {
    setPicking(true)
    try {
      const path = await pickDirectory()
      if (path !== null) {
        setDir(path)
        setSent(false)
      }
    } finally {
      setPicking(false)
    }
  }

  const start = (): void => {
    const target = dir.trim()
    if (target.length === 0) return
    setSent(true)
    void promptAgent(
      `使用 dev-dock_scan-candidates 扫描目录 ${target}，判断其中哪些候选是前端工程`
      + `（node / uni-app / 小程序），为每个前端工程分析：类型、包管理器、Node 版本、scripts、构建命令、别名，`
      + `然后逐个调用 dev-dock_save-project 保存。保存前先在对话中列出待保存清单让用户确认。`,
    )
  }

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
        <Button size="sm" variant="outline" onClick={pick} disabled={picking}>
          {t('import.pickDir')}
        </Button>
      </div>
      <Button size="sm" variant="primary" className={css.startButton} onClick={start} disabled={dir.trim().length === 0 || sent}>
        {sent ? t('import.sent') : t('import.start')}
      </Button>
      {sent && <p className={css.hint}>{t('import.sentHint')}</p>}
    </div>
  )
}
