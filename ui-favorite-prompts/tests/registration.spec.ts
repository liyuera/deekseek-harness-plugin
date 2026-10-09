// @vitest-environment jsdom
/**
 * Wiring and disposal of the browser half.
 *
 * The real slot registry lives in `ui-renderer/lib/client.js`, the Web shell's
 * lazy-CJS browser artifact — it only runs inside the page, so these specs drive
 * a recording stand-in with the same two-method surface the plugin uses. The
 * behavioral claim is unchanged: every contribution lands under its declared
 * slot key and every one is released when the fiber is disposed (HMR safety).
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply, inject } from '../src/client/index.ts'

/** One recorded contribution. */
interface Contribution {
  key: string
  options: Record<string, unknown>
  disposed: boolean
}

/** Recording `ctx.slots`: same register/inject contract the plugin relies on. */
function slotsStandIn(): { service: unknown; entries: Contribution[] } {
  const entries: Contribution[] = []
  const service = {
    register: (options: Record<string, unknown>) => {
      const entry: Contribution = { key: String(options.name), options, disposed: false }
      entries.push(entry)
      return () => { entry.disposed = true }
    },
    inject: (key: string, callback: () => (() => void) | void) => {
      // The real registry releases the injected registration when the caller's
      // fiber is disposed; chaining that disposer is what `inject` is for.
      const dispose = callback()
      return () => { if (typeof dispose === 'function') dispose() }
    },
    entries: (key: string) => entries.filter(entry => entry.key === key),
  }
  return { service, entries }
}

/** Boot the browser half over recording services. */
async function bench(): Promise<{
  ctx: Context
  fiber: { dispose(): Promise<void> }
  contributions: Contribution[]
  sources: unknown[]
  definitions: unknown[]
}> {
  const ctx = new Context()
  const slots = slotsStandIn()
  const sources: unknown[] = []
  const definitions: unknown[] = []
  ctx.provide('slots', slots.service as never)
  ctx.provide('locale', {
    register: () => () => {},
    bind: () => (key: string) => key,
  } as never)
  ctx.provide('inputTriggers', {
    registerSource: (source: unknown) => {
      sources.push(source)
      return () => { sources.splice(sources.indexOf(source), 1) }
    },
    sessionOf: () => { throw new Error('unused in this spec') },
  } as never)
  ctx.provide('uiConversation', {
    events: {
      register: (definition: unknown) => {
        definitions.push(definition)
        return () => { definitions.splice(definitions.indexOf(definition), 1) }
      },
    },
  } as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber, contributions: slots.entries, sources, definitions }
}

describe('favorite-prompts browser half', () => {
  it('declares the services it reads', () => {
    expect(inject).toEqual(['slots', 'locale', 'uiConversation', 'inputTriggers'])
  })

  it('registers the strip definition, the @ source, and the settings page', async () => {
    const { contributions, definitions, sources } = await bench()
    expect(definitions).toHaveLength(1)
    expect(sources).toHaveLength(1)
    expect(contributions.map(entry => entry.key)).toEqual([
      'conversation.chat.node',
      'settings.section',
    ])
    expect(contributions[0]?.options.key).toBe('favorite-strip')
    expect(contributions[1]?.options.id).toBe('favorite-prompts')
  })

  it('keeps the settings page last in the navigation order', async () => {
    const { contributions } = await bench()
    const settings = contributions.find(entry => entry.options.id === 'favorite-prompts')
    expect(settings?.options.order).toBe(30)
  })

  it('releases every contribution when the fiber is disposed (HMR safety)', async () => {
    const { fiber, contributions, sources, definitions } = await bench()
    await fiber.dispose()
    expect(definitions).toHaveLength(0)
    expect(sources).toHaveLength(0)
    expect(contributions.every(entry => entry.disposed)).toBe(true)
  })
})
