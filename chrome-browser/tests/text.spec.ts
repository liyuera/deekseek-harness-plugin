import { describe, expect, it } from 'vitest'
import { clipJson, clipText, normalizePageText } from '../src/text.ts'

describe('clipText', () => {
  it('keeps short text untouched', () => {
    expect(clipText('hello', 10)).toBe('hello')
  })

  it('clips by code points and adds a marker', () => {
    expect(clipText('abcdef', 3)).toBe('abc\n…[truncated: 6 chars total]')
  })

  it('never splits surrogate pairs', () => {
    const emoji = '😀'.repeat(20)
    const clipped = clipText(emoji, 5)
    expect(clipped.startsWith('😀'.repeat(5))).toBe(true)
    expect(clipped).toContain('[truncated')
  })
})

describe('normalizePageText', () => {
  it('collapses narrow spaces, trailing line whitespace and blank runs', () => {
    const input = '\u00a0a \n\n\n\nb\n\n'
    expect(normalizePageText(input)).toBe('a\n\nb')
  })
})

describe('clipJson', () => {
  it('pretty-prints and bounds the serialized value', () => {
    expect(clipJson({ a: 1 }, 1000)).toBe(JSON.stringify({ a: 1 }, null, 2))
  })

  it('truncates long output with a marker', () => {
    const out = clipJson({ value: 'x'.repeat(100) }, 50)
    expect(out.startsWith('{\n  "value": "xxx')).toBe(true)
    expect(out).toContain('…[truncated]')
  })

  it('falls back to String for non-serializable values', () => {
    const bigInt: unknown = 123n
    expect(clipJson(bigInt, 100)).toBe('123')
  })
})
