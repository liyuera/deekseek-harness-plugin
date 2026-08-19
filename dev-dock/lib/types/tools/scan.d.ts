/**
 * Deterministic directory scan for frontend project candidates. The tool
 * returns raw signals only — the AI decides which candidates are frontend
 * projects and what their environment is.
 * @module @liyuera/dsh-dev-dock/tools/scan
 */
/** Signals one candidate directory exposes for AI judgment. */
export interface CandidateSignals {
    /** Absolute candidate path. */
    path: string;
    /** Directory basename. */
    name: string;
    /** Has package.json (Node project marker). */
    hasPackageJson: boolean;
    /** Has manifest.json or src/manifest.json (uni-app marker). */
    hasManifest: boolean;
    /** Has project.config.json or miniprogramRoot (miniapp marker). */
    hasMiniappConfig: boolean;
    /** Lock file name when present. */
    lockFile?: string;
    /** Has .nvmrc or .node-version. */
    hasNodeVersionFile: boolean;
    /** Top-level dependencies present in package.json (vue/react/taro/uni-app etc.). */
    dependencies: string[];
    /** script names from package.json. */
    scriptNames: string[];
    /** package.json description when present. */
    description?: string;
}
/**
 * Collect signals for one candidate directory.
 * @param dir - absolute candidate directory.
 * @returns candidate signals.
 */
export declare function collectSignals(dir: string): CandidateSignals;
/**
 * Scan one directory: the directory itself plus its direct children.
 * @param root - absolute directory to scan.
 * @returns candidate signals for the root and each direct subdirectory.
 */
export declare function scanCandidates(root: string): CandidateSignals[];
/** Model-facing tool: scan one directory for frontend project candidates. */
export declare const scanCandidatesTool: import("@deepseek-ai/dsh-tools").ToolDefinition;
//# sourceMappingURL=scan.d.ts.map