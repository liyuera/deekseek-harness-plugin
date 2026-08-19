/**
 * Desktop action tests: approval decisions, IDE/terminal open commands
 * across platforms, and quick-start batching — all against scripted runners,
 * scopes, and approval stubs.
 */
import { describe, expect, it, vi } from 'vitest'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { ApprovalService } from '@deepseek-ai/dsh-user-approval'
import type { DevDockSettings } from '../src/schema.ts'
import type { DevDockScope } from '../src/tools/project.ts'
import type { PlatformFacts } from '../src/platform/runner.ts'
import { openProjectInIde } from '../src/platform/open-ide.ts'
import { openProjectTerminal, terminalCommand } from '../src/platform/open-terminal.ts'
import { openIdeTool, openTerminalTool, quickStartTool, requireApproval } from '../src/tools/actions.ts'

/** Scripted platform facts capturing every invocation; commands fail when they match a pattern. */
function scriptedFacts(failPatterns: RegExp[] = []): {
  facts: PlatformFacts
  calls: Array<{ command: string; args: readonly string[] }>
} {
  const calls: Array<{ command: string; args: readonly string[] }> = []
  const facts: PlatformFacts = {
    platform: 'darwin',
    home: '/Users/tester',
    run: async (command, args) => {
      calls.push({ command, args })
      const key = `${command} ${args.join(' ')}`
      if (failPatterns.some((p) => p.test(key))) throw new Error(`scripted failure: ${key}`)
      return { stdout: '', stderr: '' }
    },
  }
  return { facts, calls }
}

/** Settings scope stub over an in-memory document. */
function scopeOf(doc: DevDockSettings): DevDockScope {
  return {
    get: () => doc,
    update: (patch) => Object.assign(doc, patch),
  }
}

function baseDoc(): DevDockSettings {
  return {
    projects: [{
      id: '1',
      name: 'app',
      path: '/tmp/app',
      type: 'node',
      packageManager: 'pnpm',
      scripts: { dev: 'vite', build: 'vite build' },
      createdAt: '2026-01-01T00:00:00.000Z',
    }],
    editors: [{ name: 'WebStorm', detectedPath: '/Applications/WebStorm.app' }],
    quickStarts: [],
    terminalApp: 'default',
  }
}

/** Tool run context stub with a scripted approval service. */
function execWith(
  events: unknown[],
  approval: ApprovalService,
): { exec: ToolRunContext } {
  const exec = {
    agent: { session: { events } },
    signal: new AbortController().signal,
  } as unknown as ToolRunContext
  return { exec, approval }
}

/** Approval stub recording requests. */
function approvalStub(): ApprovalService & { requests: string[] } {
  const stub = {
    requests: [] as string[],
    request: vi.fn(async (req: { reason: string }) => {
      stub.requests.push(req.reason)
      return 'allowed-once' as const
    }),
  }
  return stub as unknown as ApprovalService & { requests: string[] }
}

describe('requireApproval', () => {
  it('allows directly under the never policy without asking', async () => {
    const approval = approvalStub()
    const { exec } = execWith([{ type: 'approval/policy', data: { policy: 'never' } }], approval)
    const result = await requireApproval(approval, exec, 't', 'reason')
    expect(result).toEqual({ allowed: true })
    expect(approval.requests).toHaveLength(0)
  })

  it('asks and allows on allowed-once under the ask policy', async () => {
    const approval = approvalStub()
    const { exec } = execWith([], approval)
    const result = await requireApproval(approval, exec, 'dev-dock_open-ide', 'open app')
    expect(result).toEqual({ allowed: true })
    expect(approval.requests).toEqual(['open app'])
  })

  it('fails closed on a rejected answer', async () => {
    const approval = {
      request: vi.fn(async () => 'rejected' as const),
    } as unknown as ApprovalService
    const { exec } = execWith([], approval)
    const result = await requireApproval(approval, exec, 't', 'reason')
    expect(result.allowed).toBe(false)
  })

  it('fails without an agent context', async () => {
    const approval = approvalStub()
    const exec = { signal: new AbortController().signal } as unknown as ToolRunContext
    const result = await requireApproval(approval, exec, 't', 'reason')
    expect(result.allowed).toBe(false)
  })
})

describe('openProjectInIde', () => {
  it('runs open -a on macOS', async () => {
    const { facts, calls } = scriptedFacts()
    await openProjectInIde(facts, '/tmp/app', 'WebStorm', '/Applications/WebStorm.app')
    expect(calls).toEqual([{ command: 'open', args: ['-a', 'WebStorm', '/tmp/app'] }])
  })

  it('maps VS Code to its bundle name on macOS', async () => {
    const { facts, calls } = scriptedFacts()
    await openProjectInIde(facts, '/tmp/app', 'VS Code', '/Applications/Visual Studio Code.app')
    expect(calls[0].args).toEqual(['-a', 'Visual Studio Code', '/tmp/app'])
  })

  it('runs cmd start on Windows', async () => {
    const { facts, calls } = scriptedFacts()
    facts.platform = 'win32'
    await openProjectInIde(facts, 'C:\\dev\\app', 'WebStorm', 'C:\\ws\\webstorm64.exe')
    expect(calls).toEqual([{
      command: 'cmd',
      args: ['/c', 'start', '""', 'C:\\ws\\webstorm64.exe', 'C:\\dev\\app'],
    }])
  })

  it('reports a failure without throwing', async () => {
    const { facts } = scriptedFacts([/open -a WebStorm/])
    const result = await openProjectInIde(facts, '/tmp/app', 'WebStorm', '/x')
    expect(result.ok).toBe(false)
  })
})

describe('terminalCommand', () => {
  it('builds a plain cd command', () => {
    expect(terminalCommand('/tmp/app')).toBe('cd "/tmp/app"')
  })

  it('appends the command with the package manager', () => {
    expect(terminalCommand('/tmp/app', 'pnpm run dev')).toBe('cd "/tmp/app" && pnpm run dev')
  })

  it('escapes embedded quotes', () => {
    expect(terminalCommand('/tmp/a"b', 'echo hi')).toBe('cd "/tmp/a\\"b" && echo hi')
  })
})

describe('openProjectTerminal', () => {
  it('drives Terminal.app through osascript on macOS', async () => {
    const { facts, calls } = scriptedFacts()
    const result = await openProjectTerminal(facts, '/tmp/app', 'npm run dev')
    expect(result.ok).toBe(true)
    expect(calls[0].command).toBe('osascript')
    expect(calls[0].args).toContain('tell application "Terminal" to activate')
    expect(calls[0].args.join(' ')).toContain('npm run dev')
  })

  it('prefers iTerm when configured', async () => {
    const { facts, calls } = scriptedFacts()
    await openProjectTerminal(facts, '/tmp/app', undefined, true)
    expect(calls[0].command).toBe('osascript')
    expect(calls[0].args).toContain('tell application "iTerm" to activate')
  })

  it('falls back to iTerm when Terminal.app fails', async () => {
    const { facts, calls } = scriptedFacts([/tell application "Terminal"/])
    const result = await openProjectTerminal(facts, '/tmp/app')
    expect(result.ok).toBe(true)
    expect(calls).toHaveLength(2)
    expect(calls[1].args).toContain('tell application "iTerm" to activate')
  })

  it('uses Windows Terminal on Windows with a plain cd', async () => {
    const { facts, calls } = scriptedFacts()
    facts.platform = 'win32'
    const result = await openProjectTerminal(facts, 'C:\\dev\\app')
    expect(result.ok).toBe(true)
    expect(calls).toEqual([{ command: 'wt', args: ['-d', 'C:\\dev\\app'] }])
  })

  it('runs the command via cmd /K on Windows Terminal', async () => {
    const { facts, calls } = scriptedFacts()
    facts.platform = 'win32'
    await openProjectTerminal(facts, 'C:\\dev\\app', 'npm run dev')
    expect(calls[0].args).toEqual(['-d', 'C:\\dev\\app', 'cmd', '/K', 'npm run dev'])
  })

  it('falls back to a plain cmd window when wt is unavailable', async () => {
    const { facts, calls } = scriptedFacts([/^wt /])
    facts.platform = 'win32'
    const result = await openProjectTerminal(facts, 'C:\\dev\\app')
    expect(result.ok).toBe(true)
    expect(calls[0].command).toBe('wt')
    expect(calls[1].command).toBe('cmd')
    expect(calls[1].args).toContain('start')
  })
})

describe('openIdeTool', () => {
  it('fails for an unknown project', async () => {
    const doc = baseDoc()
    const { facts } = scriptedFacts()
    const approval = approvalStub()
    const tool = openIdeTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({ projectId: 'nope' }, exec)
    expect(result.ok).toBe(false)
    expect(approval.requests).toHaveLength(0)
  })

  it('defaults to HBuilderX for uni-app projects', async () => {
    const doc = baseDoc()
    doc.projects[0].type = 'uniapp'
    // No HBuilderX stored or detectable (mdfind empty, filesystem probes fail).
    const { facts } = scriptedFacts([/^\/bin\/test/])
    const approval = approvalStub()
    const tool = openIdeTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({ projectId: '1' }, exec)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('HBuilderX')
  })

  it('opens the project after approval', async () => {
    const doc = baseDoc()
    const { facts, calls } = scriptedFacts()
    const approval = approvalStub()
    const tool = openIdeTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({ projectId: '1', editor: 'WebStorm' }, exec)
    expect(result.ok).toBe(true)
    expect(approval.requests).toEqual(['Open app in WebStorm'])
    expect(calls[0]).toEqual({ command: 'open', args: ['-a', 'WebStorm', '/tmp/app'] })
  })
})

describe('openTerminalTool', () => {
  it('fails for a script the project does not have', async () => {
    const doc = baseDoc()
    const { facts } = scriptedFacts()
    const approval = approvalStub()
    const tool = openTerminalTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({ projectId: '1', command: 'test' }, exec)
    expect(result.ok).toBe(false)
    expect(approval.requests).toHaveLength(0)
  })

  it('opens a terminal running the script with the project package manager', async () => {
    const doc = baseDoc()
    const { facts, calls } = scriptedFacts()
    const approval = approvalStub()
    const tool = openTerminalTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({ projectId: '1', command: 'dev' }, exec)
    expect(result.ok).toBe(true)
    expect(calls[0].args.join(' ')).toContain('pnpm run dev')
  })

  it('opens a plain terminal without a command', async () => {
    const doc = baseDoc()
    const { facts, calls } = scriptedFacts()
    const approval = approvalStub()
    const tool = openTerminalTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({ projectId: '1' }, exec)
    expect(result.ok).toBe(true)
    expect(calls[0].args.join(' ')).not.toContain('&&')
  })
})

describe('quickStartTool', () => {
  it('fails when no plan is saved', async () => {
    const doc = baseDoc()
    const { facts } = scriptedFacts()
    const approval = approvalStub()
    const tool = quickStartTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({}, exec)
    expect(result.ok).toBe(false)
    expect(approval.requests).toHaveLength(0)
  })

  it('opens all ides and starts all scripts with one approval', async () => {
    const doc = baseDoc()
    doc.quickStarts = [{
      name: 'daily',
      items: [
        { projectId: '1', ides: ['WebStorm', 'VS Code'], script: 'dev' },
        { projectId: '1', ides: [], script: 'build' },
      ],
    }]
    doc.editors = [
      { name: 'WebStorm', detectedPath: '/Applications/WebStorm.app' },
      { name: 'VS Code', detectedPath: '/Applications/Visual Studio Code.app' },
    ]
    const { facts, calls } = scriptedFacts()
    const approval = approvalStub()
    const tool = quickStartTool(scopeOf(doc), facts, approval)
    const { exec } = execWith([], approval)
    const result = await tool.execute({ plan: 'daily' }, exec)
    expect(result).toEqual({ ok: true, opened: 2, started: 2 })
    expect(approval.requests).toHaveLength(1)
    expect(approval.requests[0]).toContain('Quick-start "daily"')
    expect(approval.requests[0]).toContain('app')
    const opens = calls.filter((c) => c.command === 'open')
    expect(opens).toHaveLength(2)
    const scripts = calls.filter((c) => c.command === 'osascript' && c.args.join(' ').includes('run'))
    expect(scripts).toHaveLength(2)
    const scriptText = scripts.map((s) => s.args.join(" ")).join(" | ")
    expect(scriptText).toContain("pnpm run dev")
    expect(scriptText).toContain("pnpm run build")
  })
})
