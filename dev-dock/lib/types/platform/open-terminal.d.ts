/**
 * Cross-platform "open a system terminal window" actions. macOS drives
 * Terminal.app through osascript (iTerm fallback when the config asks for it
 * or Terminal fails); Windows prefers Windows Terminal and falls back to a
 * plain cmd window. Every command goes through the no-shell runner.
 * @module @liyuera/dsh-dev-dock/platform/open-terminal
 */
import type { PlatformFacts } from './runner.ts';
/** Build the shell command executed inside the terminal window. */
export declare function terminalCommand(projectPath: string, command?: string): string;
/**
 * Open a system terminal window at a project directory.
 * @param facts - platform facts.
 * @param projectPath - absolute project path.
 * @param command - optional command to run after cd.
 * @param preferIterm - macOS: prefer iTerm over Terminal.app.
 * @returns ok, or an error message.
 */
export declare function openProjectTerminal(facts: PlatformFacts, projectPath: string, command?: string, preferIterm?: boolean): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}>;
//# sourceMappingURL=open-terminal.d.ts.map