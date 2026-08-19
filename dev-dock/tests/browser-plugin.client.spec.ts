/**
 * devDock plugin halves: the browser entry's dictionary and slot
 * registrations against the real SlotRegistry (with fiber teardown proving
 * removal — HMR safety), the inert node entry, and the invariant companion's
 * ownership reservation.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { apply, inject } from '../src/client/index.ts'

import * as DevDockInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

/** Slot ledger reader for both contributed entries. */
function entriesOf(ctx: Context, slot: string): (string | undefined)[] {
  return ctx.slots.entries(slot).map(entry => entry.options.id)
}

/** Boot the browser half over a real slot tree declaring both target slots. */
async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
      'shell.overlay': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  // The data layer binds a settings scope, which reads the connection handle
  // and the forwarded-event port.
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  ctx.provide('sessions', { list: { getSnapshot: () => ({ current: undefined }) }, scope: () => undefined } as never)
  ctx.provide('workspaces', { pickDirectory: async () => null } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('dev-dock browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'settingsScope', 'sessions', 'workspaces'])
  })

  it('registers the footer entry and the drawer, and teardown removes them (HMR safety)', async () => {
    const { ctx, fiber } = await bench()
    expect(entriesOf(ctx, 'sidebar.footer.action')).toContain('dev-dock')
    expect(entriesOf(ctx, 'shell.overlay')).toContain('dev-dock-drawer')
    await fiber.dispose()
    expect(entriesOf(ctx, 'sidebar.footer.action')).not.toContain('dev-dock')
    expect(entriesOf(ctx, 'shell.overlay')).not.toContain('dev-dock-drawer')
  })

  it('registers both dictionaries under its own namespace and releases them with the fiber', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
    expect(translate('entry.title')).toBe(zh['entry.title'])
    ctx.locale.setLocale('en')
    expect(translate('entry.title')).toBe(en['entry.title'])

    await fiber.dispose()
    expect(translate('entry.title')).not.toBe(en['entry.title'])
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('dev-dock node half', () => {
  it('exports the plugin identity contract', async () => {
    const mod = await import('../src/index.ts')
    expect(mod.name).toBe('dev-dock')
    expect(Array.isArray(mod.inject)).toBe(true)
    expect(mod.inject).toContain('tools')
    expect(mod.inject).toContain('settings')
    expect(mod.inject).toContain('approval')
    expect(typeof mod.apply).toBe('function')
  })
})

describe('dev-dock invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(DevDockInvariant)
    await fiber.await()
    expect(DevDockInvariant.name).toBe('dev-dock-invariant')
    expect(DevDockInvariant.inject).toEqual(['invariants'])
    // Emitting an unrelated event proves the companion installed no audit.
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
