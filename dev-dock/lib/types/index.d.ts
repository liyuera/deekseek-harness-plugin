/**
 * devDock plugin, node half. Registers the `dev-dock` settings namespace and
 * the tool set: candidate scanning, project save/list/remove, editor
 * detection, and the desktop actions (open IDE / system terminal /
 * quick-start) behind the approval pipeline.
 * @module @liyuera/dsh-dev-dock
 */
import type { Context } from '@deepseek-ai/cordis';
/** Plugin identity. */
export declare const name = "dev-dock";
/** Services required by the host half. */
export declare const inject: string[];
/**
 * Register the settings namespace and all tools.
 * @param ctx - Cordis context carrying tools, settings, and approval.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map