//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@liyuera/dsh-dev-dock`.
* @module @liyuera/dsh-dev-dock/invariant
*/
const PACKAGE_NAME = "@liyuera/dsh-dev-dock";
/** Cordis companion plugin name. */
const name = "dev-dock-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the plugin owns no cross-plugin event stream. The
* HMR-safety specs prove tool/slot registration disposal, and the settings
* namespace relation is asserted by the schema specs.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
