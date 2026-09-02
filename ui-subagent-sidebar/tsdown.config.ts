/**
 * Builds the node-half bundles (lib/index.js, lib/invariant.js) and the
 * browser bundle (lib/client.js) with the shared out-of-tree helper
 * (../build/client-bundle.ts). The harness workspace preset only serves
 * packages under packages (group/package glob), so this repo holds its own dynamic client
 * channel. Build from this directory: `tsc -b && tsdown`
 * (bins resolve from the harness root node_modules).
 */
import { clientBundleConfig, nodeLibraryConfig } from '../build/client-bundle.ts'

export default [
  nodeLibraryConfig('@liyuera/dsh-client-ui-subagent-sidebar', ['lib/types/index.js', 'lib/types/invariant.js']),
  clientBundleConfig('@liyuera/dsh-client-ui-subagent-sidebar'),
]
