/**
 * Host-half end to end over the real stack: storage hub + JSON backend + domain
 * form + this plugin's `apply`, driven through the real pre-step waterfall.
 *
 * The seeded record is written the way a pre-mention favorite exists on disk
 * (no `name`), so this also proves the open-time backfill against a real medium.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { apply as applyJson } from '@deepseek-ai/dsh-storage-json'
import { apply as applyDomain } from '@deepseek-ai/dsh-storage-domain'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'
import { slugify } from '../src/host/slug.ts'
import { PROMPT_DOMAIN, PROMPT_TABLE } from '../src/schema.ts'
import { apply } from '../src/index.ts'

const AT = 1_700_000_000_000
const PROMPT = '根据git diff 的结果，给我生成commit msg'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

/** Boot the shipped host stack over a throwaway root seeded with one old favorite. */
async function bench(): Promise<{ ctx: Context; root: string; documentPath: string }> {
  const root = await mkdtemp(join(tmpdir(), 'favorite-prompts-e2e-'))
  roots.push(root)
  const tableDir = join(root, PROMPT_DOMAIN, PROMPT_TABLE)
  await mkdir(tableDir, { recursive: true })
  const documentPath = join(tableDir, 'seed-1.json')
  await writeFile(documentPath, `${JSON.stringify({
    version: 1,
    record: { id: 'seed-1', text: PROMPT, createdAt: AT },
  }, null, 2)}\n`)

  const ctx = new Context()
  await ctx.plugin(Storage)
  await ctx.plugin({ name: 'storage-json', inject: ['storage'], apply: applyJson }, { root })
  await ctx.plugin({ name: 'storage-domain', inject: ['storage'], apply: applyDomain }, { backend: 'json' })
  apply(ctx)
  // Let the async open and the backfill settle.
  await new Promise(resolve => setTimeout(resolve, 30))
  return { ctx, root, documentPath }
}

/** Drive one user message through the real pre-step waterfall. */
async function preStep(ctx: Context, text: string): Promise<{ messages: { source: { kind: string }; content: unknown[] }[] }> {
  const message = createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
  return await (ctx as unknown as {
    waterfall: (name: string, payload: unknown, fallback: () => Promise<unknown>) => Promise<unknown>
  }).waterfall('agent/pre-step', { messages: [message], turn: 1, step: 1 },
    () => Promise.resolve({ kind: 'enter', messages: [message] })) as {
      messages: { source: { kind: string }; content: unknown[] }[]
    }
}

/** Text of one message's first block. */
function textOf(message: { content: unknown[] }): string {
  return (message.content[0] as { text: string }).text
}

describe('host half end to end', () => {
  it('names an on-disk favorite at open and expands its mention into the prompt text', async () => {
    const { ctx, documentPath } = await bench()

    // The backfill wrote the minted name back to the medium.
    const stored = JSON.parse(await readFile(documentPath, 'utf-8')) as { record: { name?: string } }
    expect(stored.record.name).toBe(slugify(PROMPT))

    const decision = await preStep(ctx, `照 @${slugify(PROMPT)} 办`)
    expect(decision.messages).toHaveLength(2)
    expect(decision.messages[1]?.source.kind).toBe('plugin')
    expect(textOf(decision.messages[1] as { content: unknown[] })).toContain(PROMPT)
  })

  it('leaves a message without a mention alone', async () => {
    const { ctx } = await bench()
    expect((await preStep(ctx, '普通的一句话')).messages).toHaveLength(1)
  })

  it('tells the model when the cited name is gone', async () => {
    const { ctx } = await bench()
    const decision = await preStep(ctx, '照 @deleted-forever 办')
    expect(decision.messages).toHaveLength(2)
    expect(textOf(decision.messages[1] as { content: unknown[] })).toContain('Unresolved')
  })
})
