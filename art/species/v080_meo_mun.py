"""Mèo Mun – sleek black cat, blue-black sheen, yellow-green eyes, question-mark tail."""
from kit import E, L, P, Sprite, bezier

PALETTE = {"fur": "#34365a", "pink": "#e88fa0", "eye": "#c9e23a"}


def cat_eye(s, x, y, w=4, h=4):
    """big cat eye at 64×64 coords (x,y = top-left): green iris, slit pupil, glint"""
    for dx in range(w):
        for dy in range(h):
            if (dx in (0, w - 1)) and (dy in (0, h - 1)):
                continue
            s.px(x + dx, y + dy, "#c9e23a" if dy < h - 1 else "#8fb024")
    for dy in range(h):
        s.px(x + w // 2 - 1, y + dy, "#14121c")
    s.px(x + w // 2, y, "#fbfbe8")


def tail(s, pts, ws):
    s.part(L(pts, ws), "fur")


def front(s: Sprite):
    # question-mark tail
    t = bezier((176, 224), (232, 216), (220, 160), 8) + bezier((220, 160), (212, 96), (180, 100), 8)[1:] + [(170, 112), (172, 126)]
    s.part(L(t, [16] * 9 + [14] * 8 + [12, 11]), "fur")
    # haunch + body
    s.part(E(168, 204, 34, 30), "fur")
    s.part(E(136, 178, 40, 50), "fur")
    # front legs + paws
    s.part(L([(116, 178), (110, 228)], 20), "fur")
    s.part(E(106, 230, 14, 7), "fur")
    s.part(L([(146, 184), (146, 228)], 20), "fur")
    s.part(E(144, 230, 14, 7), "fur")
    # ears
    s.part(P([(60, 84), (58, 28), (100, 62)]), "fur")
    s.part(P([(124, 60), (166, 28), (164, 86)]), "fur")
    s.detail(P([(68, 70), (66, 44), (86, 62)]) | P([(138, 62), (158, 44), (156, 72)]), "pink")
    # head
    s.part(E(112, 104, 56, 44), "fur")
    cat_eye(s, 18, 24)
    cat_eye(s, 29, 24)
    s.px(26, 29, "#e88fa0")
    s.px(25, 31, "#14121c"); s.px(27, 31, "#14121c"); s.px(26, 30, "#14121c")


def back(s: Sprite):
    # sitting, seen from behind, head turned up-right
    s.part(E(120, 190, 52, 44), "fur")                   # haunches
    s.part(E(124, 160, 40, 46), "fur")                   # back
    t = bezier((84, 214), (26, 214), (34, 156), 8) + bezier((34, 156), (40, 96), (72, 100), 8)[1:] + [(82, 112), (80, 126)]
    s.part(L(t, [16] * 9 + [14] * 8 + [12, 11]), "fur")
    s.part(E(160, 228, 16, 8), "fur")
    s.part(E(92, 230, 18, 8), "fur")
    s.part(P([(112, 82), (112, 26), (150, 60)]), "fur")
    s.part(P([(176, 58), (214, 30), (212, 86)]), "fur")
    s.detail(P([(190, 62), (206, 48), (206, 72)]), "pink")
    s.part(E(162, 102, 52, 42), "fur")
    cat_eye(s, 48, 24, w=3)
