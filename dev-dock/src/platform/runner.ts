/**
 * Host command runner facade: wraps `runNativeCommand` behind an injectable
 * platform seam so platform logic is deterministically testable.
 * @module @liyuera/dsh-dev-dock/platform/runner
 */

import { runNativeCommand, type NativeCommandRunner } from '@deepseek-ai/dsh-native-command'

/** Command boundary signature mirrored from native-command. */
export type CommandRunner = NativeCommandRunner

/** Default runner: no-shell execFile with utf8 capture. */
export const defaultRunner: CommandRunner = runNativeCommand

/** Injectable platform facts for deterministic adapter tests. */
export interface PlatformFacts {
  /** Node platform string. */
  platform: NodeJS.Platform
  /** Executable runner (defaults to the real one). */
  run: CommandRunner
  /** HOME directory used by macOS app detection. */
  home: string
}

/** Build the live platform facts. */
export function liveFacts(): PlatformFacts {
  return {
    platform: process.platform,
    run: defaultRunner,
    home: process.env.HOME ?? '/tmp',
  }
}
