"""CGF logo, cut construction.

Built like the REPS wordmark: every letter is made of solid blocks and is cut on the same line,
the middle band (y 80-120). The left stem stops above the band and restarts below it, and the
middle bars start at the stem's inner edge, so pieces only meet at corners. That keeps the
original CGF's 'separate pieces' feel (its floating F bar and G bar) but on one strict system.

From the original it keeps: wide letters, the 45-degree cut corners on the left, and the
slanted bar ends. Units: cap height 200; every bar and stem is 40; every angle is 45 degrees.

  python3 concepts.py           -> prints JSON of SVG strings (used for the Figma board)
  python3 concepts.py --write   -> also writes the SVG files into this folder
"""
import json, os, sys

H, S = 200, 40                 # cap height, stroke
Y1, Y2 = 80, 120               # the cut band (also the middle-bar band)
C_ = 56                        # outer 45-degree corner cut
K = C_ + S * 2 ** 0.5 - S      # matching inner cut, keeps the diagonal 40 thick
BLUE, AMBER, WHITE, INK = '#0A8AF0', '#F2A900', '#FFFFFF', '#0A0B0D'


def top_piece(ox, W):
    """Shared by C, G and F: top bar with a slanted end, 45-degree corner, stem down to the cut."""
    return [(ox + x, y) for x, y in [(C_, 0), (W, 0), (W - S, S), (K, S), (S, K), (S, Y1), (0, Y1), (0, C_)]]


def C(ox, W=300):
    bottom = [(0, Y2), (S, Y2), (S, H - K), (K, H - S), (W - S, H - S), (W, H), (C_, H), (0, H - C_)]
    return [top_piece(ox, W), [(ox + x, y) for x, y in bottom]]


def G(ox, W=312):
    xm = W * 0.5
    lower = [(0, Y2), (S, Y2), (S, H - K), (K, H - S), (W - S, H - S), (W - S, Y2), (xm, Y2), (xm + S, Y1),
             (W, Y1), (W, H - 26), (W - 26, H), (C_, H), (0, H - C_)]
    return [top_piece(ox, W), [(ox + x, y) for x, y in lower]]


def F(ox, W=262):
    wm = W * 0.84
    mid = [(S, Y1), (wm, Y1), (wm - S, Y2), (S, Y2)]
    stem = [(0, Y2), (S, Y2), (S, H), (0, H)]
    return [top_piece(ox, W), [(ox + x, y) for x, y in mid], [(ox + x, y) for x, y in stem]]


GAP = 36
XC, XG, XF = 0, 300 + GAP, 300 + GAP + 312 + GAP
WIDTH = XF + 262


def d(p):
    return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in p) + ' Z'


def svg(parts, w=WIDTH, h=H):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            + ''.join(f'<path d="{d(p)}" fill="{f}"/>' for p, f in parts) + '</svg>')


def wordmark(rest=WHITE, c_top=None, c_bottom=None):
    ct, cb = C(XC)
    parts = [(ct, c_top or rest), (cb, c_bottom or rest)]
    parts += [(p, rest) for p in G(XG)] + [(p, rest) for p in F(XF)]
    return svg(parts)


def mark(c_top=BLUE, c_bottom=AMBER):
    ct, cb = C(0)
    return svg([(ct, c_top), (cb, c_bottom)], w=300, h=H)


OUT = {
    'mono': wordmark(),
    'two': wordmark(WHITE, BLUE, AMBER),
    'mark': mark(),
    'mark_mono': mark(WHITE, WHITE),
    'width': WIDTH,
}

# ---------- tagline: "SECURITY & ELECTRICAL" in Michroma, outlined so the logo never depends on a web font ----------
HERE = os.path.dirname(os.path.abspath(__file__))
TAG = 'SECURITY & ELECTRICAL'
BONE = '#EDEBE6'


def tagline_paths(size, tracking, x0=0.0, y_base=0.0):
    """Outline TAG at `size` px with `tracking` px after each letter. Returns ([(d, is_amp)], width, cap_height)."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    f = TTFont(os.path.join(HERE, 'fonts', 'Michroma-Regular.ttf'))
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
    k = size / f['head'].unitsPerEm
    cap = f['OS/2'].sCapHeight * k
    x, out = x0, []
    for i, ch in enumerate(TAG):
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (k, 0, 0, -k, x, y_base)))
        if pen.getCommands():
            out.append((pen.getCommands(), ch == '&'))
        x += hmtx[name][0] * k + (tracking if i < len(TAG) - 1 else 0)
    return out, x - x0, cap


def fit_tagline(width, pct=14):
    """Font size and tracking so the tagline spans exactly `width` with ~pct% letter spacing."""
    _, w100, _ = tagline_paths(100, 0)
    gaps = len(TAG) - 1
    size = width / (w100 / 100 + gaps * pct / 100)
    _, w0, _ = tagline_paths(size, 0)
    return size, (width - w0) / gaps


def tag_svg(paths, color, amp):
    return ''.join(f'<path d="{d}" fill="{amp if is_amp else color}"/>' for d, is_amp in paths)


def lockup_stacked(word=BONE, top=BLUE, bottom=AMBER, tag=BONE, amp=AMBER):
    """Wordmark over the tagline; the tagline spans the wordmark's exact width."""
    size, tr = fit_tagline(WIDTH)
    gap = 36
    _, _, cap = tagline_paths(size, tr)
    paths, _, _ = tagline_paths(size, tr, 0, H + gap + cap)
    h = H + gap + cap * 1.03  # room for overshoot
    ct, cb = C(XC)
    parts = [(ct, top), (cb, bottom)] + [(p, word) for p in G(XG)] + [(p, word) for p in F(XF)]
    body_ = ''.join(f'<path d="{d(p)}" fill="{f}"/>' for p, f in parts)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {h:.2f}" width="{WIDTH}" height="{h:.2f}" role="img" aria-label="CGF Security &amp; Electrical">'
            + body_ + tag_svg(paths, tag, amp) + '</svg>')


def tagline_line(tag=BONE, amp=AMBER, size=100, pct=8):
    """One-line tagline on its own (for the horizontal lockup); scale it with CSS height."""
    _, _, cap = tagline_paths(size, 0)
    tr = size * pct / 100
    paths, w, _ = tagline_paths(size, tr, 0, cap)
    pad = cap * 0.03  # round letters overshoot the cap line slightly
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-pad:.2f} {w:.2f} {cap + 2 * pad:.2f}" width="{w:.2f}" height="{cap + 2 * pad:.2f}">'
            + tag_svg(paths, tag, amp) + '</svg>')


if __name__ == '__main__':
    if '--write' in sys.argv:
        for k in ('mono', 'two', 'mark'):
            open(os.path.join(HERE, f'cgf-{k}.svg'), 'w').write(OUT[k])
        open(os.path.join(HERE, 'cgf-lockup.svg'), 'w').write(lockup_stacked())
        open(os.path.join(HERE, 'cgf-lockup-on-light.svg'), 'w').write(lockup_stacked(word=INK, tag=INK, amp=BLUE))
        open(os.path.join(HERE, 'cgf-tagline.svg'), 'w').write(tagline_line())
        print('wrote SVGs to', HERE)
    else:
        print(json.dumps(OUT))
