//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@liyuera/dsh-user-ds-balance`.
* @module @liyuera/dsh-user-ds-balance/invariant
*/
const PACKAGE_NAME = "@liyuera/dsh-user-ds-balance";
/** Cordis companion plugin name. */
const name = "user-ds-balance-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the plugin owns one exact HTTP route whose
* registration conflict fails loud in the webserver at load time, and an
* additive slot entry whose disposal is proven when the plugin unloads. The
* node half emits no cordis events and holds no cross-plugin mutable state;
* the browser readout state is process-local to the page.
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
