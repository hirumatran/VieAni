"""Sao la (Pseudoryx nghetinhensis) – slender forest bovid with two long parallel horns. Grass type."""
from kit import E, L, P, R, Sprite

PALETTE = {"fur": "#a8562c", "white": "#f6efe0", "dark": "#4a2a1e", "horn": "#5b4a48", "hoof": "#33262a",
           "pink": "#d98f84", "leaf": "#6fb04a"}


def leg(s, top, foot, w):
    """slender leg: chestnut, white band above a dark hoof"""
    m = L([top, foot], [w + 4, w])
    s.part(m, "fur")
    y = foot[1]
    s.detail(m & R(0, y - 30, 256, y - 10), "white")
    s.detail(m & R(0, y - 4, 256, 256), "hoof")
    s.detail(m & R(0, y - 34, 256, y - 30), "dark")


def front(s: Sprite):
    # tail with dark tuft
    s.part(L([(208, 146), (224, 172), (224, 190)], [9, 7, 6]), "fur")
    s.part(E(224, 196, 7, 10), "dark")
    # far legs
    leg(s, (184, 180), (180, 234), 12)
    leg(s, (136, 180), (142, 234), 12)
    # body + dark stripe along the spine
    body = E(164, 154, 54, 36, rot=-5)
    s.part(body, "fur")
    s.detail((body - body.shift(0, 9)) & R(132, 0, 256, 256), "dark")
    s.detail(E(150, 182, 34, 10) & body, "white")
    # near legs
    s.part(E(200, 164, 22, 28), "fur")
    leg(s, (204, 180), (212, 234), 14)
    leg(s, (118, 176), (112, 234), 14)
    # neck
    s.part(L([(134, 150), (104, 112)], [50, 38]), "fur")
    # horns: long, straight, nearly parallel, sweeping back
    s.part(L([(112, 74), (184, 22)], [11, 5]), "horn")
    s.part(L([(92, 70), (156, 10)], [11, 5]), "horn")
    # ears
    s.part(E(130, 92, 17, 9, rot=-28), "fur")
    s.part(E(46, 88, 17, 9, rot=24), "fur")
    s.detail(E(44, 89, 10, 4, rot=24), "pink")
    # head: broad brow tapering to a soft muzzle
    head = E(86, 98, 36, 31) | L([(86, 104), (66, 140)], [56, 30])
    s.part(head, "fur")
    s.detail(L([(60, 78), (76, 72)], 8) | L([(96, 72), (114, 78)], 8), "white")          # brow patches
    s.detail((L([(104, 116), (92, 138)], 8) | L([(46, 118), (50, 134)], 7)) & head, "white")   # cheek stripes
    s.detail((E(64, 146, 20, 12) | L([(52, 132), (80, 136)], 7)) & head, "white")       # chin + muzzle band
    s.part(E(62, 131, 13, 7), "hoof", shade=False)                                       # nose
    s.eye(15, 24, "#3a241c", size=4, look=-1)
    s.eye(25, 24, "#3a241c", size=4, look=-1)


def back(s: Sprite):
    # far legs
    leg(s, (168, 176), (176, 232), 12)
    leg(s, (84, 184), (74, 234), 12)
    body = E(116, 162, 60, 38, rot=-12)
    s.part(body, "fur")
    s.detail(L([(60, 150), (110, 128), (160, 118)], 9) & body, "dark")                    # spine stripe
    # tail
    s.part(L([(60, 156), (44, 184), (44, 200)], [10, 8, 6]), "fur")
    s.part(E(44, 206, 8, 11), "dark")
    # near legs
    s.part(E(82, 178, 26, 30), "fur")
    leg(s, (88, 190), (100, 236), 15)
    leg(s, (150, 184), (146, 236), 14)
    # neck
    neck = L([(150, 146), (176, 104)], [50, 38])
    s.part(neck, "fur")
    s.detail(L([(140, 128), (168, 92)], 8) & neck, "dark")
    # ears
    s.part(E(140, 90, 17, 9, rot=24), "fur")
    s.part(E(222, 84, 15, 8, rot=-24), "fur")
    # head from behind, muzzle pointing up-right
    head = E(180, 92, 34, 30) | L([(186, 94), (214, 112)], [46, 26])
    s.part(head, "fur")
    s.detail(E(222, 118, 12, 9) & head, "white")
    s.detail(L([(200, 76), (212, 82)], 7) & head, "white")
    # horns sweeping back towards the viewer
    s.part(L([(184, 70), (118, 22)], [11, 5]), "horn")
    s.part(L([(164, 74), (92, 36)], [11, 5]), "horn")
