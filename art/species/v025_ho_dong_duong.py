"""Hổ Đông Dương (Indochinese tiger) – reference VieAni for the sprite kit."""
from kit import E, L, P, Sprite, bezier

PALETTE = {"fur": "#e88a2e", "white": "#f3ecdc", "stripe": "#2b1c16", "pink": "#e59a8f", "nose": "#5a2e22", "dark": "#3a2418"}


def front(s: Sprite):
    # tail (behind everything)
    s.part(L(bezier((188, 178), (236, 160), (226, 104)), [18, 15, 12, 10, 9] * 5), "fur")
    s.detail(L([(216, 132), (234, 128)], 7) | L([(222, 112), (236, 112)], 6), "stripe")
    s.detail(L([(220, 104), (230, 100)], 9), "dark")
    # far legs
    s.part(L([(178, 186), (186, 232)], 26), "fur")
    s.part(L([(118, 186), (122, 232)], 22), "fur")
    # body
    body = E(150, 162, 64, 44, rot=-6)
    s.part(body, "fur")
    s.detail((E(122, 182, 30, 26) & body), "white")
    s.detail((L([(150, 122), (142, 150)], 9) | L([(172, 124), (166, 158)], 9) | L([(194, 136), (188, 168)], 9)
              | L([(128, 124), (124, 146)], 8) | L([(206, 156), (196, 184)], 8)) & body, "stripe")
    # near legs + paws
    s.part(L([(196, 182), (206, 234)], 28), "fur")
    s.part(E(208, 232, 17, 8), "fur")
    leg = L([(98, 172), (92, 234)], 28)
    s.part(leg, "fur")
    s.detail(L([(86, 200), (106, 196)], 6) & leg, "stripe")
    s.part(E(90, 233, 19, 9), "white")
    # head
    head = E(88, 104, 50, 44)
    s.part(P([(46, 66), (52, 34), (78, 58)]), "fur")       # ears
    s.part(P([(98, 56), (120, 30), (128, 64)]), "fur")
    s.detail(P([(54, 60), (56, 44), (70, 58)]), "pink")
    s.detail(P([(106, 56), (118, 40), (122, 60)]), "pink")
    s.part(head, "fur")
    s.detail((P([(40, 116), (58, 150), (88, 148), (62, 118)]) | P([(136, 112), (122, 148), (98, 150), (118, 116)])) & E(88, 112, 54, 46), "white")
    s.detail((L([(72, 64), (78, 84)], 7) | L([(96, 62), (92, 84)], 7) | L([(84, 60), (85, 78)], 6)
              | L([(44, 100), (60, 104)], 6) | L([(132, 98), (118, 104)], 6)) & head, "stripe")
    s.part(E(78, 128, 26, 18), "white")                    # muzzle
    s.part(P([(70, 114), (86, 114), (78, 124)]), "nose", shade=False)
    s.part(L([(66, 136), (78, 140), (90, 136)], 4), "dark", shade=False)
    s.eye(16, 25, "#c9a227", size=3, look=-1)
    s.eye(26, 24, "#c9a227", size=3, look=-1)


def back(s: Sprite):
    # seen from behind-left, looking up-right at the enemy
    s.part(L([(70, 182), (60, 232)], 26), "fur")             # far hind leg
    s.part(L([(160, 168), (172, 230)], 22), "fur")           # far front leg
    body = E(118, 166, 70, 46, rot=-14)
    s.part(body, "fur")
    s.detail((L([(84, 130), (96, 162)], 10) | L([(110, 124), (118, 158)], 10) | L([(136, 118), (140, 152)], 10)
              | L([(62, 152), (76, 180)], 9) | L([(158, 120), (158, 142)], 8)) & body, "stripe")
    # tail curling towards the viewer
    s.part(L(bezier((60, 176), (20, 196), (30, 236)), [20, 18, 15, 12, 10] * 5), "fur")
    s.detail(L([(18, 206), (36, 208)], 7) | L([(22, 222), (40, 220)], 7), "stripe")
    s.detail(L([(28, 232), (36, 238)], 10), "dark")
    s.part(L([(96, 188), (92, 236)], 30), "fur")             # near hind leg
    s.detail(L([(80, 204), (104, 210)], 7), "stripe")
    s.part(E(92, 234, 19, 9), "fur")
    # head from behind (turned up-right)
    head = E(170, 102, 46, 42)
    s.part(P([(134, 76), (130, 38), (162, 62)]), "fur")
    s.part(P([(186, 60), (206, 30), (212, 72)]), "fur")
    s.detail(P([(150, 60), (156, 50), (164, 64)]) | P([(196, 62), (202, 52), (206, 70)]), "white")  # white ear spots
    s.part(head, "fur")
    s.detail((L([(152, 70), (160, 96)], 8) | L([(174, 64), (176, 92)], 8) | L([(196, 76), (190, 100)], 7)
              | L([(134, 104), (148, 112)], 6)) & head, "stripe")
    s.detail(E(206, 118, 14, 12) & head, "white")             # cheek seen at the edge
