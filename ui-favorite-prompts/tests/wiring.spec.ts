/**
 * Pre-step wiring: one user message citing a saved prompt gains a context
 * message right after it, carrying the prompt text.
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'
import { apply } from '../src/index.ts'
import type { PromptRecord } from '../src/schema.ts'

const AT = 1_700_000_000_000
const records: PromptRecord[] = [
  { id: 'a', name: 'git-commit-msg', text: '根据git diff 的结果，给我生成commit msg', createdAt: AT },
]

/** Domain facility double: opens a table over fixed records. */
function facilityWith(seed: PromptRecord[]) {
  const rows = new Map(seed.map(record => [record.id, record]))
  const table = {
    entries: () => rows.entries(),
    get: (key: string) => rows.get(key),
    put: async (key: string, value: PromptRecord) => { rows.set(key, value) },
    delete: async (key: string) => rows.delete(key),
  }
  return { open: async () => ({ table: () => table, close: async () => {} }), rows }
}

/** Boot the host half with a domain double and no web server. */
function bench(seed: PromptRecord[] = records) {
  const ctx = new Context()
  const facility = facilityWith(seed)
  ctx.provide('storageDomain', facility as never)
  apply(ctx)
  return { ctx, facility }
}

/** Run the pre-step waterfall with one user message, as the loop does. */
async function preStep(ctx: Context, text: string): Promise<{ messages: { source: { kind: string; plugin?: string }; content: unknown[] }[] }> {
  const message = createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  })
  const payload = { messages: [message], turn: 1, step: 1 }
  const decision = await (ctx as unknown as {
    waterfall: (name: string, payload: unknown, fallback: () => Promise<unknown>) => Promise<unknown>
  }).waterfall('agent/pre-step', payload, () => Promise.resolve({ kind: 'enter', messages: [message] }))
  return decision as { messages: { source: { kind: string; plugin?: string }; content: unknown[] }[] }
}

/** Text of one message's first block. */
function textOf(message: { content: unknown[] }): string {
  const block = message.content[0] as { type: string; text: string }
  return block.text
}

describe('agent/pre-step expansion', () => {
  it('appends one plugin-sourced context message after the citing message', async () => {
    const { ctx } = bench()
    await new Promise(resolve => setTimeout(resolve, 0))
    const decision = await preStep(ctx, '照 @git-commit-msg 办')
    expect(decision.messages).toHaveLength(2)
    const context = decision.messages[1]
    expect(context?.source).toEqual({ kind: 'plugin', plugin: 'favorite-prompts' })
    expect(textOf(context as { content: unknown[] })).toContain('### @git-commit-msg')
    expect(textOf(context as { content: unknown[] })).toContain('根据git diff 的结果，给我生成commit msg')
  })

  it('leaves a message without mentions untouched', async () => {
    const { ctx } = bench()
    await new Promise(resolve => setTimeout(resolve, 0))
    const decision = await preStep(ctx, '就是普通的一句话')
    expect(decision.messages).toHaveLength(1)
  })

  it('reports an unresolved mention instead of staying silent', async () => {
    const { ctx } = bench()
    await new Promise(resolve => setTimeout(resolve, 0))
    const decision = await preStep(ctx, '照 @ghost 办')
    expect(decision.messages).toHaveLength(2)
    expect(textOf(decision.messages[1] as { content: unknown[] })).toContain('Unresolved')
  })

  it('does not expand plugin-sourced messages', async () => {
    const { ctx } = bench()
    await new Promise(resolve => setTimeout(resolve, 0))
    const injected = createUserMessage({
      content: [{ type: 'text', text: '照 @git-commit-msg 办' }],
      source: { kind: 'plugin', plugin: 'something-else' },
    })
    const decision = await (ctx as unknown as {
      waterfall: (name: string, payload: unknown, fallback: () => Promise<unknown>) => Promise<unknown>
    }).waterfall('agent/pre-step', { messages: [injected], turn: 1, step: 1 },
      () => Promise.resolve({ kind: 'enter', messages: [injected] })) as { messages: unknown[] }
    expect(decision.messages).toHaveLength(1)
  })
})
