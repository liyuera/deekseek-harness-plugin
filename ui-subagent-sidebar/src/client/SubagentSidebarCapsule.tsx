import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { NS } from './locales.ts'
import type { createSubagentSidebarStore } from './stores.ts'
import css from './SubagentSidebarCapsule.module.css'

/** Full props for the frame-wide running-count capsule. */
export type SubagentSidebarCapsuleProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createSubagentSidebarStore>>
  & PropsLocale<typeof NS>

/**
 * Frame-wide running-count capsule: one entry in `shell.overlay` that shows
 * how many subagent sessions are running anywhere, and opens the overview
 * panel on click. Renders nothing when nothing runs, so an idle host keeps
 * the corner clean.
 * @param props - overlay runtime hooks, shared store, translator.
 * @returns the capsule button, or null when no subagent is running.
 */
export function SubagentSidebarCapsule({ useSessions, actions, t }: SubagentSidebarCapsuleProps) {
  const runningCount = useSessions(state => Object.values(state.byId)
    .filter(summary => summary.origin === 'subagent' && summary.running).length)
  if (runningCount === 0) return null

  const countKey = runningCount === 1 ? 'capsule.label.one' : 'capsule.label.other'
  return (
    <button
      type="button"
      className={css.capsule}
      title={t('capsule.title')}
      onClick={() => { actions.setOpen(true) }}
    >
      <StateDot state="ongoing" className={css.dot} />
      <span>{t(countKey, { count: String(runningCount) })}</span>
    </button>
  )
}
