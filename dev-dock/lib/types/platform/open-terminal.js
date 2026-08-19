/**
 * Cross-platform "open a system terminal window" actions. macOS drives
 * Terminal.app through osascript (iTerm fallback when the config asks for it
 * or Terminal fails); Windows prefers Windows Terminal and falls back to a
 * plain cmd window. Every command goes through the no-shell runner.
 * @module @liyuera/dsh-dev-dock/platform/open-terminal
 */
/** Quote one double-quoted shell fragment for embedding in AppleScript. */
function appleScriptQuote(value) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
/** Build the shell command executed inside the terminal window. */
export function terminalCommand(projectPath, command) {
    return command === undefined
        ? `cd ${appleScriptQuote(projectPath)}`
        : `cd ${appleScriptQuote(projectPath)} && ${command}`;
}
/**
 * Open a macOS terminal window.
 * @param facts - platform facts.
 * @param projectPath - absolute project path.
 * @param command - optional command to run after cd.
 * @param preferIterm - use iTerm instead of Terminal.app.
 * @returns ok, or an error message.
 */
async function openMacTerminal(facts, projectPath, command, preferIterm) {
    const shell = terminalCommand(projectPath, command);
    const signal = new AbortController().signal;
    const app = preferIterm ? 'iTerm' : 'Terminal';
    const firstTry = [
        '-e', `tell application "${app}" to activate`,
        '-e', `tell application "${app}" to do script "${shell.replace(/"/g, '\\"')}"`,
    ];
    try {
        await facts.run('osascript', firstTry, signal);
        return { ok: true };
    }
    catch (error) {
        if (preferIterm) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    // Fallback: the other app.
    try {
        await facts.run('osascript', [
            '-e', 'tell application "iTerm" to activate',
            '-e', 'tell application "iTerm" to tell current window to create tab with default profile command '
                + `"${shell.replace(/"/g, '\\"')}"`,
        ], signal);
        return { ok: true };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
/**
 * Open a Windows terminal window (Windows Terminal, cmd fallback).
 * @param facts - platform facts.
 * @param projectPath - absolute project path.
 * @param command - optional command to run after cd.
 * @returns ok, or an error message.
 */
async function openWinTerminal(facts, projectPath, command) {
    const signal = new AbortController().signal;
    try {
        if (command !== undefined) {
            await facts.run('wt', ['-d', projectPath, 'cmd', '/K', command], signal);
        }
        else {
            await facts.run('wt', ['-d', projectPath], signal);
        }
        return { ok: true };
    }
    catch {
        // wt unavailable: plain cmd window (new console via start).
    }
    try {
        const args = ['/c', 'start', 'cmd', '/K', 'cd', '/d', projectPath];
        if (command !== undefined)
            args.push('&&', command);
        await facts.run('cmd', args, signal);
        return { ok: true };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
/**
 * Open a system terminal window at a project directory.
 * @param facts - platform facts.
 * @param projectPath - absolute project path.
 * @param command - optional command to run after cd.
 * @param preferIterm - macOS: prefer iTerm over Terminal.app.
 * @returns ok, or an error message.
 */
export async function openProjectTerminal(facts, projectPath, command, preferIterm = false) {
    if (facts.platform === 'win32')
        return openWinTerminal(facts, projectPath, command);
    return openMacTerminal(facts, projectPath, command, preferIterm);
}
//# sourceMappingURL=open-terminal.js.map