import { describe, expect, it } from 'vitest'
import { isValidName, NAME_LIMIT, SLUG_LIMIT, slugify, uniqueName } from '../src/host/slug.ts'

describe('slugify', () => {
  it('joins ASCII words with hyphens', () => {
    expect(slugify('git commit message')).toBe('git-commit-message')
  })

  it('drops punctuation, keeps CJK, and folds whitespace into hyphens', () => {
    expect(slugify('根据git diff 的结果，给我生成commit msg')).toBe('根据git-diff-的结果给我生成commit')
  })

  it('uses the first non-empty line only', () => {
    expect(slugify('\n\n第二行是标题\n正文正文正文')).toBe('第二行是标题')
  })

  it('never ends on a hyphen after truncation', () => {
    expect(slugify('a-very-long-prompt-name-that-exceeds-the-limit')).toBe('a-very-long-prompt-name')
  })

  it('falls back to a stable name when nothing survives', () => {
    expect(slugify('，。！？')).toBe('prompt')
    expect(slugify('   ')).toBe('prompt')
  })

  it('never contains whitespace or a slash', () => {
    const name = slugify('run /test  now')
    expect(name).not.toMatch(/[\s/]/u)
  })

  it('truncates by code point, never splitting a surrogate pair', () => {
    const name = slugify('𠮷'.repeat(40))
    expect([...name]).toHaveLength(SLUG_LIMIT)
    expect(name).not.toContain('\uFFFD')
  })
})

describe('uniqueName', () => {
  it('keeps a free name as is', () => {
    expect(uniqueName('alpha', new Set())).toBe('alpha')
  })

  it('suffixes taken names from two upward', () => {
    expect(uniqueName('alpha', new Set(['alpha']))).toBe('alpha-2')
    expect(uniqueName('alpha', new Set(['alpha', 'alpha-2']))).toBe('alpha-3')
  })
})

describe('isValidName', () => {
  it('accepts letters, digits, CJK, and hyphen', () => {
    expect(isValidName('git-commit-msg')).toBe(true)
    expect(isValidName('根据git-diff的结果')).toBe(true)
  })

  it('rejects whitespace, slashes, and other punctuation', () => {
    expect(isValidName('two words')).toBe(false)
    expect(isValidName('a/b')).toBe(false)
    expect(isValidName('name，')).toBe(false)
    expect(isValidName('')).toBe(false)
  })

  it('rejects names beyond the editable limit', () => {
    expect(isValidName('a'.repeat(NAME_LIMIT))).toBe(true)
    expect(isValidName('a'.repeat(NAME_LIMIT + 1))).toBe(false)
  })
})
