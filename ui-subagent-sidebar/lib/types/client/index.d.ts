/**
 * Subagent overview plugin, browser half: contributes two entries to
 * `shell.overlay` — a running-count capsule and a root-grouped overview
 * panel — both fed by the session-list catalog mirrors (`byId`,
 * `subagentsByParent`, workspace archive set), so the package issues no RPC
 * and holds no data of its own. The two entries share one viewing store
 * (open/collapse/filter state) instantiated here.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SubagentSidebarKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Subagent overview copy. */
        'subagentSidebar': SubagentSidebarKey;
    }
}
export type { SubagentSidebarCapsuleProps } from './SubagentSidebarCapsule.tsx';
export type { SubagentSidebarPanelProps, SubagentSidebarPanelInjected } from './SubagentSidebarPanel.tsx';
/** Required services for catalog refresh and slot contributions. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and both overlay entries.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map