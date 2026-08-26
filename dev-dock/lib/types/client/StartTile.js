import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Start-work tile: a 16px rounded square split from top-right to
 * bottom-left — the terminal icon in the upper-left half, the editor icon in
 * the lower-right half, no border or padding, with a soft diagonal seam
 * blending the two halves. Used by the session-header start button and the
 * sidebar start-work button, with app icons when resolvable and
 * app-icon-style fallbacks otherwise.
 * @module @liyuera/dsh-dev-dock/client/StartTile
 */
import { useEffect, useState } from 'react';
import { DevIdeAppIcon, DevTerminalAppIcon } from "./icons.js";
import css from './StartTile.module.css';
/**
 * Render the combined start-work tile.
 * @param props - optional app-icon URLs per half and the tile edge.
 * @returns the split tile.
 */
export function StartTile({ ideSrc, termSrc, size = 16 }) {
    const [failed, setFailed] = useState({ ide: false, term: false });
    // The URLs change when the user reconfigures IDE/terminal in settings; a
    // new URL must re-try the image instead of keeping the old failure latch.
    useEffect(() => {
        setFailed({ ide: false, term: false });
    }, [ideSrc, termSrc]);
    return (_jsxs("span", { className: css.tile, style: { width: size, height: size }, "aria-hidden": "true", children: [_jsx("span", { className: css.halfTerminal, children: failed.term || termSrc === undefined
                    ? _jsx(DevTerminalAppIcon, { size: size, className: css.img })
                    : (_jsx("img", { className: css.img, src: termSrc, alt: "", onError: () => { setFailed(current => ({ ...current, term: true })); } })) }), _jsx("span", { className: css.halfIde, children: failed.ide || ideSrc === undefined
                    ? _jsx(DevIdeAppIcon, { size: size, className: css.img })
                    : (_jsx("img", { className: css.img, src: ideSrc, alt: "", onError: () => { setFailed(current => ({ ...current, ide: true })); } })) })] }));
}
//# sourceMappingURL=StartTile.js.map