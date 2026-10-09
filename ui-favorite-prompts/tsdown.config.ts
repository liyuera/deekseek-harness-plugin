/**
 * Builds the host bundle (lib/index.js) and the browser bundle (lib/client.js)
 * with this repo's shared out-of-tree helper. Build with `npx tsc -b && npx
 * tsdown --config-loader tsx` from this directory.
 */
import { clientBundleConfig, nodeLibraryConfig } from '../build/client-bundle.ts'

export default [
  nodeLibraryConfig('@liyuera/dsh-favorite-prompts', ['lib/types/index.js']),
  clientBundleConfig('@liyuera/dsh-favorite-prompts'),
]
