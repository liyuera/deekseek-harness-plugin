/**
 * The one mention grammar: what the bubble decorates is what the host expands
 * and what the transcript's citation line lists.
 */
import { describe, expect, it } from 'vitest'
import { MAX_REFERENCES_PER_MESSAGE, resolveMentions, scanMentions } from '../src/mentions.ts'

describe('scanMentions', () => {
  it('finds mentions at the start of the text and after whitespace', () => {
    expect(scanMentions('@git-commit-msg')).toEqual(['git-commit-msg'])
    expect(scanMentions('请照 @git-commit-msg 办')).toEqual(['git-commit-msg'])
    expect(scanMentions('第一行\n@运行测试 开工')).toEqual(['运行测试'])
  })

  it('sheds trailing sentence punctuation, and swallows a glued clause like the decorator does', () => {
    expect(scanMentions('@git-commit-msg。')).toEqual(['git-commit-msg'])
    expect(scanMentions('@git-commit-msg， 然后提交。')).toEqual(['git-commit-msg'])
    // A token runs to the next whitespace: a Chinese comma glued to the name
    // takes the following words with it, exactly as the bubble chip would.
    expect(scanMentions('@git-commit-msg，然后提交')).toEqual(['git-commit-msg，然后提交'])
  })

  it('ignores emails, quoted paths, and file or directory mentions', () => {
    expect(scanMentions('mail me at a@b.com')).toEqual([])
    expect(scanMentions('看 @"docs/with space"')).toEqual([])
    expect(scanMentions('看 @docs/')).toEqual([])
    expect(scanMentions('看 @apps/site.tsx')).toEqual([])
  })

  it('lists each name once, in order of first appearance', () => {
    expect(scanMentions('@a @b @a')).toEqual(['a', 'b'])
  })
})

describe('resolveMentions', () => {
  const lookup = (name: string) => name === 'known' ? { name, text: '正文' } : undefined

  it('splits hits from misses and caps how many resolve', () => {
    const result = resolveMentions(['known', 'missing', 'known2', 'extra'], lookup)
    expect(result.resolved).toEqual([{ name: 'known', text: '正文' }])
    expect(result.unresolved).toEqual(['missing', 'known2'])
    expect(result.omitted).toBe(1)
    expect(result.names).toEqual(['known', 'missing', 'known2'])
  })

  it('keeps the cap explicit', () => {
    expect(MAX_REFERENCES_PER_MESSAGE).toBe(3)
  })
})
