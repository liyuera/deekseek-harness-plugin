import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
export function probe(ctx) {
    const current = ctx.sessions.list.getSnapshot().current;
    const scoped = ctx.sessions.scope(current);
    void scoped;
    const s = createSnapshotStore(0);
    void s;
}
//# sourceMappingURL=probe.js.map