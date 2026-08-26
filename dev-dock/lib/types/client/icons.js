import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Terminal glyph: `>_` command prompt. */
const TERMINAL_STROKE = {
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};
/**
 * IDE glyph: `</>` code brackets.
 * @param props - icon size and optional class.
 * @returns the 16px editor svg.
 */
export function DevIdeIcon({ size = 16, className }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round", className: className, xmlns: "http://www.w3.org/2000/svg", children: [_jsx("path", { d: "M5.0 4.8 2.6 8 5.0 11.2" }), _jsx("path", { d: "M11.0 4.8 13.4 8 11.0 11.2" }), _jsx("path", { d: "M8.7 4.6 7.3 11.4" })] }));
}
/**
 * Terminal glyph: `>_` prompt.
 * @param props - icon size and optional class.
 * @returns the 16px terminal svg.
 */
export function DevTerminalIcon({ size = 16, className }) {
    return (_jsxs("svg", { ...TERMINAL_STROKE, width: size, height: size, viewBox: "0 0 16 16", fill: "none", className: className, xmlns: "http://www.w3.org/2000/svg", children: [_jsx("path", { d: "M4.4 4.8 7.6 8 4.4 11.2" }), _jsx("path", { d: "M8.6 11.2H11.8" })] }));
}
/**
 * App-icon-style terminal fallback: a dark rounded square with a light `>_`
 * prompt, used where the real app icon is unavailable (Assets.car-only
 * bundles, other platforms).
 * @param props - icon size and optional class.
 * @returns the 16px filled terminal svg.
 */
export function DevTerminalAppIcon({ size = 16, className }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", className: className, xmlns: "http://www.w3.org/2000/svg", children: [_jsx("rect", { x: "1.6", y: "1.6", width: "12.8", height: "12.8", rx: "3.4", fill: "#23272E" }), _jsx("path", { d: "M4.7 5.2 7.4 8 4.7 10.8", stroke: "#E8EAED", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M8.1 10.9H11.5", stroke: "#E8EAED", strokeWidth: "1.4", strokeLinecap: "round" })] }));
}
/**
 * App-icon-style editor fallback: a blue rounded square with a white `</>`
 * mark, used where the real app icon is unavailable.
 * @param props - icon size and optional class.
 * @returns the 16px filled editor svg.
 */
export function DevIdeAppIcon({ size = 16, className }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", className: className, xmlns: "http://www.w3.org/2000/svg", children: [_jsx("rect", { x: "1.6", y: "1.6", width: "12.8", height: "12.8", rx: "3.4", fill: "#3D8BFF" }), _jsx("path", { d: "M5.6 5.4 3.3 8 5.6 10.6", stroke: "#FFFFFF", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M10.4 5.4 12.7 8 10.4 10.6", stroke: "#FFFFFF", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M9.1 5.1 7.5 10.9", stroke: "#FFFFFF", strokeWidth: "1.4", strokeLinecap: "round" })] }));
}
//# sourceMappingURL=icons.js.map