/**
 * Build the source of one injected context message.
 * @param names - mention names the message expanded, in citation order.
 * @returns the source field of the message.
 */
export function referenceSource(names) {
    return { kind: 'favorite-prompts', form: 'reference', version: 1, names };
}
//# sourceMappingURL=source.js.map