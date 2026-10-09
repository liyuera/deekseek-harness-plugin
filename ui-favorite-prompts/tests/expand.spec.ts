import { describe, expect, it } from 'vitest'
import { renderReferenceContext } from '../src/host/expand.ts'
import type { CitedPrompt } from '../src/mentions.ts'

const cited: CitedPrompt[] = [
  { id: 'a', name: 'git-commit-msg', text: '根据git diff 的结果，给我生成commit msg' },
  { id: 'b', name: '运行测试', text: 'Run   the\ntests' },
]

describe('renderReferenceContext', () => {
  it('renders each resolved prompt verbatim under its mention', () => {
    const text = renderReferenceContext([cited[0] as CitedPrompt], [], 0)
    expect(text).toContain('## Referenced saved prompts')
    expect(text).toContain('### @git-commit-msg')
    expect(text).toContain('根据git diff 的结果，给我生成commit msg')
    expect(text).toContain("user's own saved text")
  })

  it('keeps multi-line prompt text intact', () => {
    const text = renderReferenceContext([cited[1] as CitedPrompt], [], 0)
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
