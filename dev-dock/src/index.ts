/**
 * devDock plugin, node half. Registers the `dev-dock` settings namespace and
 * the tool set: candidate scanning, project save/list/remove, editor
 * detection, and the desktop actions (open IDE / system terminal /
 * quick-start) behind the approval pipeline.
 * @module @liyuera/dsh-dev-dock
 */

import type { Context } from '@deepseek-ai/cordis'
import {
  DEV_DOCK_NAMESPACE,
  DevDockSettingsSchema,
  EMPTY_DEV_DOCK_SETTINGS,
} from './schema.ts'
import { scanCandidatesTool } from './tools/scan.ts'
import { listProjectsTool, removeProjectTool, saveProjectTool, scopeOf } from './tools/project.ts'
import { listEditorsTool } from './tools/editors.ts'
import { openIdeTool, openTerminalTool, quickStartTool } from './tools/actions.ts'
import { liveFacts } from './platform/runner.ts'

/** Plugin identity. */
export const name = 'dev-dock'

/** Services required by the host half. */
export const inject = ['tools', 'settings', 'approval']

/**
 * Register the settings namespace and all tools.
 * @param ctx - Cordis context carrying tools, settings, and approval.
 */
export function apply(ctx: Context): void {
  const scope = ctx.settings.register(
    DEV_DOCK_NAMESPACE,
    DevDockSettingsSchema,
    { base: EMPTY_DEV_DOCK_SETTINGS },
  )
  const devDock = scopeOf(scope)
  const facts = liveFacts()

  ctx.tools.register(scanCandidatesTool)
  ctx.tools.register(saveProjectTool(devDock))
  ctx.tools.register(listProjectsTool(devDock))
  ctx.tools.register(removeProjectTool(devDock))
  ctx.tools.register(listEditorsTool(devDock, facts))
  ctx.tools.register(openIdeTool(devDock, facts, ctx.approval))
  ctx.tools.register(openTerminalTool(devDock, facts, ctx.approval))
  ctx.tools.register(quickStartTool(devDock, facts, ctx.approval))
}
