/**
 * Host-half integration: the real storage stack (hub + JSON backend + domain
 * form) under the plugin's own domain declaration, driven through the route's
 * protocol layer. This is the closest verification to the shipped path that
 * runs without booting a web server.
 */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { apply as applyJson } from '@deepseek-ai/dsh-storage-json'
import { apply as applyDomain } from '@deepseek-ai/dsh-storage-domain'
import { favoritesDomain } from '../src/domain.ts'
import { handlePromptRequest, type PromptTable } from '../src/host/route.ts'
import { PROMPT_DOMAIN, PROMPT_TABLE, type PromptRecord } from '../src/schema.ts'

const AT = 1_700_000_000_000
const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

/** Boot the shipped host stack over a throwaway data root. */
async function boot(): Promise<{ ctx: Context; root: string }> {
  const root = await mkdtemp(join(tmpdir(), 'favorite-prompts-'))
  roots.push(root)
  const ctx = new Context()
  await ctx.plugin(Storage)
  await ctx.plugin({ name: 'storage-json', inject: ['storage'], apply: applyJson }, { root })
  await ctx.plugin({ name: 'storage-domain', inject: ['storage'], apply: applyDomain }, { backend: 'json' })
  return { ctx, root }
}

describe('favoritesDomain over the real storage stack', () => {
  it('writes one JSON document per prompt and answers the route protocol', async () => {
    const { ctx, root } = await boot()
    const domain = await ctx.storageDomain.open(favoritesDomain)
    const table = domain.table(PROMPT_TABLE) as unknown as PromptTable

    const created = await handlePromptRequest(table, { method: 'POST', body: { text: '第一条提示词' } }, () => AT)
    expect(created.ok).toBe(true)
    const id = created.ok && 'item' in created ? created.item.id : ''
    expect(id).not.toBe('')

    const files = await readdir(join(root, PROMPT_DOMAIN, PROMPT_TABLE))
    expect(files).toEqual([`${id}.json`])
    const document = JSON.parse(await readFile(join(root, PROMPT_DOMAIN, PROMPT_TABLE, `${id}.json`), 'utf-8'))
    expect(document).toEqual({
      version: 1,
      record: { id, name: '第一条提示词', text: '第一条提示词', createdAt: AT },
    })

    const listed = await handlePromptRequest(table, { method: 'GET' })
    expect(listed).toEqual({
      ok: true,
      items: [{ id, name: '第一条提示词', text: '第一条提示词', createdAt: AT }],
    })

    await handlePromptRequest(table, { method: 'PATCH', body: { id, text: '改过的提示词' } })
    const afterUpdate = await handlePromptRequest(table, { method: 'GET' })
    expect(afterUpdate.ok && 'items' in afterUpdate ? afterUpdate.items[0]?.text : undefined).toBe('改过的提示词')

    await handlePromptRequest(table, { method: 'DELETE', queryId: id })
    expect(await readdir(join(root, PROMPT_DOMAIN, PROMPT_TABLE))).toEqual([])
    expect(await handlePromptRequest(table, { method: 'DELETE', queryId: id })).toEqual({
      ok: false,
      error: expect.stringContaining('404'),
    })

    await domain.close()
  })

  it('reads back records written before a reopen', async () => {
    const { ctx, root } = await boot()
    const first = await ctx.storageDomain.open(favoritesDomain)
    const record: PromptRecord = { id: 'fixed-id', text: '存下来', createdAt: AT }
    await first.table(PROMPT_TABLE).put('fixed-id', record)
    await first.close()

    // A second open over the same root: the domain loads what the medium holds.
    const reopened = await ctx.storageDomain.open({ ...favoritesDomain })
    expect(reopened.table(PROMPT_TABLE).get('fixed-id')).toEqual(record)
    await reopened.close()
    expect(await readdir(join(root, PROMPT_DOMAIN, PROMPT_TABLE))).toEqual(['fixed-id.json'])
  })
})
