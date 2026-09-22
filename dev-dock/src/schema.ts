/**
 * devDock settings namespace v2: per-workspace IDE preferences, editor
 * manual paths, terminal preference, and the start-work selection memory.
 * Projects are dsh workspaces, so no separate project registry exists.
 * Persisted through the settings capability (`$DSH_HOME/settings.yaml`,
 * namespace `dev-dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */

import z from '@deepseek-ai/schemastery'
// dsh-settings 已移除运行时名称空间工厂函数（settingsNamespace），
// 命名空间 id 现以 Branded 类型标记；字符串字面量经 register() 内建 brand。
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'

/** Workspace id (dsh workspace registry id) one IDE preference is keyed by. */
export type WorkspacePrefKey = string

/** One known editor: auto-detected path and/or user-configured path. */
export interface EditorRecord {
  /** Canonical editor name (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, HBuilderX). */
  name: string
  /** Auto-detected executable/app path (empty when not installed). */
  detectedPath?: string
  /** User-configured executable/app path (HBuilderX relies on this). */
  manualPath?: string
}

/** Whole devDock settings document. */
export interface DevDockSettings {
  /** Per-workspace IDE preference (falls back to auto-detection defaults). */
  workspacePrefs: Array<{ workspaceId: WorkspacePrefKey; editor: string }>
  /** Editor detection cache plus user-configured paths. */
  editors: EditorRecord[]
  /** macOS terminal preference; 'default' uses Terminal.app, 'iterm' iTerm. */
  terminalApp: 'default' | 'iterm'
  /** Workspace ids of the last start-work selection (dialog prefill). */
  startWork: string[]
}

/** Branded settings namespace of this plugin. */
// 直接以字面量 brand（register 会校验小写连字符格式），不再经过已移除的工厂函数。
export const DEV_DOCK_NAMESPACE = 'dev-dock' as SettingsNamespace

/** Schemastery schema for the whole document (registered by the host half). */
export const DevDockSettingsSchema: z<DevDockSettings> = z.object({
  workspacePrefs: z.array(z.object({
    workspaceId: z.string().required(),
    editor: z.string().required(),
  })).default([]),
  editors: z.array(z.object({
    name: z.string().required(),
    detectedPath: z.string(),
    manualPath: z.string(),
  })).default([]),
  terminalApp: z.union([z.const('default'), z.const('iterm')]).default('default'),
  startWork: z.array(z.string()).default([]),
})

/** Empty settings document used as the schema base. */
export const EMPTY_DEV_DOCK_SETTINGS: DevDockSettings = {
  workspacePrefs: [],
  editors: [],
  terminalApp: 'default',
  startWork: [],
}
