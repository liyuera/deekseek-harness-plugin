import { describe, expect, it } from 'vitest'
import {
  clickExpression,
  focusAndSelectExpression,
  focusExpression,
  readPageExpression,
  readyStateExpression,
  viewportExpression,
} from '../src/expressions.ts'

describe('clickExpression', () => {
  it('clicks the first match and returns hit count', () => {
    const expression = clickExpression('#submit', false)
    expect(expression).toContain('document.querySelector("#submit")')
    expect(expression).toContain('el.click()')
    expect(expression).not.toContain('querySelectorAll')
  })

  it('clicks every match when all is set', () => {
    const expression = clickExpression('a.item', true)
    expect(expression).toContain('document.querySelectorAll("a.item")')
    expect(expression).toContain('n++')
  })

  it('escapes quotes in the selector', () => {
    const expression = clickExpression(`a[data-x="it's"]`, false)
    expect(expression).toContain('"a[data-x=\\"it\'s\\"]"')
  })
})

describe('focus expressions', () => {
  it('focus-only does not select', () => {
    const expression = focusExpression('#inp')
    expect(expression).toContain('el.focus()')
    expect(expression).not.toContain('selectNodeContents')
    expect(expression).not.toContain("typeof el.select")
  })

  it('focus-and-select prefers native select and falls back to a Range', () => {
    const expression = focusAndSelectExpression('#inp')
    expect(expression).toContain('el.focus()')
    expect(expression).toContain("typeof el.select === 'function'")
    expect(expression).toContain('selectNodeContents')
  })
})

describe('readPageExpression', () => {
  it('returns title, url, text and no html by default', () => {
    const expression = readPageExpression(false)
    expect(expression).toContain('document.body.innerText')
    expect(expression).toContain('document.title')
    expect(expression).toContain('location.href')
    expect(expression).toContain(`html: ''`)
  })

  it('includes real html when asked', () => {
    expect(readPageExpression(true)).toContain('document.documentElement.outerHTML')
  })
})

describe('misc expressions', () => {
  it('reports viewport size', () => {
    const expression = viewportExpression()
    expect(expression).toContain('window.innerWidth')
    expect(expression).toContain('window.innerHeight')
  })

  it('reports document readyState', () => {
    expect(readyStateExpression()).toBe('document.readyState')
  })
})
