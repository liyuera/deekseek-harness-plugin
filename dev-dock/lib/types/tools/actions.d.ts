/**
 * Desktop action tools: open a project in an IDE, open a system terminal at
 * a project (optionally running one script), and run a quick-start plan.
 * All three are user-visible desktop side effects and follow the approval
 * pipeline: `never` policy executes directly, `ask` goes through
 * `ctx.approval.request` with one consolidated question per tool call.
 * @module @liyuera/dsh-dev-dock/tools/actions
 */
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { ApprovalService } from '@deepseek-ai/dsh-user-approval';
import type { DevDockScope } from './project.ts';
import type { PlatformFacts } from '../platform/runner.ts';
/**
 * Decide whether one desktop action may run: the session's effective
 * approval policy, asking through the approval service when the policy is
 * `ask`. The `never` policy never asks — full access executes directly.
 * @param approval - the approval service.
 * @param exec - the live tool execution carrying the agent.
 * @param toolName - tool identity for the audit pair.
 * @param reason - user-facing explanation of the action.
 * @returns true when the action is allowed.
 */
export declare function requireApproval(approval: ApprovalService, exec: ToolRunContext, toolName: string, reason: string): Promise<{
    allowed: true;
} | {
    allowed: false;
    error: string;
}>;
/** Tool: open one project in an IDE. */
export declare function openIdeTool(scope: DevDockScope, facts: PlatformFacts, approval: ApprovalService): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** Tool: open a system terminal at a project, optionally running one script. */
export declare function openTerminalTool(scope: DevDockScope, facts: PlatformFacts, approval: ApprovalService): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** Tool: run one quick-start plan (batch open IDEs + start scripts). */
export declare function quickStartTool(scope: DevDockScope, facts: PlatformFacts, approval: ApprovalService): import("@deepseek-ai/dsh-tools").ToolDefinition;
//# sourceMappingURL=actions.d.ts.map