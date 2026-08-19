/**
 * Desktop action tools: open a project in an IDE, open a system terminal at
 * a project (optionally running one script), and run a quick-start plan.
 * All three are user-visible desktop side effects and follow the approval
 * pipeline: `never` policy executes directly, `ask` goes through
 * `ctx.approval.request` with one consolidated question per tool call.
 * @module @liyuera/dsh-dev-dock/tools/actions
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { ApprovalService } from '@deepseek-ai/dsh-user-approval'
import { effectiveApprovalPolicy } from '@deepseek-ai/dsh-user-approval'
import type { DevDockScope } from './project.ts'
import type { PlatformFacts } from '../platform/runner.ts'
import { openProjectInIde } from '../platform/open-ide.ts'
import { openProjectTerminal } from '../platform/open-terminal.ts'
import { detectEditors } from './editors.ts'
import type { ProjectRecord } from '../schema.ts'

/** Delay between consecutive IDE launches in a quick-start run. */
const IDE_LAUNCH_GAP_MS = 300

/**
 * Decide whether one desktop action may run: the session's effective
 * approval policy, asking through the approval service when the policy is
 * `ask`. The `never` policy never asks — full access executes directly.
 * @param approval - the approval service.
 * @param exec - the live tool execution carrying the agent.
 * @param toolName - tool identity for the audit pair.
 * @param reason - user-facing explanation of the action.
 * @returns true when the action is allowed.
 */
export async function requireApproval(
  approval: ApprovalService,
  exec: ToolRunContext,
  toolName: string,
  reason: string,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const agent = exec.agent
  if (agent === undefined) {
    return { allowed: false, error: 'no agent context for approval' }
  }
  const policy = effectiveApprovalPolicy(agent.session.events)
  if (policy === 'never') return { allowed: true }
  const outcome = await approval.request({
    agent,
    toolName,
    reason,
    signal: exec.signal,
  })
  if (outcome === 'allowed-once') return { allowed: true }
  return { allowed: false, error: `approval rejected (${outcome})` }
}

/**
 * Resolve the executable path for one editor: manual path wins, then
 * detected path, then a live detection pass.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param editorName - canonical editor name.
 * @returns the resolved path or an error message.
 */
async function resolveEditorPath(
  scope: DevDockScope,
  facts: PlatformFacts,
  editorName: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const stored = scope.get().editors.find((e) => e.name === editorName)
  if (stored?.manualPath) return { ok: true, path: stored.manualPath }
  if (stored?.detectedPath) return { ok: true, path: stored.detectedPath }
  const detected = await detectEditors(facts)
  const path = detected[editorName]
  if (path === undefined) {
    const hint = editorName === 'HBuilderX'
      ? ' (configure its path in the devDock panel settings)'
      : ''
    return { ok: false, error: `editor ${editorName} not found${hint}` }
  }
  return { ok: true, path }
}

/** Default editor per project kind. */
function defaultEditorFor(type: ProjectRecord['type']): string {
  return type === 'uniapp' || type === 'miniapp' ? 'HBuilderX' : 'WebStorm'
}

/** Tool: open one project in an IDE. */
export function openIdeTool(
  scope: DevDockScope,
  facts: PlatformFacts,
  approval: ApprovalService,
) {
  return defineTool({
    name: 'dev-dock_open-ide',
    description:
      'Open one registered project in a code editor on the user\'s desktop (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, or HBuilderX). Defaults to the project-kind editor (HBuilderX for uni-app/miniapp, WebStorm otherwise). This opens a visible application window — the user may be asked to approve.',
    parameters: {
      projectId: { type: 'string', required: true, description: 'Project id from dev-dock_list-projects' },
      editor: { type: 'string', description: 'Editor name to use; defaults to the project-kind editor' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { ok: { type: 'boolean', required: true }, error: { type: 'string' } },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.ok ? 'IDE opened' : `failed: ${value.error ?? 'unknown error'}`,
      }],
    },
    async execute(args, exec) {
      const project = scope.get().projects.find((p) => p.id === args.projectId)
      if (project === undefined) return { ok: false, error: `project ${args.projectId} not found` }
      const editor = args.editor ?? defaultEditorFor(project.type)
      const allowed = await requireApproval(
        approval, exec, 'dev-dock_open-ide', `Open ${project.name} in ${editor}`,
      )
      if (!allowed.allowed) return { ok: false, error: allowed.error }
      const resolved = await resolveEditorPath(scope, facts, editor)
      if (!resolved.ok) return { ok: false, error: resolved.error }
      const result = await openProjectInIde(facts, project.path, editor, resolved.path)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
  })
}

/** Tool: open a system terminal at a project, optionally running one script. */
export function openTerminalTool(
  scope: DevDockScope,
  facts: PlatformFacts,
  approval: ApprovalService,
) {
  return defineTool({
    name: 'dev-dock_open-terminal',
    description:
      'Open a system terminal window (Terminal.app/iTerm on macOS, Windows Terminal/cmd on Windows) at a registered project directory, optionally running one of its scripts with the project\'s package manager (e.g. `pnpm run dev`). The command runs in a user-visible terminal window — the user may be asked to approve.',
    parameters: {
      projectId: { type: 'string', required: true, description: 'Project id from dev-dock_list-projects' },
      command: { type: 'string', description: 'Optional script name from the project scripts to run' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { ok: { type: 'boolean', required: true }, error: { type: 'string' } },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.ok ? 'terminal opened' : `failed: ${value.error ?? 'unknown error'}`,
      }],
    },
    async execute(args, exec) {
      const project = scope.get().projects.find((p) => p.id === args.projectId)
      if (project === undefined) return { ok: false, error: `project ${args.projectId} not found` }
      let command: string | undefined
      if (args.command !== undefined) {
        if (!(args.command in project.scripts)) {
          return { ok: false, error: `script ${args.command} not found in project scripts` }
        }
        command = `${project.packageManager} run ${args.command}`
      }
      const allowed = await requireApproval(
        approval, exec, 'dev-dock_open-terminal',
        `Open terminal at ${project.name}${command === undefined ? '' : ` and run ${command}`}`,
      )
      if (!allowed.allowed) return { ok: false, error: allowed.error }
      const preferIterm = scope.get().terminalApp === 'iterm'
      const result = await openProjectTerminal(facts, project.path, command, preferIterm)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
  })
}

/** Tool: run one quick-start plan (batch open IDEs + start scripts). */
export function quickStartTool(
  scope: DevDockScope,
  facts: PlatformFacts,
  approval: ApprovalService,
) {
  return defineTool({
    name: 'dev-dock_quick-start',
    description:
      'Run a quick-start plan: for each item, open the project in its chosen editors and start its script in a system terminal. One approval covers the whole plan. Plan defaults to the first saved plan when none is named.',
    parameters: {
      plan: { type: 'string', description: 'Quick-start plan name; defaults to the first plan' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          opened: { type: 'number', required: true },
          started: { type: 'number', required: true },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.ok
          ? `quick-start done: ${value.opened} IDE open(s), ${value.started} script(s) started`
          : `quick-start failed: ${value.error ?? 'unknown error'}`,
      }],
    },
    async execute(args, exec) {
      const plans = scope.get().quickStarts
      const plan = plans.find((p) => p.name === args.plan) ?? plans[0]
      if (plan === undefined) {
        return { ok: false, error: 'no quick-start plan saved', opened: 0, started: 0 }
      }
      const projects = new Map(scope.get().projects.map((p) => [p.id, p]))
      const summary = plan.items.map((item) => {
        const project = projects.get(item.projectId)
        const label = project === undefined ? item.projectId : project.name
        const ides = item.ides.length > 0 ? ` IDE:${item.ides.join('+')}` : ''
        const script = item.script !== undefined ? ` script:${item.script}` : ''
        return `${label}${ides}${script}`
      }).join('; ')
      const allowed = await requireApproval(
        approval, exec, 'dev-dock_quick-start',
        `Quick-start "${plan.name}": ${plan.items.length} item(s) — ${summary}`,
      )
      if (!allowed.allowed) {
        return { ok: false, error: allowed.error, opened: 0, started: 0 }
      }

      const preferIterm = scope.get().terminalApp === 'iterm'
      let opened = 0
      let started = 0
      const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

      for (const item of plan.items) {
        const project = projects.get(item.projectId)
        if (project === undefined) continue
        for (const editor of item.ides) {
          const resolved = await resolveEditorPath(scope, facts, editor)
          if (resolved.ok) {
            const result = await openProjectInIde(facts, project.path, editor, resolved.path)
            if (result.ok) opened++
          }
          await sleep(IDE_LAUNCH_GAP_MS)
        }
        if (item.script !== undefined && item.script in project.scripts) {
          const command = `${project.packageManager} run ${item.script}`
          const result = await openProjectTerminal(facts, project.path, command, preferIterm)
          if (result.ok) started++
        }
      }
      return { ok: true, opened, started }
    },
  })
}
