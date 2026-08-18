/**
 * ui-subagent-sidebar plugin halves: the browser entry's dictionary and
 * overlay-slot registrations against the real SlotRegistry (with fiber
 * teardown proving removal — HMR safety), the inert node entry, and the
 * invariant companion's ownership reservation.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as applyNode } from '../src/index.ts'
import * as SidebarInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

/** Slot ledger reader: entry ids currently registered in the overlay list. */
function overlayEntryIds(ctx: Context): (string | undefined)[] {
  return ctx.slots
    .entries('shell.overlay')
    .map(entry => entry.options.id)
}

/** Boot the browser half over a real slot tree that declares the overlay list. */
async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'shell.overlay': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  ctx.provide('sessions', {})
  // The locale plugin binds a settings scope, which reads the connection handle
  // and the forwarded-event port.
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-subagent-sidebar browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['sessions', 'slots', 'locale'])
  })

  it('registers both overlay entries, and fiber teardown removes them (HMR safety)', async () => {
    const { ctx, fiber } = await bench()
    expect(overlayEntryIds(ctx)).toContain('subagent-sidebar-capsule')
    expect(overlayEntryIds(ctx)).toContain('subagent-sidebar-panel')
    await fiber.dispose()
    expect(overlayEntryIds(ctx)).not.toContain('subagent-sidebar-capsule')
    expect(overlayEntryIds(ctx)).not.toContain('subagent-sidebar-panel')
  })

  it('registers both dictionaries under its own namespace and releases them with the fiber', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
    expect(translate('panel.title')).toBe(zh['panel.title'])
    ctx.locale.setLocale('en')
    expect(translate('panel.title')).toBe(en['panel.title'])

    // Withdrawn dictionaries leave the key unresolved rather than translated.
    await fiber.dispose()
    expect(translate('panel.title')).not.toBe(en['panel.title'])
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('ui-subagent-sidebar node half', () => {
  it('contributes no host behavior', () => {
    // The node half exists only so the plugin appears in the Loader tree.
    expect(applyNode).not.toThrow()
  })
})

describe('ui-subagent-sidebar invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(SidebarInvariant)
    await fiber.await()
    expect(SidebarInvariant.name).toBe('client-ui-subagent-sidebar-invariant')
    expect(SidebarInvariant.inject).toEqual(['invariants'])
    // Emitting an unrelated event proves the companion installed no audit.
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
