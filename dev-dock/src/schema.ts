/**
 * devDock settings namespace: project registry, editor configuration, and
 * quick-start plans. Persisted through the settings capability
 * (`$DSH_HOME/settings.yaml`, namespace `dev-dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */

import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'

/** Stable id of one registered project. */
export type ProjectId = string

/** Frontend project kinds the AI analysis may classify. */
export type ProjectType = 'node' | 'uniapp' | 'miniapp'

/** Package manager used to run project scripts. */
export type PackageManager = 'npm' | 'pnpm' | 'yarn'

/** One registered frontend project. */
export interface ProjectRecord {
  /** Stable id, minted by the save tool on first insert. */
  id: ProjectId
  /** Project directory name. */
  name: string
  /** Absolute project path; the unique key. */
  path: string
  /** Optional display alias. */
  alias?: string
  /** Classified project kind. */
  type: ProjectType
  /** Package manager the AI analysis resolved. */
  packageManager: PackageManager
  /** Node version requirement the AI analysis resolved (e.g. "18"). */
  nodeVersion?: string
  /** package.json scripts (name → command); empty for manifest-only projects. */
  scripts: Record<string, string>
  /** Build script name to run for production builds. */
  buildCommand?: string
  /** ISO timestamp of first registration. */
  createdAt: string
}

/** One known editor: auto-detected path and/or user-configured path. */
export interface EditorRecord {
  /** Canonical editor name (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, HBuilderX). */
  name: string
  /** Auto-detected executable/app path (empty when not installed). */
  detectedPath?: string
  /** User-configured executable/app path (HBuilderX relies on this). */
  manualPath?: string
}

/** One quick-start item: which ides open a project and which script runs. */
export interface QuickStartItem {
  projectId: ProjectId
  /** Editor names to open the project with (multi-select). */
  ides: string[]
  /** Script name from the project's scripts to run in a system terminal. */
  script?: string
}

/** One named quick-start plan. */
export interface QuickStartPlan {
  /** Plan display name. */
  name: string
  items: QuickStartItem[]
}

/** Whole devDock settings document. */
export interface DevDockSettings {
  projects: ProjectRecord[]
  editors: EditorRecord[]
  quickStarts: QuickStartPlan[]
  /** macOS terminal preference; 'default' uses Terminal.app, 'iterm' iTerm. */
  terminalApp: 'default' | 'iterm'
}

/** Branded settings namespace of this plugin. */
export const DEV_DOCK_NAMESPACE = settingsNamespace('dev-dock')

/** Schemastery schema for the whole document (registered by the host half). */
export const DevDockSettingsSchema: z<DevDockSettings> = z.object({
  projects: z.array(z.object({
    id: z.string().required(),
    name: z.string().required(),
    path: z.string().required(),
    alias: z.string(),
    type: z.union([z.const('node'), z.const('uniapp'), z.const('miniapp')]).required(),
    packageManager: z.union([z.const('npm'), z.const('pnpm'), z.const('yarn')]).required(),
    nodeVersion: z.string(),
    scripts: z.dict(z.string()).required(),
    buildCommand: z.string(),
    createdAt: z.string().required(),
  })).default([]),
  editors: z.array(z.object({
    name: z.string().required(),
    detectedPath: z.string(),
    manualPath: z.string(),
  })).default([]),
  quickStarts: z.array(z.object({
    name: z.string().required(),
    items: z.array(z.object({
      projectId: z.string().required(),
      ides: z.array(z.string()).required(),
      script: z.string(),
    })).required(),
  })).default([]),
  terminalApp: z.union([z.const('default'), z.const('iterm')]).default('default'),
})

/** Empty settings document used as the schema base. */
export const EMPTY_DEV_DOCK_SETTINGS: DevDockSettings = {
  projects: [],
  editors: [],
  quickStarts: [],
  terminalApp: 'default',
}
