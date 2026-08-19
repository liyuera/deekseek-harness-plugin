/**
 * Host command runner facade: wraps `runNativeCommand` behind an injectable
 * platform seam so platform logic is deterministically testable.
 * @module @liyuera/dsh-dev-dock/platform/runner
 */
import { runNativeCommand } from '@deepseek-ai/dsh-native-command';
/** Default runner: no-shell execFile with utf8 capture. */
export const defaultRunner = runNativeCommand;
/** Build the live platform facts. */
export function liveFacts() {
    return {
        platform: process.platform,
        run: defaultRunner,
        home: process.env.HOME ?? '/tmp',
    };
}
//# sourceMappingURL=runner.js.map