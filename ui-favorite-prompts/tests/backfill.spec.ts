import { describe, expect, it } from 'vitest'
import { backfillNames } from '../src/host/backfill.ts'
import type { PromptRecord } from '../src/schema.ts'

const AT = 1_700_000_000_000

/** In-memory table exposing the surface the backfill reads. */
function tableOf(seed: PromptRecord[]) {
  const rows = new Map(seed.map(record => [record.id, record]))
  return {
    rows,
    entries: () => rows.entries(),
    put: async (key: string, value: PromptRecord) => { rows.set(key, value) },
  }
}

describe('backfillNames', () => {
  it('names every record that lacks one, uniquely, and keeps existing names', async () => {
    const table = tableOf([
      { id: 'a', text: 'git commit message', createdAt: AT },
      { id: 'b', text: 'git commit message', createdAt: AT + 1 },
      { id: 'c', name: 'kept', text: 'whatever', createdAt: AT + 2 },
    ])
    expect(await backfillNames(table)).toBe(2)
    expect(table.rows.get('a')?.name).toBe('git-commit-message')
    expect(table.rows.get('b')?.name).toBe('git-commit-message-2')
    expect(table.rows.get('c')?.name).toBe('kept')
  })

  it('never collides with a name that already exists', async () => {
    const table = tableOf([
      { id: 'a', name: 'git-commit-message', text: 'git commit message', createdAt: AT },
      { id: 'b', text: 'git commit message', createdAt: AT },
    ])
    await backfillNames(table)
    expect(table.rows.get('b')?.name).toBe('git-commit-message-2')
  })

  it('is idempotent', async () => {
    const table = tableOf([{ id: 'a', text: 'git commit message', createdAt: AT }])
    expect(await backfillNames(table)).toBe(1)
    expect(await backfillNames(table)).toBe(0)
  })
})
