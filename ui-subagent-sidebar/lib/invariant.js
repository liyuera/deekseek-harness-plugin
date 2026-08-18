//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@liuyera/dsh-client-ui-subagent-sidebar`.
* @module @liuyera/dsh-client-ui-subagent-sidebar/invariant
*/
const PACKAGE_NAME = "@liuyera/dsh-client-ui-subagent-sidebar";
/** Cordis companion plugin name. */
const name = "client-ui-subagent-sidebar-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: this package is a read-only projection of the
* session-list mirrors (`byId`, `subagentsByParent`, workspace archive set)
* onto one overlay entry pair. It emits no cordis events, owns no
* cross-plugin mutable state, and its slot registrations prove disposal
* through the HMR-safety spec.
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
