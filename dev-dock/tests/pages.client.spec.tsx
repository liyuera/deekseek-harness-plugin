// @vitest-environment jsdom
/**
 * devDock page component tests: render with realistic props and assert
 * user-visible behavior (list rows, actions, quick-start plan editing).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'

afterEach(() => { cleanup() })
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { DevDockEntry } from '../src/client/DevDockEntry.tsx'
import { ProjectListPage } from '../src/client/pages/ProjectListPage.tsx'
import { QuickStartPage } from '../src/client/pages/QuickStartPage.tsx'
import { ImportPage } from '../src/client/pages/ImportPage.tsx'
import { NS, zh, type DevDockKey } from '../src/client/locales.ts'
import type { DevDockData } from '../src/client/api.ts'
import type { DevDockSettings } from '../src/schema.ts'

/** Minimal translator bound to the zh dictionary. */
const t: TranslateNS<typeof NS> = ((key: DevDockKey, params?: Record<string, string>) => {
  let text = zh[key]
  if (params !== undefined) {
    for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, v)
  }
  return text
}) as TranslateNS<typeof NS>

/** Data hook stub returning a fixed snapshot. */
function dataHookOf(settings: DevDockSettings | undefined) {
  const data: DevDockData = { ready: settings !== undefined, settings }
  return (selector: (d: DevDockData) => unknown): unknown => selector(data)
}

function settingsDoc(): DevDockSettings {
  return {
    projects: [
      {
        id: '1', name: 'app', path: '/tmp/app', type: 'node',
        packageManager: 'pnpm', scripts: { dev: 'vite', build: 'vite build' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2', name: 'mini', path: '/tmp/mini', type: 'uniapp',
        packageManager: 'npm', scripts: {},
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ],
    editors: [],
    quickStarts: [],
    terminalApp: 'default',
  }
}

describe('DevDockEntry', () => {
  const baseProps = {
    wide: true,
    actions: { setOpen: vi.fn() } as never,
    useDevDockData: dataHookOf(settingsDoc()) as never,
    t,
  }

  it('renders the title and project count in wide mode', () => {
    render(<DevDockEntry {...baseProps} />)
    expect(screen.getByText('devDock')).toBeTruthy()
    expect(screen.getByText('2 个项目')).toBeTruthy()
  })

  it('opens the drawer on click', () => {
    const setOpen = vi.fn()
    render(<DevDockEntry {...baseProps} actions={{ setOpen } as never} />)
    fireEvent.click(screen.getByRole('button'))
    expect(setOpen).toHaveBeenCalledWith(true)
  })

  it('renders a compact rail icon when collapsed', () => {
    const { container } = render(<DevDockEntry {...baseProps} wide={false} />)
    expect(container.querySelector('[aria-label="devDock"]')).toBeTruthy()
  })
})

describe('ProjectListPage', () => {
  const baseProps = {
    useDevDockData: dataHookOf(settingsDoc()) as never,
    actions: {
      removeProject: vi.fn(async () => {}),
      saveProject: vi.fn(async () => {}),
      setEditors: vi.fn(async () => {}),
      setQuickStarts: vi.fn(async () => {}),
      setQuickStartPlan: vi.fn(async () => {}),
      promptAgent: vi.fn(async () => true),
    } as never,
    promptAgent: vi.fn(async () => true) as never,
    onNavigate: vi.fn() as never,
    t,
  }

  it('lists projects with their badges and script counts', () => {
    render(<ProjectListPage {...baseProps} />)
    expect(screen.getByText('app')).toBeTruthy()
    expect(screen.getByText('mini')).toBeTruthy()
    expect(screen.getByText('Node')).toBeTruthy()
    expect(screen.getByText('UniApp')).toBeTruthy()
    expect(screen.getByText('2 个脚本')).toBeTruthy()
  })

  it('prompts the agent for the terminal action', () => {
    const promptAgent = vi.fn(async () => true)
    render(<ProjectListPage {...baseProps} promptAgent={promptAgent as never} />)
    fireEvent.click(screen.getAllByText('终端')[0])
    expect(promptAgent).toHaveBeenCalledWith(expect.stringContaining('dev-dock_open-terminal'))
  })

  it('removes a project after confirmation', () => {
    const removeProject = vi.fn(async () => {})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProjectListPage {...baseProps} actions={{ ...baseProps.actions, removeProject } as never} />)
    fireEvent.click(screen.getAllByText('删除')[0])
    expect(removeProject).toHaveBeenCalledWith('1')
    vi.restoreAllMocks()
  })

  it('navigates to the import page', () => {
    const onNavigate = vi.fn()
    render(<ProjectListPage {...baseProps} onNavigate={onNavigate as never} />)
    fireEvent.click(screen.getByText('导入'))
    expect(onNavigate).toHaveBeenCalledWith('import')
  })
})

describe('QuickStartPage', () => {
  const baseProps = {
    useDevDockData: dataHookOf(settingsDoc()) as never,
    actions: {
      removeProject: vi.fn(async () => {}),
      saveProject: vi.fn(async () => {}),
      setEditors: vi.fn(async () => {}),
      setQuickStarts: vi.fn(async () => {}),
      setQuickStartPlan: vi.fn(async () => {}),
      promptAgent: vi.fn(async () => true),
    } as never,
    promptAgent: vi.fn(async () => true) as never,
    t,
  }

  it('shows the empty state without plans', () => {
    render(<QuickStartPage {...baseProps} />)
    expect(screen.getByText(/暂无项目/)).toBeTruthy()
  })

  it('adds a project to the draft plan', () => {
    render(<QuickStartPage {...baseProps} />)
    fireEvent.click(screen.getByText('添加项目'))
    fireEvent.click(screen.getByText('app'))
    expect(screen.getByText('app')).toBeTruthy()
    expect(screen.getByText('dev')).toBeTruthy()
    expect(screen.getByText('build')).toBeTruthy()
  })

  it('saves the plan through the data actions', async () => {
    const setQuickStartPlan = vi.fn(async () => {})
    render(<QuickStartPage {...baseProps} actions={{ ...baseProps.actions, setQuickStartPlan } as never} />)
    fireEvent.click(screen.getByText('添加项目'))
    fireEvent.click(screen.getByText('app'))
    const nameInput = screen.getByPlaceholderText('plan name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'daily' } })
    fireEvent.click(screen.getByText('保存'))
    expect(setQuickStartPlan).toHaveBeenCalledWith({
      name: 'daily',
      items: [{ projectId: '1', ides: [] }],
    })
  })

  it('launches through the agent with the plan name', () => {
    const promptAgent = vi.fn(async () => true)
    render(<QuickStartPage {...baseProps} promptAgent={promptAgent as never} />)
    fireEvent.click(screen.getByText('添加项目'))
    fireEvent.click(screen.getByText('app'))
    const nameInput = screen.getByPlaceholderText('plan name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'daily' } })
    fireEvent.click(screen.getByText('启动'))
    expect(promptAgent).toHaveBeenCalledWith(expect.stringContaining('dev-dock_quick-start'))
    expect(promptAgent).toHaveBeenCalledWith(expect.stringContaining('daily'))
  })
})

describe('ImportPage', () => {
  /** Mutable settings doc; the hook returns the live object so growth is visible. */
  function makeDoc(): DevDockSettings {
    return {
      projects: [],
      editors: [],
      quickStarts: [],
      terminalApp: 'default',
    }
  }

  function baseProps(doc: DevDockSettings) {
    const data: DevDockData = { ready: true, settings: doc }
    return {
      useDevDockData: ((selector: (d: DevDockData) => unknown) => selector(data)) as never,
      promptAgent: vi.fn(async () => true) as never,
      pickDirectory: vi.fn(async () => '/tmp/projects') as never,
      t,
    }
  }

  it('picks a directory and enables the analysis button', async () => {
    const doc = makeDoc()
    const pickDirectory = vi.fn(async () => '/tmp/projects')
    render(<ImportPage {...baseProps(doc)} pickDirectory={pickDirectory as never} />)
    fireEvent.click(screen.getByText('选择目录'))
    await screen.findByDisplayValue('/tmp/projects')
    const start = screen.getByText('开始分析') as HTMLButtonElement
    expect(start.disabled).toBe(false)
  })

  it('shows an error when no session accepts the prompt', async () => {
    const doc = makeDoc()
    const promptAgent = vi.fn(async () => false)
    render(<ImportPage {...baseProps(doc)} promptAgent={promptAgent as never} />)
    fireEvent.click(screen.getByText('选择目录'))
    await screen.findByDisplayValue('/tmp/projects')
    fireEvent.click(screen.getByText('开始分析'))
    expect(promptAgent).toHaveBeenCalledWith(expect.stringContaining('dev-dock_scan-candidates'))
    expect(await screen.findByRole('alert')).toBeTruthy()
  })

  it('shows the waiting skeleton after the request is accepted', async () => {
    const doc = makeDoc()
    render(<ImportPage {...baseProps(doc)} />)
    fireEvent.click(screen.getByText('选择目录'))
    await screen.findByDisplayValue('/tmp/projects')
    fireEvent.click(screen.getByText('开始分析'))
    expect(await screen.findByRole('status')).toBeTruthy()
  })

  it('settles into the done banner once the registry grows', async () => {
    const doc = makeDoc()
    render(<ImportPage {...baseProps(doc)} />)
    fireEvent.click(screen.getByText('选择目录'))
    await screen.findByDisplayValue('/tmp/projects')
    fireEvent.click(screen.getByText('开始分析'))
    // Simulate the agent saving projects through settings.
    doc.projects.push({
      id: '1', name: 'app', path: '/tmp/projects/app', type: 'node',
      packageManager: 'pnpm', scripts: { dev: 'vite' }, createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(await screen.findByText(/已保存 1 个新项目/)).toBeTruthy()
  })
})
