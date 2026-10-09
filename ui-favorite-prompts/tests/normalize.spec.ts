import { describe, expect, it } from 'vitest'
import { candidateName, normalizeText, previewText } from '../src/client/normalize.ts'

describe('normalizeText', () => {
  it('folds CRLF and lone CR into LF', () => {
    expect(normalizeText('a\r\nb\rc')).toBe('a\nb\nc')
  })

  it('drops trailing whitespace on every line and trims the ends', () => {
    expect(normalizeText('  a  \n b\t\n')).toBe('a\nb')
  })

  it('collapses runs of spaces and tabs inside a line', () => {
    expect(normalizeText('a   b\t\tc')).toBe('a b c')
  })

  it('applies NFC so composed and decomposed forms compare equal', () => {
    expect(normalizeText('e\u0301')).toBe(normalizeText('\u00e9'))
  })

  it('treats a rewritten-word prompt as a different prompt', () => {
    expect(normalizeText('run the tests')).not.toBe(normalizeText('run all the tests'))
  })
})

describe('candidateName', () => {
  it('uses the first non-empty line', () => {
    expect(candidateName('\n\n第一行标题\n正文', new Set())).toBe('第一行标题')
  })

  it('truncates to the candidate name limit by code point', () => {
    const name = candidateName('字'.repeat(60), new Set())
    expect([...name]).toHaveLength(40)
  })

  it('suffixes a duplicate name instead of repeating it', () => {
    const taken = new Set(['同名'])
    expect(candidateName('同名\n正文', taken)).toBe('同名 (2)')
  })
})

describe('previewText', () => {
  it('flattens newlines and truncates with an ellipsis', () => {
    expect(previewText('a\n\nb')).toBe('a b')
    expect(previewText('abcdef', 3)).toBe('abc…')
  })
})
