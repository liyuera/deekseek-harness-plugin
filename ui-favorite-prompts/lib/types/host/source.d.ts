declare module '@deepseek-ai/dsh-llm/message' {
    interface MessageSourceMap {
        'favorite-prompts': FavoritePromptsSource;
    }
}
/** One saved-prompt reference message appended after the message that cited it. */
export interface FavoritePromptsSource {
    readonly kind: 'favorite-prompts';
    /** What the message carries: the cited prompts' text. */
    readonly form: 'reference';
    readonly version: 1;
    /** Mention names this message expanded, in citation order. */
    readonly names: readonly string[];
}
/**
 * Build the source of one injected context message.
 * @param names - mention names the message expanded, in citation order.
 * @returns the source field of the message.
 */
export declare function referenceSource(names: readonly string[]): FavoritePromptsSource;
//# sourceMappingURL=source.d.ts.map