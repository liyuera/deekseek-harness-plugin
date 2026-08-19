/**
 * devDock import page: enter a directory and let the agent scan candidates,
 * analyze which are frontend projects, and present the save list for
 * confirmation. The analysis and saving run through agent tools.
 */
import { useState } from 'react'
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
}

/** Full component props. */
export type ImportPageProps =
  PropsLocale<typeof NS>
  & InjectFace<ImportInjected>

/**
 * Render the import page.
 * @param props - prompt channel and translator.
 * @returns the import form.
 */
export function ImportPage({ promptAgent, t }: ImportPageProps) {
  const [dir, setDir] = useState('')
  const [sent, setSent] = useState(false)

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
        输入要导入的目录（目录本身或其直接子目录都会被扫描为候选工程），AI 将分析并列出待保存的前端工程清单。
      </p>
      <label className={css.field}>
        <span className={css.label}>目录路径</span>
        <input
          className={css.input}
          placeholder="/Users/you/Documents/projects"
          value={dir}
          onChange={(e) => { setDir(e.target.value); setSent(false) }}
        />
      </label>
      <button
        type="button"
        className={css.actionPrimary}
        onClick={start}
        disabled={dir.trim().length === 0 || sent}
      >
        {sent ? '已发送，请查看对话' : '开始分析'}
      </button>
      {sent && <p className={css.hint}>分析请求已发送给当前会话的 AI，请在对话中确认保存清单。</p>}
    </div>
  )
}
