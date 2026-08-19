/**
 * Project registry tools: save (upsert), list, remove. All mutations go
 * through the plugin's settings namespace scope.
 * @module @liyuera/dsh-dev-dock/tools/project
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
/** Wrap a live settings scope behind the tool facade. */
export function scopeOf(scope) {
    return {
        get: () => scope.get(),
        update: (patch) => scope.update(patch),
    };
}
/**
 * Mint the next project id (max numeric id + 1, or "1").
 * @param projects - current project list.
 * @returns the next id.
 */
export function nextProjectId(projects) {
    let max = 0;
    for (const p of projects) {
        const n = Number(p.id);
        if (Number.isInteger(n) && n > max)
            max = n;
    }
    return String(max + 1);
}
/**
 * Upsert one project: same path keeps its id and createdAt (update overwrite).
 * @param current - current document.
 * @param project - candidate project record (id may be empty on insert).
 * @returns the new document and the stored record.
 */
export function upsertProject(current, project) {
    const existing = current.projects.find((p) => p.path === project.path);
    const stored = {
        ...project,
        id: existing?.id ?? project.id ?? nextProjectId(current.projects),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const projects = existing
        ? current.projects.map((p) => (p.path === project.path ? stored : p))
        : [...current.projects, stored];
    return { next: { ...current, projects }, stored };
}
/**
 * Remove one project and cascade-clean its quick-start references.
 * @param current - current document.
 * @param projectId - project id to remove.
 * @returns the new document; false when the id did not exist.
 */
export function removeProject(current, projectId) {
    const projects = current.projects.filter((p) => p.id !== projectId);
    if (projects.length === current.projects.length)
        return null;
    const quickStarts = current.quickStarts
        .map((plan) => ({
        ...plan,
        items: plan.items.filter((item) => item.projectId !== projectId),
    }))
        .filter((plan) => plan.items.length > 0);
    return { next: { ...current, projects, quickStarts } };
}
/** Tool: save one analyzed project (insert or update overwrite). */
export function saveProjectTool(scope) {
    return defineTool({
        name: 'dev-dock_save-project',
        description: 'Save one analyzed frontend project into the devDock registry. Insert when the path is new; update overwrite when it already exists (keeps its id and createdAt). Call once per candidate after the AI analysis judged it a frontend project.',
        parameters: {
            path: { type: 'string', required: true, description: 'Absolute project path' },
            name: { type: 'string', required: true, description: 'Project directory name' },
            type: { type: 'string', required: true, description: 'Project kind: node, uniapp, or miniapp' },
            packageManager: { type: 'string', required: true, description: 'Package manager: npm, pnpm, or yarn' },
            scripts: { type: 'object', additionalProperties: true, description: 'package.json scripts (name to command)' },
            nodeVersion: { type: 'string', description: 'Node version requirement (e.g. "18")' },
            buildCommand: { type: 'string', description: 'Build script name, e.g. "build"' },
            alias: { type: 'string', description: 'Optional display alias' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: { id: { type: 'string', required: true }, path: { type: 'string', required: true } },
            },
            render: (_args, value) => [{ type: 'text', text: `saved project ${value.id} at ${value.path}` }],
        },
        async execute(args) {
            const current = scope.get();
            const record = {
                path: args.path,
                name: args.name,
                type: args.type,
                packageManager: args.packageManager,
                scripts: (args.scripts ?? {}),
            };
            if (args.nodeVersion !== undefined)
                record.nodeVersion = args.nodeVersion;
            if (args.buildCommand !== undefined)
                record.buildCommand = args.buildCommand;
            if (args.alias !== undefined)
                record.alias = args.alias;
            const result = upsertProject(current, record);
            scope.update({ projects: result.next.projects });
            return { id: result.stored.id, path: result.stored.path };
        },
    });
}
/** Tool: list all registered projects. */
export function listProjectsTool(scope) {
    return defineTool({
        name: 'dev-dock_list-projects',
        description: 'List all projects registered in the devDock registry: id, name, path, type, package manager, node version, scripts, build command, alias.',
        parameters: {},
        output: {
            schema: {
                type: 'array',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        id: { type: 'string', required: true },
                        name: { type: 'string', required: true },
                        path: { type: 'string', required: true },
                        alias: { type: 'string' },
                        type: { type: 'string', required: true },
                        packageManager: { type: 'string', required: true },
                        nodeVersion: { type: 'string' },
                        scripts: { type: 'object', additionalProperties: true, required: true },
                        buildCommand: { type: 'string' },
                        createdAt: { type: 'string', required: true },
                    },
                },
            },
            render: (_args, value) => [{ type: 'text', text: formatProjectList(value) }],
        },
        async execute() {
            return scope.get().projects;
        },
    });
}
/** Tool: remove one project from the registry (cascades quick-start references). */
export function removeProjectTool(scope) {
    return defineTool({
        name: 'dev-dock_remove-project',
        description: 'Remove one project from the devDock registry. Only removes the plugin-managed configuration; never touches files on disk. Also removes the project from every quick-start plan.',
        parameters: {
            projectId: { type: 'string', required: true, description: 'Project id from dev-dock_list-projects' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    removed: { type: 'boolean', required: true },
                    id: { type: 'string', required: true },
                },
            },
            render: (_args, value) => [{
                    type: 'text',
                    text: value.removed ? `removed project ${value.id}` : `project ${value.id} not found`,
                }],
        },
        async execute(args) {
            const result = removeProject(scope.get(), args.projectId);
            if (result === null)
                return { removed: false, id: args.projectId };
            scope.update({ projects: result.next.projects, quickStarts: result.next.quickStarts });
            return { removed: true, id: args.projectId };
        },
    });
}
/** Human-readable project listing for the model result. */
function formatProjectList(projects) {
    if (projects.length === 0)
        return 'No projects registered.';
    return projects.map((p) => {
        const record = p;
        const scripts = Object.keys(record.scripts ?? {});
        return `${record.id}\t${record.name}\t${record.type}\t${record.packageManager}`
            + `\t${record.path}\tscripts: ${scripts.join(',') || '-'}`;
    }).join('\n');
}
//# sourceMappingURL=project.js.map