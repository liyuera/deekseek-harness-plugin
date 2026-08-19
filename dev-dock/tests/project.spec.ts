/**
 * Project registry logic: upsert semantics (insert vs update overwrite),
 * id minting, cascade removal, and the settings schema validation.
 */
import { describe, expect, it } from 'vitest'
import { DevDockSettingsSchema, type DevDockSettings, type ProjectRecord } from '../src/schema.ts'
import { nextProjectId, removeProject, upsertProject } from '../src/tools/project.ts'

function emptySettings(): DevDockSettings {
  return { projects: [], editors: [], quickStarts: [], terminalApp: 'default' }
}

function project(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: '1',
    name: 'app',
    path: '/tmp/app',
    type: 'node',
    packageManager: 'pnpm',
    scripts: { dev: 'vite' },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('upsertProject', () => {
  it('inserts a new project with a minted id and createdAt', () => {
    const { next, stored } = upsertProject(emptySettings(), {
      path: '/tmp/app',
      name: 'app',
      type: 'node',
      packageManager: 'pnpm',
      scripts: { dev: 'vite' },
    })
    expect(stored.id).toBe('1')
    expect(stored.createdAt).toBeTruthy()
    expect(next.projects).toHaveLength(1)
  })

  it('updates an existing path in place, keeping id and createdAt', () => {
    const current = emptySettings()
    current.projects = [project({ id: '7', createdAt: '2026-01-01T00:00:00.000Z' })]
    const { next, stored } = upsertProject(current, {
      path: '/tmp/app',
      name: 'app',
      type: 'uniapp',
      packageManager: 'npm',
      scripts: {},
    })
    expect(stored.id).toBe('7')
    expect(stored.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(stored.type).toBe('uniapp')
    expect(next.projects).toHaveLength(1)
  })

  it('keeps existing ids stable when inserting multiple projects', () => {
    const first = upsertProject(emptySettings(), {
      path: '/tmp/a', name: 'a', type: 'node', packageManager: 'npm', scripts: {},
    })
    const second = upsertProject(first.next, {
      path: '/tmp/b', name: 'b', type: 'node', packageManager: 'npm', scripts: {},
    })
    expect(second.stored.id).toBe('2')
  })
})

describe('nextProjectId', () => {
  it('returns 1 for an empty list and max+1 otherwise', () => {
    expect(nextProjectId([])).toBe('1')
    expect(nextProjectId([project({ id: '3' }), project({ id: '9' })])).toBe('10')
    expect(nextProjectId([project({ id: 'abc' })])).toBe('1')
  })
})

describe('removeProject', () => {
  it('removes the project and cascades quick-start references', () => {
    const current = emptySettings()
    current.projects = [project({ id: '1' }), project({ id: '2' })]
    current.quickStarts = [{
      name: 'daily',
      items: [
        { projectId: '1', ides: ['WebStorm'] },
        { projectId: '2', ides: [], script: 'dev' },
      ],
    }]
    const result = removeProject(current, '1')
    expect(result).not.toBeNull()
    expect(result?.next.projects.map((p) => p.id)).toEqual(['2'])
    expect(result?.next.quickStarts).toEqual([{
      name: 'daily',
      items: [{ projectId: '2', ides: [], script: 'dev' }],
    }])
  })

  it('returns null for an unknown id', () => {
    const current = emptySettings()
    current.projects = [project({ id: '1' })]
    expect(removeProject(current, 'nope')).toBeNull()
  })

  it('drops quick-start plans that become empty', () => {
    const current = emptySettings()
    current.projects = [project({ id: '1' })]
    current.quickStarts = [{ name: 'solo', items: [{ projectId: '1', ides: [] }] }]
    const result = removeProject(current, '1')
    expect(result?.next.quickStarts).toEqual([])
  })
})

describe('DevDockSettingsSchema', () => {
  it('accepts a valid document', () => {
    const doc = emptySettings()
    doc.projects = [project()]
    expect(() => DevDockSettingsSchema(doc)).not.toThrow()
  })

  it('rejects a project with an invalid type', () => {
    const doc = emptySettings()
    doc.projects = [project({ type: 'desktop' as ProjectRecord['type'] })]
    expect(() => DevDockSettingsSchema(doc)).toThrow()
  })

  it('rejects a project without a path', () => {
    const doc = emptySettings()
    doc.projects = [project()]
    delete (doc.projects[0] as Partial<ProjectRecord>).path
    expect(() => DevDockSettingsSchema(doc)).toThrow()
  })
})
