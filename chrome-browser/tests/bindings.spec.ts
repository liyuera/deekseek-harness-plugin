import { describe, expect, it } from 'vitest'
import { SessionBindings } from '../src/bindings.ts'

describe('SessionBindings', () => {
  it('sets and reads a full selection per session (first = default)', () => {
    const bindings = new SessionBindings()
    bindings.set('s1', ['tab-a', 'tab-b', 'tab-c'])
    expect(bindings.get('s1')).toBe('tab-a')
    expect(bindings.all('s1')).toEqual(['tab-a', 'tab-b', 'tab-c'])
    expect(bindings.get('s2')).toBeUndefined()
    expect(bindings.all('s2')).toEqual([])
  })

  it('replaces an existing binding', () => {
    const bindings = new SessionBindings()
    bindings.set('s1', ['tab-a'])
    bindings.set('s1', ['tab-b', 'tab-c'])
    expect(bindings.all('s1')).toEqual(['tab-b', 'tab-c'])
    expect(bindings.size).toBe(1)
  })

  it('evicts the least-recently-used entry beyond capacity', () => {
    const bindings = new SessionBindings(2)
    bindings.set('s1', ['t1'])
    bindings.set('s2', ['t2'])
    // Touch s1 so s2 becomes the oldest, then insert a third session.
    expect(bindings.get('s1')).toBe('t1')
    bindings.set('s3', ['t3'])
    expect(bindings.size).toBe(2)
    expect(bindings.get('s1')).toBe('t1')
    expect(bindings.get('s2')).toBeUndefined()
    expect(bindings.get('s3')).toBe('t3')
  })
})
