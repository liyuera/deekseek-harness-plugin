/**
 * Start-work tile: a 16px rounded square split from top-right to
 * bottom-left — the terminal icon in the upper-left half, the editor icon in
 * the lower-right half, no border or padding, with a soft diagonal seam
 * blending the two halves. Used by the session-header start button and the
 * sidebar start-work button, with app icons when resolvable and
 * app-icon-style fallbacks otherwise.
 * @module @liyuera/dsh-dev-dock/client/StartTile
 */
/** Tile props: one app-icon URL per half; missing URLs fall back to art. */
export interface StartTileProps {
    /** Editor app icon URL (the IDE half). */
    ideSrc?: string | undefined;
    /** Terminal app icon URL (the terminal half). */
    termSrc?: string | undefined;
    /** Tile edge in pixels (default 16). */
    size?: number;
}
/**
 * Render the combined start-work tile.
 * @param props - optional app-icon URLs per half and the tile edge.
 * @returns the split tile.
 */
export declare function StartTile({ ideSrc, termSrc, size }: StartTileProps): import("react").JSX.Element;
//# sourceMappingURL=StartTile.d.ts.map