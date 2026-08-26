/**
 * devDock proprietary action glyphs. The product icon set has no
 * IDE/terminal glyphs (IconCodeOutline16 is a hash), so these three are
 * drawn locally in the set's own vocabulary: single color (`currentColor`),
 * 16px viewBox, ~1.4px stroke, the same density as IconPlayOutline16.
 * @module @liyuera/dsh-dev-dock/client/icons
 */
/** Marker props shared by every action glyph. */
export interface ActionIconProps {
    size?: number;
    className?: string | undefined;
}
/**
 * IDE glyph: `</>` code brackets.
 * @param props - icon size and optional class.
 * @returns the 16px editor svg.
 */
export declare function DevIdeIcon({ size, className }: ActionIconProps): import("react").JSX.Element;
/**
 * Terminal glyph: `>_` prompt.
 * @param props - icon size and optional class.
 * @returns the 16px terminal svg.
 */
export declare function DevTerminalIcon({ size, className }: ActionIconProps): import("react").JSX.Element;
/**
 * App-icon-style terminal fallback: a dark rounded square with a light `>_`
 * prompt, used where the real app icon is unavailable (Assets.car-only
 * bundles, other platforms).
 * @param props - icon size and optional class.
 * @returns the 16px filled terminal svg.
 */
export declare function DevTerminalAppIcon({ size, className }: ActionIconProps): import("react").JSX.Element;
/**
 * App-icon-style editor fallback: a blue rounded square with a white `</>`
 * mark, used where the real app icon is unavailable.
 * @param props - icon size and optional class.
 * @returns the 16px filled editor svg.
 */
export declare function DevIdeAppIcon({ size, className }: ActionIconProps): import("react").JSX.Element;
//# sourceMappingURL=icons.d.ts.map