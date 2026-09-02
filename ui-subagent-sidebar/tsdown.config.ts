// Builds the node half (lib/index.js, lib/invariant.js) and the browser
// bundle (lib/client.js) with the harness client-bundle preset. The preset is
// borrowed from the harness checkout via relative path — this repo is
// designed to live at the deepseek-harness root as deekseek-harness-plugin/.
// Build from this directory: `tsc -b && tsdown --env.DSH_BUILD_FACE=client`
// (bins resolve from the harness root node_modules).
import { clientBundle } from '../../packages/client/tsdown.client.ts'

export default clientBundle('@liyuera/dsh-client-ui-subagent-sidebar', ['lib/types/index.js', 'lib/types/invariant.js'])
