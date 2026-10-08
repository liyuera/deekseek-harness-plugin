// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'

afterEach(() => {
  // Nothing global to clean: each case boots its own context.
})

/** Boot the browser half over a real slot tree declaring the two seats it fills. */
async function bench(): Promise<{
  ctx: Context
  fiber: { dispose(): Promise<void> }
  sources: unknown[]
  definitions: unknown[]
}> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.chat.node': { kind: 'keyed', scope: 'session' },
      'settings.section': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  const sources: unknown[] = []
  const definitions: unknown[] = []
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
  return { ctx, fiber, sources, definitions }
}

describe('favorite-prompts browser half', () => {
  it('declares the services it reads', () => {
    expect(inject).toEqual(['slots', 'locale', 'uiConversation', 'inputTriggers'])
  })

  it('registers the strip definition, the @ source, and the settings page', async () => {
    const { ctx, definitions, sources } = await bench()
    expect(definitions).toHaveLength(1)
    expect(sources).toHaveLength(1)
    expect(ctx.slots.entries('conversation.chat.node').map(entry => entry.options.key)).toContain('favorite-strip')
    expect(ctx.slots.entries('settings.section').map(entry => entry.options.id)).toContain('favorite-prompts')
  })

  it('keeps the settings page last in the navigation order', async () => {
    const { ctx } = await bench()
    const entry = ctx.slots.entries('settings.section').find(candidate => candidate.options.id === 'favorite-prompts')
    expect(entry?.options.order).toBe(30)
  })

  it('removes every contribution when the fiber is disposed (HMR safety)', async () => {
    const { ctx, fiber, sources, definitions } = await bench()
    await fiber.dispose()
    expect(definitions).toHaveLength(0)
    expect(sources).toHaveLength(0)
    expect(ctx.slots.entries('conversation.chat.node')).toHaveLength(0)
    expect(ctx.slots.entries('settings.section')).toHaveLength(0)
  })
})
