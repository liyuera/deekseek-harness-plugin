/**
 * Package-owned invariant companion for `@liyuera/dsh-dev-dock`.
 * @module @liyuera/dsh-dev-dock/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@liyuera/dsh-dev-dock'

/** Cordis companion plugin name. */
export const name = 'dev-dock-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the plugin owns no cross-plugin event stream. The
 * HMR-safety specs prove tool/slot registration disposal, and the settings
 * namespace relation is asserted by the schema specs.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
