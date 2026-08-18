// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { makeTranslate, workspaceListState } from '@deepseek-ai/dsh-client-test-runtime'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import type {
  SessionId, SessionListState, SessionSummary, SubagentCatalogSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  SubagentSidebarCapsule, type SubagentSidebarCapsuleProps,
} from '../src/client/SubagentSidebarCapsule.tsx'
import {
  SubagentSidebarPanel, type SubagentSidebarPanelProps,
} from '../src/client/SubagentSidebarPanel.tsx'
import { createSubagentSidebarStore } from '../src/client/stores.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const ROOT = 'root' as SessionId
const CHILD = 'child' as SessionId
const OTHER = 'other' as SessionId
const t = makeTranslate(zh)

/** Plain snapshot selector stub: `useSessions`/`useWorkspaces` are selector hooks. */
function hook<T>(snapshot: T) {
  return function select<S>(selector: (state: T) => S): S { return selector(snapshot) }
}

function summary(id: SessionId, over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id,
    displayTitle: id,
    blank: false,
    running: false,
    updatedAt: Date.now(),
    ...over,
  }
}

function catalog(over: Partial<SubagentCatalogSnapshot> = {}): SubagentCatalogSnapshot {
  return {
    entries: [
      {
        kind: 'child', id: CHILD, mode: 'continuable', label: 'worker',
        activity: 'running', hasChildren: true,
      },
      {
        kind: 'child', id: OTHER, mode: 'one-shot',
        label: 'reviewer', activity: 'inactive', hasChildren: false,
      },
      { kind: 'diagnostic', id: 'bad' as SessionId, reason: 'corrupt' },
    ],
    parentAvailable: true,
    state: 'ready',
    error: null,
    ...over,
  }
}

function sessionState(over: Partial<SessionListState> = {}): SessionListState {
  return {
    ids: [ROOT],
    byId: {
      [ROOT]: summary(ROOT, { displayTitle: 'deepseek-harness' }),
      [CHILD]: summary(CHILD, { displayTitle: 'worker', parentId: ROOT, origin: 'subagent', running: true }),
      [OTHER]: summary(OTHER, { displayTitle: 'reviewer', parentId: ROOT, origin: 'subagent' }),
    },
    current: ROOT,
    phase: 'ready',
    subagentsByParent: {
      [ROOT]: catalog(),
    },
    jobsBySession: {},
    currentAddress: undefined,
    ...over,
  }
}

function workspaceState(archived: readonly SessionId[] = []) {
  return { ...workspaceListState(), archivedSessionIds: archived }
}

function mountPanel(overrides: Partial<SubagentSidebarPanelProps> = {}) {
  const store = createSubagentSidebarStore().create()
  store.actions.setOpen(true)
  const props: SubagentSidebarPanelProps = {
    useSessions: hook(sessionState()),
    useWorkspaces: hook(workspaceState()),
    useStore: bindSnapshotSelector(store),
    actions: store.actions,
    openChild: vi.fn(),
    refresh: vi.fn(),
    setCatalogOpen: vi.fn(),
    t,
    ...overrides,
  }
  const view = render(<SubagentSidebarPanel {...props} />)
  return { view, store, props }
}

describe('SubagentSidebarCapsule', () => {
  it('renders nothing when no subagent is running', () => {
    const state = sessionState({
      byId: {
        [ROOT]: summary(ROOT, { displayTitle: 'root' }),
        [CHILD]: summary(CHILD, { parentId: ROOT, origin: 'subagent', running: false }),
      },
    })
    const store = createSubagentSidebarStore().create()
    const props: SubagentSidebarCapsuleProps = {
      useSessions: hook(state),
      useWorkspaces: hook(workspaceState()),
      useStore: bindSnapshotSelector(store),
      actions: store.actions,
      t,
    }
    const view = render(<SubagentSidebarCapsule {...props} />)
    expect(view.container.textContent).toBe('')
  })

  it('shows the running count and opens the panel on click', () => {
    const store = createSubagentSidebarStore().create()
    const actions = { ...store.actions, setOpen: vi.fn() }
    const props: SubagentSidebarCapsuleProps = {
      useSessions: hook(sessionState()),
      useWorkspaces: hook(workspaceState()),
      useStore: bindSnapshotSelector(store),
      actions,
      t,
    }
    const setOpen = actions.setOpen
    const view = render(<SubagentSidebarCapsule {...props} />)
    const button = view.getByRole('button')
    expect(button.textContent).toContain('1 个子代理运行中')
    fireEvent.click(button)
    expect(setOpen).toHaveBeenCalledWith(true)
  })
})

describe('SubagentSidebarPanel', () => {
  it('renders nothing while closed', () => {
    const store = createSubagentSidebarStore().create()
    const view = render(<SubagentSidebarPanel {...{
      useSessions: hook(sessionState()),
      useWorkspaces: hook(workspaceState()),
      useStore: bindSnapshotSelector(store),
      actions: store.actions,
      openChild: vi.fn(),
      refresh: vi.fn(),
      setCatalogOpen: vi.fn(),
      t,
    }} />)
    expect(view.container.textContent).toBe('')
  })

  it('groups direct subagents under their root session header', () => {
    const { view } = mountPanel()
    // Root header shows the session title.
    expect(view.getByRole('button', { name: /deepseek-harness/ })).toBeTruthy()
    // Catalog rows: the running child with its secondary line, the one-shot,
    // and the diagnostic row.
    expect(view.getByText('worker')).toBeTruthy()
    expect(view.getByText(/可继续 · 正在运行/)).toBeTruthy()
    expect(view.getByText('reviewer')).toBeTruthy()
    expect(view.getByText(/一次性 · 当前未运行/)).toBeTruthy()
    expect(view.getByText('bad')).toBeTruthy()
  })

  it('marks archived subagents and roots with the archived badge', () => {
    const archived = [ROOT, OTHER]
    const { view } = mountPanel({
      useWorkspaces: hook(workspaceState(archived)),
    })
    const rootHead = view.getByRole('button', { name: /deepseek-harness/ })
    expect(within(rootHead).getByText('已归档')).toBeTruthy()
    const reviewerRow = view.getByText('reviewer').closest('[role="treeitem"]')
    expect(within(reviewerRow as HTMLElement).getByText('已归档')).toBeTruthy()
  })

  it('opens the child through the address action and refreshes the catalog on open', () => {
    const { view, props } = mountPanel()
    fireEvent.click(view.getByText('worker'))
    expect(props.openChild).toHaveBeenCalledWith(ROOT, CHILD, 'continuable')
    expect(props.refresh).toHaveBeenCalledWith(ROOT)
    expect(props.setCatalogOpen).toHaveBeenCalledWith(ROOT, true)
  })

  it('filters to running rows when the onlyRunning checkbox is set', () => {
    const { view } = mountPanel()
    fireEvent.click(view.getByRole('checkbox'))
    expect(view.queryByText('reviewer')).toBeNull()
    expect(view.getByText('worker')).toBeTruthy()
  })

  it('collapses and expands a root group independently of others', () => {
    const { view } = mountPanel()
    const rootHead = view.getByRole('button', { name: /deepseek-harness/ })
    fireEvent.click(rootHead)
    expect(view.queryByText('worker')).toBeNull()
    fireEvent.click(rootHead)
    expect(view.getByText('worker')).toBeTruthy()
  })
})
