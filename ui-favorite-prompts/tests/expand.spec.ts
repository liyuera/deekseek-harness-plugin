import { describe, expect, it } from 'vitest'
import {
  MAX_REFERENCES_PER_MESSAGE, renderReferenceContext, resolveMentions, scanMentions,
} from '../src/host/expand.ts'
import type { PromptRecord } from '../src/schema.ts'

const AT = 1_700_000_000_000
const records: PromptRecord[] = [
  { id: 'a', name: 'git-commit-msg', text: '根据git diff 的结果，给我生成commit msg', createdAt: AT },
  { id: 'b', name: '运行测试', text: 'Run   the\ntests', createdAt: AT },
]

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
  it('splits hits from misses and caps how many expand', () => {
    const result = resolveMentions(['git-commit-msg', 'nope', '运行测试', 'extra'], records)
    expect(result.resolved.map(record => record.name)).toEqual(['git-commit-msg', '运行测试'])
    expect(result.unresolved).toEqual(['nope'])
    expect(result.omitted).toBe(1)
  })

  it('expands nothing when no name resolves', () => {
    expect(resolveMentions(['ghost'], records)).toEqual({ resolved: [], unresolved: ['ghost'], omitted: 0 })
  })

  it('keeps the cap explicit', () => {
    expect(MAX_REFERENCES_PER_MESSAGE).toBe(3)
  })
})

describe('renderReferenceContext', () => {
  it('renders each resolved prompt verbatim under its mention', () => {
    const text = renderReferenceContext([records[0] as PromptRecord], [], 0)
    expect(text).toContain('## Referenced saved prompts')
    expect(text).toContain('### @git-commit-msg')
    expect(text).toContain('根据git diff 的结果，给我生成commit msg')
    expect(text).toContain("user's own saved text")
  })

  it('keeps multi-line prompt text intact', () => {
    const text = renderReferenceContext([records[1] as PromptRecord], [], 0)
    expect(text).toContain('### @运行测试\n\nRun   the\ntests')
  })

  it('explains an unresolved mention instead of staying silent', () => {
    const text = renderReferenceContext([], ['ghost'], 0)
    expect(text).toContain('### @ghost')
    expect(text).toContain('Unresolved')
  })

  it('reports how many mentions were left unexpanded', () => {
    expect(renderReferenceContext([], [], 2)).toContain('2 further mention(s) were not expanded.')
  })
})
