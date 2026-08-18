import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import type {
  SessionId, SessionSummary, SessionListState, SubagentCatalogSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import { indexSubagentDescendants } from '@deepseek-ai/dsh-client-runtime/client'
import {
  IconChevronRightOutline14, StateDot, type StateDotState,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-subagent/client'
import type {} from '@deepseek-ai/dsh-token-meter/client'
import { NS } from './locales.ts'
import type { createSubagentSidebarStore } from './stores.ts'
import css from './SubagentSidebarPanel.module.css'

/** Business actions supplied by the slot registration. */
export interface SubagentSidebarPanelInjected {
  openChild: (parentSessionId: SessionId, childSessionId: SessionId, mode: 'one-shot' | 'continuable') => void
  refresh: (parentSessionId: SessionId) => void
  setCatalogOpen: (parentSessionId: SessionId, open: boolean) => void
}

/** Full props for the frame-wide overview panel. */
export type SubagentSidebarPanelProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createSubagentSidebarStore>>
  & SubagentSidebarPanelInjected & PropsLocale<typeof NS>

type CatalogEntry = SubagentCatalogSnapshot['entries'][number]
type Catalogs = SessionListState['subagentsByParent']

/* jscpd:ignore-start -- display-contract helpers, identical to ui-subagent's catalog row formatting (no cross-package imports) */
/** Compact token count shared in shape with the conversation stats strip. */
function formatTokens(value: number): string {
  const scaled = (next: number): string => next >= 100
    ? String(Math.round(next))
    : String(Math.round(next * 10) / 10)
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return `${scaled(value / 1_000)}K`
  return `${scaled(value / 1_000_000)}M`
}

/** Sum the four disjoint durable provider-usage buckets. */
function tokenTotal(summary: SessionSummary | undefined): number | undefined {
  const usage = summary?.projectionValues?.tokenUsage
  return usage === undefined
    ? undefined
    : usage.uncachedInputTokens + usage.outputTokens
      + usage.cacheReadTokens + usage.cacheWriteTokens
}

/** Exact whole-second active-turn duration for one catalog row. */
function activityDuration(
  summary: SessionSummary | undefined,
  activity: 'running' | 'inactive',
  now: number,
): number | undefined {
  if (summary === undefined) return undefined
  const timing = summary.projectionValues?.subagentTiming
  if (timing === undefined) return undefined
  if (timing.active === undefined) return timing.settledMs
  const end = activity === 'running' ? now : timing.active.through
  return timing.settledMs + Math.max(0, end - timing.active.since)
}

/** Human activity word for the row summary line. */
function activityLabel(activity: 'running' | 'inactive', t: TranslateNS<typeof NS>): string {
  return activity === 'running' ? t('row.running') : t('row.notRunning')
}

/** Dot semantics mirror the official catalog: driver running vs settled. */
function dotState(activity: 'running' | 'inactive'): StateDotState {
  return activity === 'running' ? 'ongoing' : 'done'
}

interface SharedRenderProps {
  byId: Readonly<Record<SessionId, SessionSummary>>
  catalogs: Catalogs
  descendants: ReadonlyMap<SessionId, { count: number; runningCount: number }>
  archived: ReadonlySet<SessionId>
  onlyRunning: boolean
  now: number
  openChild: SubagentSidebarPanelInjected['openChild']
  refresh: SubagentSidebarPanelInjected['refresh']
  setCatalogOpen: SubagentSidebarPanelInjected['setCatalogOpen']
  actions: PropsStore<ReturnType<typeof createSubagentSidebarStore>>['actions']
  t: TranslateNS<typeof NS>
}

/**
 * Frame-wide subagent overview panel: every root session's direct subagent
 * catalog, grouped under collapsible root headers that are independent of
 * each other. Rows follow the official catalog layout — state dot, label,
 * `title · mode · activity` secondary line, token/duration metrics — and
 * branches expand lazily through the catalog mirror like the shipped header
 * action. Opening the panel subscribes every root's catalog; closing
 * unsubscribes all of them.
 * @param props - overlay runtime hooks, store share, catalog actions, translator.
 * @returns the panel, or null while closed.
 */
export function SubagentSidebarPanel({
  useSessions, useWorkspaces, useStore, actions,
  openChild, refresh, setCatalogOpen, t,
}: SubagentSidebarPanelProps) {
  const byId = useSessions(state => state.byId)
  const catalogs = useSessions(state => state.subagentsByParent)
  const archivedSessionIds = useWorkspaces(state => state.archivedSessionIds)
  const { open, collapsedRoots, collapsedNodes, onlyRunning } = useStore(state => state)
  const [now, setNow] = useState(() => Date.now())

  // Root sessions: top-level rows (no subagent origin, no parent).
  const roots = useMemo(
    () => Object.values(byId)
      .filter(summary => summary.origin !== 'subagent' && summary.parentId === undefined)
      .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle)),
    [byId],
  )
  const descendants = useMemo(() => indexSubagentDescendants(byId), [byId])
  const archived = useMemo(() => new Set(archivedSessionIds), [archivedSessionIds])

  // Subscribe every root's catalog while open; unsubscribe on close so the
  // manager stops refreshing them (the official push-based freshness model).
  useEffect(() => {
    if (!open) return
    for (const root of roots) {
      setCatalogOpen(root.id, true)
      refresh(root.id)
    }
    return () => {
      for (const root of roots) setCatalogOpen(root.id, false)
    }
  }, [open, roots, setCatalogOpen, refresh])

  // The clock only runs while the panel shows something that moves.
  useEffect(() => {
    if (!open) return
    const anyRunning = Object.values(byId)
      .some(summary => summary.origin === 'subagent' && summary.running)
    if (!anyRunning) return
    setNow(Date.now())
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [open, byId])

  if (!open) return null

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]:not([aria-disabled="true"])'),
    )
    const index = items.indexOf(event.target as HTMLElement)
    let next = -1
    if (event.key === 'ArrowDown') next = index + 1
    else if (event.key === 'ArrowUp') next = index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else if (event.key === 'Escape') {
      event.preventDefault()
      actions.setOpen(false)
      return
    }
    if (next >= 0 && next < items.length) {
      event.preventDefault()
      items[next]?.focus()
    }
  }

  const shared: SharedRenderProps = {
    byId, catalogs, descendants, archived, onlyRunning, now,
    openChild, refresh, setCatalogOpen, actions, t,
  }
  const totalSubagents = Object.values(byId)
    .filter(summary => summary.origin === 'subagent').length
  const runningSubagents = Object.values(byId)
    .filter(summary => summary.origin === 'subagent' && summary.running).length

  return (
    <aside
      className={css.panel}
      aria-label={t('panel.aria')}
      onKeyDown={onKeyDown}
    >
      <div className={css.head}>
        <span className={css.title}>{t('panel.title')}</span>
        <span className={css.counts}>
          <span>{t('panel.total', { total: String(totalSubagents) })}</span>
          <span>{t('panel.running', { running: String(runningSubagents) })}</span>
        </span>
        <button
          type="button"
          className={css.close}
          title={t('panel.close')}
          onClick={() => { actions.setOpen(false) }}
        >
          ✕
        </button>
      </div>
      <label className={css.filter}>
        <input
          type="checkbox"
          checked={onlyRunning}
          onChange={(event) => { actions.setOnlyRunning(event.target.checked) }}
        />
        {t('filter.runningOnly')}
      </label>
      <div className={css.body}>
        {roots.length === 0
          ? <div className={css.empty}>{t('panel.empty')}</div>
          : roots.map(root => (
            <RootGroup
              key={root.id}
              root={root}
              shared={shared}
              collapsedRoots={collapsedRoots}
              collapsedNodes={collapsedNodes}
            />
          ))}
      </div>
    </aside>
  )
}

interface RootGroupProps {
  root: SessionSummary
  shared: SharedRenderProps
  collapsedRoots: readonly SessionId[]
  collapsedNodes: readonly SessionId[]
}

/** One root session's group: header row plus its lazy subagent catalog tree. */
function RootGroup({ root, shared, collapsedRoots, collapsedNodes }: RootGroupProps) {
  const { byId, catalogs, descendants, archived, onlyRunning, actions, t } = shared
  const total = descendants.get(root.id)?.count ?? 0
  const running = descendants.get(root.id)?.runningCount ?? 0
  const isCollapsed = collapsedRoots.includes(root.id)
  const countKey = total === 1 ? 'root.count.one' : 'root.count.other'

  const renderChildren = (parentSessionId: SessionId, level: number): React.ReactNode => {
    const entries = catalogs[parentSessionId]?.entries ?? []
    const visible = onlyRunning
      ? entries.filter(entry => entry.kind === 'child' && byId[entry.id]?.running)
      : entries
    return (
      <div role="group">
        {visible.map(entry => (
          <CatalogRow
            key={entry.id}
            entry={entry}
            parentSessionId={parentSessionId}
            level={level}
            shared={shared}
            collapsedNodes={collapsedNodes}
          />
        ))}
      </div>
    )
  }

  return (
    <section className={css.root}>
      <button
        type="button"
        className={css.rootHead}
        aria-expanded={!isCollapsed}
        aria-label={t(isCollapsed ? 'root.expand' : 'root.collapse', { title: root.displayTitle })}
        onClick={() => { actions.toggleRoot(root.id) }}
      >
        <IconChevronRightOutline14 className={clsx(css.chevron, !isCollapsed && css.chevronOpen)} />
        <span className={css.rootTitle}>{root.displayTitle}</span>
        {archived.has(root.id) && <span className={css.badge}>{t('row.archived')}</span>}
        <span className={css.rootCounts}>
          <span>{t(countKey, { count: String(total) })}</span>
          {running > 0 && <span className={css.runningCount}>{t('root.runningCount', { count: String(running) })}</span>}
        </span>
      </button>
      {!isCollapsed && renderChildren(root.id, 1)}
    </section>
  )
}

interface CatalogRowProps {
  entry: CatalogEntry
  parentSessionId: SessionId
  level: number
  shared: SharedRenderProps
  collapsedNodes: readonly SessionId[]
}

/** One catalog row: dot, label, secondary, metrics, and a lazy disclosure. */
function CatalogRow({ entry, parentSessionId, level, shared, collapsedNodes }: CatalogRowProps) {
  const { byId, catalogs, archived, onlyRunning, now,
    openChild, actions, t } = shared

  if (entry.kind === 'diagnostic') {
    return (
      <div role="treeitem" aria-disabled="true" aria-level={level} className={clsx(css.row, css.disabled)}>
        <span className={css.disclosureSpace} />
        <StateDot state="error" />
        <span className={css.content}>
          <span className={css.label}>{entry.id}</span>
        </span>
      </div>
    )
  }

  const summary = byId[entry.id]
  const label = entry.label ?? entry.id
  const isCollapsed = collapsedNodes.includes(entry.id)
  const mode = entry.mode === 'continuable' ? t('row.continuable') : t('row.oneShot')
  const secondary = [summary?.title, mode, activityLabel(entry.activity, t)]
    .filter(value => value !== undefined)
    .join(' · ')
  const totalTokens = tokenTotal(summary)
  const durationMs = activityDuration(summary, entry.activity, now)
  const metrics = [
    totalTokens === undefined ? undefined : `${formatTokens(totalTokens)} tok`,
    durationMs === undefined ? undefined : formatDuration(durationMs, t),
  ].filter(value => value !== undefined).join(' · ')

  const open = (): void => {
    openChild(parentSessionId, entry.id, entry.mode)
  }
  const handleKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      open()
    } else if (
      (event.key === 'ArrowRight' && entry.hasChildren && isCollapsed)
      || (event.key === 'ArrowLeft' && entry.hasChildren && !isCollapsed)
    ) {
      event.preventDefault()
      event.stopPropagation()
      actions.toggleNode(entry.id)
    }
  }
  const toggle = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    actions.toggleNode(entry.id)
  }

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        aria-level={level}
        aria-expanded={entry.hasChildren ? !isCollapsed : undefined}
        className={clsx(css.row, archived.has(entry.id) && css.rowArchived)}
        onClick={open}
        onKeyDown={handleKey}
      >
        {entry.hasChildren
          ? (
            <button
              type="button"
              tabIndex={-1}
              className={clsx(css.disclosure, !isCollapsed && css.disclosureOpen)}
              aria-label={t(isCollapsed ? 'row.expand' : 'row.collapse')}
              onClick={toggle}
            >
              <IconChevronRightOutline14 />
            </button>
          )
          : <span className={css.disclosureSpace} />}
        <StateDot state={dotState(entry.activity)} />
        <span className={css.content}>
          <span className={css.labelRow}>
            <span className={css.label}>{label}</span>
            {archived.has(entry.id) && <span className={css.badge}>{t('row.archived')}</span>}
          </span>
          <span className={css.summary}>{secondary}</span>
          {metrics !== '' && <span className={css.metrics}>{metrics}</span>}
        </span>
      </div>
      {entry.hasChildren && !isCollapsed && (
        <div role="group">
          {(catalogs[entry.id]?.entries ?? [])
            .filter(child => !onlyRunning || (child.kind === 'child' && byId[child.id]?.running))
            .map(child => (
              <CatalogRow
                key={child.id}
                entry={child}
                parentSessionId={entry.id}
                level={level + 1}
                shared={shared}
                collapsedNodes={collapsedNodes}
              />
            ))}
        </div>
      )}
    </div>
  )
}

/** Format a duration with decreasing visual precision at larger scales. */
function formatDuration(ms: number, t: TranslateNS<typeof NS>): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1_000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const seconds = totalSeconds % 60
  const minutes = totalMinutes % 60
  const hours = totalHours % 24
  const days = Math.floor(totalHours / 24)
  if (days >= 365) {
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    return months === 0 ? t('duration.years', { years }) : t('duration.yearsMonths', { years, months })
  }
  if (days >= 30) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    return remainingDays === 0 ? t('duration.months', { months }) : t('duration.monthsDays', { months, days: remainingDays })
  }
  if (days > 0) return hours === 0 ? t('duration.days', { days }) : t('duration.daysHours', { days, hours })
  if (totalHours > 0) {
    return t('duration.hours', {
      hours,
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    })
  }
  if (totalMinutes > 0) {
    return t('duration.minutes', {
      minutes: totalMinutes,
      seconds: String(seconds).padStart(2, '0'),
    })
  }
  return t('duration.seconds', { seconds })
}
/* jscpd:ignore-end */
