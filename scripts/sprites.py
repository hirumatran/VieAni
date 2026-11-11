"""Draw 32x32 pixel sprites for every VieAni -> assets/sprites/<id>.png

Each sprite is drawn from the species' known look (colours, horns, crests,
markings), side view facing left. Run: python3 scripts/sprites.py
"""
import json, pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/sprites"
N = 32


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


class S:
    def __init__(self):
        self.im = Image.new("RGBA", (N, N), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def e(self, x0, y0, x1, y1, c):  # ellipse by bounding box
        self.d.ellipse((x0, y0, x1, y1), fill=hx(c))

    def r(self, x0, y0, x1, y1, c):
        self.d.rectangle((x0, y0, x1, y1), fill=hx(c))

    def p(self, pts, c):
        self.d.polygon(pts, fill=hx(c))

    def l(self, pts, c, w=1):
        self.d.line(pts, fill=hx(c), width=w)

    def px(self, x, y, c):
        if 0 <= x < N and 0 <= y < N:
            self.im.putpixel((x, y), hx(c))

    def dots(self, pts, c):
        for x, y in pts:
            self.px(x, y, c)

    def done(self):
        """Add a dark 1px outline around the shape and a light top highlight."""
        src = self.im.copy()
        a = src.load()
        o = self.im.load()
        for y in range(N):
            for x in range(N):
                if a[x, y][3]:
                    continue
                nb = [a[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                      if 0 <= x + dx < N and 0 <= y + dy < N and a[x + dx, y + dy][3]]
                if nb:
                    r, g, b, _ = nb[0]
                    o[x, y] = (int(r * .25 + 20), int(g * .25 + 14), int(b * .25 + 10), 255)
        return self.im


# ---------- shared body parts ----------

def legs(s, xs, top, bot, c, w=2, back=None):
    for i, x in enumerate(xs):
        s.r(x, top, x + w - 1, bot, back if (back and i % 2) else c)


def eye(s, x, y, c="#120c08"):
    s.px(x, y, c)


def quad(s, body, belly=None, bx=(10, 25), by=(12, 21), leg=None, legc=None, lt=19, lb=27, lw=2):
    s.e(bx[0], by[0], bx[1], by[1], body)
    if belly:
        s.e(bx[0] + 2, (by[0] + by[1]) // 2 + 1, bx[1] - 2, by[1], belly)
    legs(s, leg or [bx[0] + 1, bx[0] + 4, bx[1] - 5, bx[1] - 2], lt, lb, legc or body, lw)


def deer(s, body, head, belly, legc=None, small=False):
    if small:
        quad(s, body, belly, bx=(11, 24), by=(15, 22), lt=20, lb=27, lw=1, legc=legc)
        s.p([(12, 17), (9, 13), (12, 12)], body)
        s.e(5, 10, 11, 15, head)
        s.px(4, 13, head)
        return (6, 11)
    quad(s, body, belly, legc=legc, leg=[11, 14, 21, 24])
    s.p([(12, 15), (8, 9), (12, 8), (14, 14)], body)  # neck
    s.e(4, 7, 11, 12, head)
    s.r(3, 10, 6, 12, head)  # muzzle
    s.px(26, 13, body); s.px(27, 14, body)  # tail
    return (7, 9)


def primate(s, fur, face, arm=None, leg=None, chest=None, tail=None, cap=None, big=False):
    if tail:
        s.l([(20, 24), (25, 27), (28, 22), (28, 14)], tail, 2)
    if big:
        s.e(8, 9, 24, 27, fur)
    else:
        s.e(10, 12, 22, 26, fur)
    if chest:
        s.e(12, 15, 18, 24, chest)
    s.r(9, 23, 13, 28, leg or fur)  # legs, sitting
    s.r(18, 23, 22, 28, leg or fur)
    s.l([(11, 15), (7, 21), (8, 25)], arm or fur, 3)  # arm
    hx0 = 8 if big else 9
    s.e(hx0, 3, hx0 + 11, 13, cap or fur)
    s.e(hx0 + 2, 6, hx0 + 9, 12, face)
    eye(s, hx0 + 4, 8); eye(s, hx0 + 7, 8)
    return hx0


def wader(s, body, neck, head, bill, legc, crown=None, bill_shape="straight", short=False):
    if short:
        s.e(12, 13, 24, 22, body)
        s.e(7, 10, 13, 16, head)
        legs(s, [16, 19], 22, 27, legc, 1)
    else:
        s.e(13, 11, 27, 19, body)
        s.p([(27, 14), (31, 17), (26, 18)], body)  # tail
        s.l([(15, 13), (11, 6)], neck, 2)
        s.e(8, 2, 13, 7, head)
        legs(s, [18, 21], 19, 29, legc, 1)
    hx0, hy = (7, 12) if short else (8, 4)
    if crown:
        s.e(hx0, hy - 2 if not short else hy - 2, hx0 + 5, hy + 1, crown)
    if bill_shape == "spoon":
        s.l([(hx0, hy + 1), (hx0 - 5, hy + 2)], bill, 1)
        s.e(hx0 - 7, hy + 1, hx0 - 4, hy + 4, bill)
    elif bill_shape == "short-spoon":
        s.l([(hx0, hy + 1), (hx0 - 3, hy + 1)], bill, 1)
        s.r(hx0 - 5, hy, hx0 - 3, hy + 2, bill)
    elif bill_shape == "curved":
        s.l([(hx0, hy + 1), (hx0 - 3, hy + 3), (hx0 - 5, hy + 7)], bill, 1)
    else:
        s.l([(hx0, hy + 1), (hx0 - 5, hy + 2)], bill, 1)
    eye(s, hx0 + 2, hy)


def turtle(s, shell, skin, pattern=None, soft=False, flipper=False, beak=False):
    if flipper:
        s.p([(10, 18), (3, 24), (11, 22)], skin)
        s.p([(22, 19), (27, 25), (24, 19)], skin)
    else:
        legs(s, [9, 21], 19, 24, skin, 3)
    if soft:
        s.e(6, 11, 28, 22, shell)
    else:
        s.e(8, 9, 26, 22, shell)
        s.r(7, 18, 27, 20, shell)
    if pattern:
        pattern(s)
    s.e(1, 13, 8, 19, skin)  # head
    s.px(26, 18, skin); s.px(27, 19, skin); s.px(28, 19, skin)  # tail
    if beak:
        s.px(1, 17, "#3a2a18")
    eye(s, 3, 15)


def fish(s, body, belly, fin, big=False):
    s.p([(25, 15), (31, 8), (31, 24)], fin)  # tail
    s.e(3, 9, 27, 23 if big else 21, body)
    s.e(5, 16, 25, 23 if big else 21, belly)
    s.p([(13, 10), (18, 4), (20, 10)], fin)  # dorsal
    s.p([(12, 19), (15, 25), (17, 19)], fin)  # pelvic
    eye(s, 7, 14)


def bird_ground(s, body, wing, head, tail, legc="#c48a3a"):
    s.e(9, 11, 23, 22, body)
    s.e(12, 13, 22, 20, wing)
    s.e(5, 5, 12, 12, head)
    s.p([(5, 8), (2, 9), (5, 10)], "#e8c55a")  # beak
    legs(s, [13, 17], 22, 27, legc, 1)
    eye(s, 7, 8)


# ---------- species ----------

def sp_dragon(s):  # Rồng: Lý-Trần style serpentine dragon, gold-green
    g, gd, gold = "#4f9a3f", "#2f6a2c", "#e0b23a"
    body = [(24, 6), (27, 10), (25, 15), (19, 17), (14, 20), (13, 25), (18, 28), (25, 27), (29, 23)]
    s.l(body, g, 4)
    for x, y in body[1::2]:
        s.px(x, y - 2, gold); s.px(x + 1, y - 3, gold)  # dorsal crest
    s.l([(19, 19), (21, 22)], gold, 1); s.l([(15, 24), (12, 27)], gold, 1)  # claws
    s.e(16, 2, 26, 9, g)
    s.p([(17, 5), (10, 7), (17, 8)], g)  # snout
    s.l([(11, 6), (7, 3)], gold, 1); s.l([(12, 8), (7, 11)], gold, 1)  # whiskers
    s.l([(23, 2), (26, 0)], gold, 1)  # crest
    s.px(13, 7, "#ffffff"); eye(s, 19, 5, "#c0202a")
    s.l([(29, 23), (31, 20)], gd, 2)


def sp_lac_bird(s):  # Chim Lạc: Đông Sơn drum bird, bronze, long bill & crest
    b, bl = "#b5813a", "#7a5222"
    s.e(11, 11, 25, 20, b)
    s.p([(24, 13), (31, 9), (31, 13), (25, 17)], bl)  # long tail
    s.p([(14, 11), (22, 4), (24, 12)], bl)  # wing up
    s.l([(13, 13), (10, 6)], b, 2)
    s.e(7, 3, 12, 8, b)
    s.l([(7, 5), (1, 8)], bl, 1)  # long bill
    s.l([(11, 3), (14, 0)], bl, 1); s.l([(10, 3), (12, 0)], bl, 1)  # crest
    legs(s, [16, 19], 20, 27, bl, 1)
    eye(s, 9, 5)
    s.dots([(16, 15), (19, 15), (22, 15)], "#e2b862")


def sp_kim_quy(s):  # golden turtle god
    def pat(s):
        s.e(11, 11, 23, 19, "#f2cf63")
        s.dots([(14, 13), (17, 13), (20, 13), (15, 16), (18, 16)], "#a8771d")
    turtle(s, "#d6a32e", "#6aa063", pattern=pat)
    s.l([(4, 13), (6, 10)], "#f2cf63", 1)  # glint


def sp_lan(s):  # Lân: lion-dance qilin, red & gold with horn
    quad(s, "#d43a2a", "#f2c14a", bx=(11, 26), by=(13, 22), legc="#d43a2a")
    s.e(3, 6, 15, 16, "#e44a32")
    s.e(9, 4, 17, 17, "#f2c14a")  # mane
    s.e(3, 7, 12, 15, "#e44a32")
    s.l([(7, 6), (7, 2)], "#f2c14a", 1)  # single horn
    s.r(3, 13, 8, 14, "#ffffff")  # teeth
    s.px(5, 9, "#ffffff"); eye(s, 6, 9)
    s.p([(26, 14), (31, 10), (30, 17)], "#f2c14a")  # tail tuft


def sp_phoenix(s):  # Phượng Hoàng: red-gold long-tailed bird with fire
    r, gold = "#d8352a", "#f2b331"
    s.l([(20, 17), (26, 23), (31, 29)], gold, 2)
    s.l([(21, 16), (29, 18), (31, 24)], "#f07b2a", 2)
    s.e(10, 10, 22, 19, r)
    s.p([(13, 11), (20, 2), (23, 12)], gold)  # wing
    s.l([(12, 12), (9, 6)], r, 2)
    s.e(6, 2, 11, 7, r)
    s.p([(6, 4), (3, 6), (6, 6)], gold)
    s.l([(10, 2), (13, 0)], gold, 1)
    legs(s, [14, 17], 19, 24, gold, 1)
    eye(s, 8, 4)
    s.dots([(24, 27), (27, 30), (29, 26)], "#ffd86a")  # embers


def sp_nghe(s):  # Nghê: stone temple guardian with curly mane
    st, dk = "#a49c8c", "#7d7566"
    s.r(6, 26, 28, 29, "#6d655a")  # plinth
    s.e(11, 13, 26, 24, st)
    legs(s, [12, 21], 21, 26, st, 3)
    s.e(4, 5, 16, 16, st)
    for x, y in [(12, 5), (15, 8), (16, 12), (13, 15)]:
        s.e(x - 1, y - 1, x + 2, y + 2, dk)  # curls
    s.l([(25, 15), (29, 9), (27, 6)], dk, 2)  # flame tail
    eye(s, 7, 9); s.r(4, 12, 8, 13, "#ece6da")


def sp_nine_elephant(s):  # Voi chín ngà
    sp_elephant(s, "#cfc6b4", "#a99f8b")
    for i, y in enumerate(range(14, 23, 2)):
        s.l([(6, y), (2 - (i % 2), y + 2)], "#fffbe8", 1)
    s.r(13, 9, 22, 11, "#c0392b"); s.r(13, 9, 22, 9, "#e8b43a")  # saddle cloth


def sp_rooster(s):  # Gà chín cựa
    s.p([(20, 10), (30, 6), (28, 16), (31, 20), (22, 20)], "#1f5a3a")  # tail
    bird_ground(s, "#c4402a", "#e07a2a", "#d4552a", None, legc="#e0b84a")
    s.p([(6, 5), (7, 1), (9, 4), (10, 1), (11, 5)], "#e0202a")  # comb
    s.r(6, 11, 7, 13, "#e0202a")  # wattle
    for y in (24, 26):
        s.px(12, y, "#e0b84a"); s.px(20, y, "#e0b84a")  # spurs


def sp_horse(s, coat, mane, legc=None):
    quad(s, coat, None, bx=(11, 27), by=(11, 20), leg=[12, 15, 22, 25], lt=18, lb=28, legc=legc)
    s.p([(13, 13), (8, 5), (12, 3), (16, 12)], coat)  # neck
    s.p([(9, 4), (2, 9), (4, 11), (10, 8)], coat)  # head
    s.l([(12, 3), (15, 9), (16, 13)], mane, 2)
    s.l([(27, 13), (30, 18), (29, 23)], mane, 2)
    s.px(10, 2, coat); eye(s, 8, 5)


def sp_nine_horse(s):
    sp_horse(s, "#f0e8da", "#d02a2a")
    s.l([(11, 2), (14, 7), (15, 11)], "#e8453a", 1)


def sp_iron_horse(s):  # Ngựa sắt Thánh Gióng, breathes fire
    sp_horse(s, "#5b6470", "#2f343c", legc="#4a525d")
    s.p([(3, 9), (0, 6), (0, 14)], "#f07b2a")
    s.p([(2, 9), (0, 8), (0, 11)], "#ffd84a")
    s.dots([(14, 15), (19, 14), (23, 16)], "#8a96a3")  # rivets


def sp_fish_demon(s):  # Ngư Tinh: monstrous sea fish
    fish(s, "#6a2c7a", "#b05a8a", "#c0302a", big=True)
    for x in range(8, 24, 4):
        s.p([(x, 10), (x + 2, 5), (x + 3, 10)], "#c0302a")  # spines
    s.p([(3, 16), (8, 15), (8, 18)], "#ffffff")  # fangs
    s.px(7, 13, "#ffde3a")


def sp_fox(s):  # Hồ Tinh: nine-tailed fox spirit
    for i in range(9):
        s.l([(23, 18), (28 + (i % 3), 4 + i * 2)], ["#f4ede0", "#e8823a", "#f4ede0"][i % 3], 2)
    quad(s, "#e8823a", "#f4ede0", bx=(10, 24), by=(13, 21), leg=[11, 14, 19, 22], lt=19, lb=27, lw=2)
    s.e(3, 8, 12, 16, "#e8823a")
    s.p([(3, 13), (0, 14), (4, 15)], "#e8823a")
    s.p([(5, 9), (6, 4), (8, 9)], "#e8823a"); s.p([(8, 9), (10, 4), (11, 10)], "#e8823a")
    s.r(2, 14, 7, 16, "#f4ede0")
    s.px(5, 11, "#7a2a9a"); s.px(6, 11, "#7a2a9a")
    s.l([(0, 4), (2, 6)], "#a64ad0", 1)


def sp_whale(s):  # Cá Ông
    s.p([(25, 14), (31, 7), (30, 13), (31, 19)], "#3e5f7d")
    s.e(1, 9, 28, 24, "#4d7598")
    s.e(3, 17, 26, 24, "#c6d6e2")
    s.p([(12, 21), (16, 27), (18, 21)], "#3e5f7d")
    s.l([(6, 9), (5, 4)], "#bfe2f5", 1); s.l([(6, 9), (8, 5)], "#bfe2f5", 1)  # spout
    eye(s, 6, 16)


def sp_rhino(s):  # Javan rhino: grey, one small horn, skin folds
    quad(s, "#8a8580", None, bx=(9, 28), by=(11, 23), leg=[11, 14, 22, 25], lt=20, lb=27, lw=3)
    s.e(2, 12, 13, 21, "#8a8580")
    s.p([(3, 13), (4, 9), (6, 13)], "#5a554f")  # horn
    s.p([(10, 12), (11, 9), (13, 12)], "#8a8580")  # ear
    s.l([(16, 12), (16, 22)], "#6a655f"); s.l([(22, 12), (22, 22)], "#6a655f")
    eye(s, 7, 15)


def sp_kouprey(s):  # Kouprey: grey-black wild ox, lyre horns, dewlap
    quad(s, "#4e4a46", None, bx=(10, 27), by=(11, 21), leg=[11, 14, 22, 25], lt=19, lb=28)
    legs(s, [11, 14, 22, 25], 25, 28, "#d8d2c6")  # pale stockings
    s.e(3, 10, 12, 18, "#4e4a46")
    s.p([(8, 18), (14, 24), (14, 18)], "#4e4a46")  # dewlap
    s.l([(9, 10), (13, 5), (11, 2), (8, 2)], "#d6cbb2", 1)  # lyre horns
    s.l([(6, 10), (3, 6), (4, 3)], "#d6cbb2", 1)
    eye(s, 6, 13)


def sp_gigantopithecus(s):
    primate(s, "#b06a34", "#5a3a2a", big=True)
    s.e(10, 12, 13, 14, "#2a1a10")


def sp_tiger(s):
    o, w, k = "#e07a2a", "#f6eadb", "#1e140c"
    quad(s, o, w, bx=(10, 27), by=(12, 22), leg=[11, 14, 22, 25], lt=20, lb=27, lw=3)
    s.l([(26, 15), (30, 12), (31, 7)], o, 2)
    for x in (14, 18, 22):
        s.l([(x, 12), (x - 1, 17)], k, 1)
    s.px(30, 10, k); s.px(31, 8, k)
    s.e(2, 8, 13, 18, o)
    s.e(3, 13, 9, 18, w)
    s.px(4, 8, o); s.px(10, 8, o)
    s.l([(7, 9), (8, 11)], k, 1); s.l([(11, 11), (12, 13)], k, 1)
    eye(s, 6, 12); s.px(2, 14, k)


def sp_edwards(s):  # blue-black, white crest, red face
    s.p([(21, 13), (31, 12), (31, 18), (22, 20)], "#1c2a4a")
    bird_ground(s, "#23305a", "#3a4f86", "#23305a", None, legc="#c0393b")
    s.r(5, 7, 8, 10, "#d0303a")
    s.l([(9, 5), (13, 2)], "#f2f2f2", 2)
    eye(s, 7, 8, "#f2c14a")


def sp_turtle_hk(s):  # Swinhoe's softshell
    def pat(s):
        s.dots([(10, 14), (14, 13), (18, 15), (22, 14), (12, 17), (20, 18), (16, 19)], "#c9bfa5")
    turtle(s, "#6f6a58", "#857e68", pattern=pat, soft=True)
    s.px(0, 15, "#857e68")


def sp_saola(s):  # dark brown, white face stripes, long straight horns
    hx0, hy = deer(s, "#5a3a24", "#4a2e1c", "#6e4a30")
    s.l([(9, 7), (17, 1)], "#2a1c12", 1); s.l([(10, 8), (18, 2)], "#2a1c12", 1)
    s.dots([(5, 8), (6, 9), (8, 10), (5, 11), (4, 11)], "#f2ece0")
    legs(s, [11, 14, 21, 24], 25, 27, "#e8e0d0", 2)
    eye(s, 7, 9)


def sp_muntjac(s):
    deer(s, "#a8562e", "#a8562e", "#d79a6a")
    s.l([(9, 7), (10, 3), (12, 1)], "#e8d8b8", 1); s.l([(10, 3), (8, 2)], "#e8d8b8", 1)
    s.px(9, 6, "#a8562e"); eye(s, 7, 9)


def sp_snub(s):  # Tonkin snub-nosed: black back, cream front, blue face, pink lips
    hx0 = primate(s, "#1e1a18", "#7aa6d6", chest="#efe3cc", arm="#efe3cc", tail="#1e1a18", cap="#1e1a18")
    s.r(hx0 + 4, 11, hx0 + 7, 12, "#e88a8a")
    s.px(hx0 + 5, 9, "#2a1a12"); s.px(hx0 + 6, 9, "#2a1a12")


def sp_delacour(s):  # black with white rump & thighs
    primate(s, "#16120f", "#2a2420", leg="#f2ede4", tail="#16120f")
    s.e(16, 20, 23, 26, "#f2ede4")
    s.px(9, 6, "#ffffff"); s.px(20, 6, "#ffffff")


def sp_catba(s):  # dark body, golden-cream head
    hx0 = primate(s, "#2a2018", "#3a2c22", cap="#f0d79a", tail="#2a2018")
    s.e(hx0 + 2, 6, hx0 + 9, 12, "#3a2c22")
    eye(s, hx0 + 4, 8, "#f0d79a")


def douc(s, legc):  # grey body, white forearms, yellow face, white tail
    hx0 = primate(s, "#8d8a85", "#e8c46a", arm="#f2ede4", leg=legc, tail="#f2ede4", cap="#3a302a")
    s.r(9, 23, 13, 24, "#1e1a18"); s.r(18, 23, 22, 24, "#1e1a18")
    s.r(hx0 + 3, 12, hx0 + 8, 13, "#f2ede4")  # white beard
    eye(s, hx0 + 4, 8); eye(s, hx0 + 7, 8)


def sp_gibbon(s, fur, cheek=None):
    """Hanging from a branch by one long arm."""
    s.r(0, 1, 31, 2, "#7a5a3a")  # branch
    s.l([(13, 3), (11, 10)], fur, 3)  # long raised arm
    s.l([(18, 14), (25, 20), (27, 25)], fur, 3)  # other arm
    s.e(9, 13, 20, 25, fur)
    s.l([(11, 23), (8, 28)], fur, 3); s.l([(17, 23), (19, 28)], fur, 3)
    s.e(5, 6, 15, 15, fur)
    s.e(7, 9, 13, 14, "#4a423c")  # face
    if cheek:
        s.r(5, 10, 6, 13, cheek); s.r(14, 10, 15, 13, cheek)
    s.px(9, 5, fur); s.px(10, 4, fur)  # crest
    s.px(8, 11, "#e8d8a8"); s.px(11, 11, "#e8d8a8")


def sp_rabbit(s):  # Annamite striped rabbit
    s.e(10, 13, 26, 25, "#b08a5a")
    s.e(22, 15, 28, 23, "#c85a2a")  # red rump
    for x in (13, 17, 21):
        s.l([(x, 13), (x + 1, 24)], "#2a1e14", 1)
    s.e(4, 9, 14, 18, "#b08a5a")
    s.p([(9, 10), (11, 2), (13, 3), (12, 11)], "#9a7448")
    s.l([(6, 12), (11, 16)], "#2a1e14", 1)
    legs(s, [11, 20], 23, 27, "#9a7448", 3)
    eye(s, 7, 12); s.px(4, 14, "#d88a8a")


def sp_civet(s):  # Owston's civet: buff with dark bands, banded tail
    quad(s, "#d8c6a0", "#efe4cc", bx=(9, 26), by=(14, 22), leg=[10, 13, 21, 24], lt=20, lb=27)
    for x in (12, 16, 20, 23):
        s.r(x, 14, x + 1, 19, "#2a221a")
    s.l([(25, 18), (31, 21)], "#d8c6a0", 2)
    s.dots([(27, 19), (29, 20), (28, 21), (30, 21)], "#2a221a")
    s.e(3, 13, 12, 19, "#d8c6a0")
    s.p([(3, 16), (0, 17), (3, 18)], "#d8c6a0")
    s.l([(4, 15), (10, 15)], "#2a221a", 1)
    s.px(9, 12, "#d8c6a0"); eye(s, 6, 15, "#f2ede4")


def sp_softshell_giant(s):  # Pelochelys: flat olive pancake
    def pat(s):
        s.dots([(11, 14), (16, 13), (21, 14), (14, 17), (19, 17)], "#7d8a5a")
    turtle(s, "#9aa36c", "#a8b07a", pattern=pat, soft=True)
    s.px(0, 15, "#a8b07a")


def sp_crocodile(s):
    c, b = "#5f7a3a", "#c8c28a"
    s.p([(18, 14), (31, 20), (18, 21)], c)  # tail
    s.e(7, 13, 22, 22, c)
    s.r(0, 15, 9, 19, c)  # snout
    s.r(0, 18, 9, 19, b)
    s.dots([(1, 17), (3, 17), (5, 17), (7, 17)], "#ffffff")
    legs(s, [9, 18], 21, 25, c, 3)
    for x in range(10, 28, 3):
        s.px(x, 13 if x < 22 else 15, "#3e5226")
    eye(s, 8, 14, "#e8d84a"); s.px(8, 13, c)


def sp_pond_turtle(s):  # Mauremys annamensis: dark shell, yellow head stripes
    turtle(s, "#3a3226", "#4a4232")
    s.l([(2, 15), (7, 15)], "#e8cc4a", 1); s.l([(2, 17), (7, 17)], "#e8cc4a", 1)
    s.l([(10, 11), (24, 11)], "#5a4e3a", 1)


def sp_hawksbill(s):
    def pat(s):
        for x, y in [(12, 12), (16, 11), (20, 12), (14, 16), (18, 16), (22, 16)]:
            s.e(x - 1, y - 1, x + 1, y + 1, "#e0a04a")
    turtle(s, "#8a4e22", "#c89a5a", pattern=pat, flipper=True, beak=True)


def sp_ibis(s):
    wader(s, "#4a3e34", "#5a5048", "#8c8c86", "#c8b48a", "#c86a5a", bill_shape="curved")
    s.dots([(17, 13), (20, 13), (23, 13)], "#c8c2b8")


def sp_sandpiper(s):
    wader(s, "#8a6a4a", "#c87a4a", "#c87a4a", "#1e1a18", "#1e1a18", bill_shape="short-spoon", short=True)
    s.e(13, 18, 23, 22, "#f2ede4")


def sp_catfish(s):
    fish(s, "#6a7480", "#c8ccd2", "#5a626c", big=True)


def sp_dolphin(s):  # Irrawaddy: grey, round head, no beak
    s.p([(24, 13), (31, 9), (29, 15), (31, 21)], "#7a8792")
    s.e(2, 9, 27, 22, "#8c99a4")
    s.e(4, 16, 25, 22, "#c6ced4")
    s.p([(14, 10), (17, 6), (19, 10)], "#7a8792")
    s.p([(9, 19), (12, 25), (14, 19)], "#7a8792")
    eye(s, 6, 14)


def sp_elephant(s, body="#8e8a86", dk="#6e6a66"):
    quad(s, body, None, bx=(10, 29), by=(8, 22), leg=[12, 16, 22, 26], lt=19, lb=28, lw=3)
    s.e(2, 6, 14, 18, body)
    s.l([(4, 15), (3, 22), (5, 26)], body, 3)  # trunk
    s.e(9, 8, 15, 17, dk)  # small ear
    s.l([(6, 16), (3, 18)], "#f6efdc", 1)  # tusk
    s.px(29, 14, dk); s.px(30, 17, dk)
    eye(s, 6, 10)


def sp_pangolin(s):
    sc, dk = "#8a6a44", "#5a4228"
    s.l([(22, 22), (28, 19), (31, 14), (29, 10)], sc, 3)
    s.e(8, 12, 25, 24, sc)
    for y in (14, 17, 20):
        for x in range(10 + (y % 2), 24, 3):
            s.l([(x, y), (x + 1, y + 1)], dk, 1)
    s.p([(9, 18), (1, 20), (9, 22)], "#b8987a")  # snout
    legs(s, [11, 19], 23, 26, "#b8987a", 2)
    eye(s, 6, 19)


def sp_spoonbill(s):
    wader(s, "#f2f0ea", "#f2f0ea", "#f2f0ea", "#1e1a18", "#1e1a18", bill_shape="spoon")
    s.r(5, 3, 9, 6, "#1e1a18")
    s.l([(12, 2), (15, 4)], "#e8d08a", 1)


def sp_peafowl(s):
    s.p([(19, 13), (31, 18), (31, 28), (17, 22)], "#2e6a4a")  # train
    for x, y in [(24, 19), (28, 22), (26, 25), (30, 26)]:
        s.e(x - 1, y - 1, x + 1, y + 1, "#2a7aa8"); s.px(x, y, "#f2c14a")
    bird_ground(s, "#3a8a5a", "#4a9a6a", "#2a7a6a", None, legc="#7a7066")
    s.l([(8, 5), (9, 1)], "#3a8a5a", 1); s.l([(9, 5), (11, 1)], "#3a8a5a", 1)
    s.px(9, 0, "#2a7aa8"); s.px(11, 0, "#2a7aa8")
    s.px(7, 9, "#f2d04a")


def sp_crane(s):
    wader(s, "#9aa2aa", "#9aa2aa", "#d03a32", "#5a564e", "#d08a8a", crown="#d03a32")
    s.p([(23, 12), (30, 16), (24, 18)], "#7c848c")


def sp_slow_loris(s):  # pygmy slow loris: orange-brown, huge eyes
    s.l([(0, 27), (31, 27)], "#6a4a2a", 2)
    s.e(9, 12, 25, 26, "#c8834a")
    s.e(6, 4, 19, 16, "#c8834a")
    s.e(8, 7, 12, 11, "#5a321a"); s.e(13, 7, 17, 11, "#5a321a")
    s.px(10, 9, "#f2c84a"); s.px(15, 9, "#f2c84a")
    s.l([(12, 4), (12, 13)], "#f2e2cc", 1)
    s.px(12, 13, "#2a1a10")
    s.l([(10, 18), (6, 25)], "#c8834a", 3)


def sp_clouded(s):
    tn, k = "#b09a72", "#3e3226"
    s.l([(25, 18), (30, 22), (31, 27)], tn, 3)
    quad(s, tn, "#d8cbb0", bx=(10, 27), by=(12, 21), leg=[11, 14, 22, 25], lt=19, lb=27, lw=3)
    for x, y in [(13, 13), (18, 13), (22, 15), (16, 17)]:
        s.r(x, y, x + 2, y + 2, k); s.px(x + 1, y + 1, tn)
    s.dots([(30, 23), (30, 26)], k)
    s.e(3, 9, 13, 18, tn)
    s.px(5, 9, tn); s.px(11, 9, tn)
    s.l([(7, 10), (6, 12)], k, 1)
    eye(s, 6, 13); s.px(3, 15, k)


def sp_hornbill(s):
    s.p([(20, 14), (31, 18), (31, 22), (21, 20)], "#f2ede4")
    s.l([(23, 16), (31, 20)], "#1e1a18", 1)
    s.e(10, 10, 24, 21, "#1e1a18")
    s.r(12, 17, 22, 18, "#f2ede4")  # wing bar
    s.e(6, 5, 13, 12, "#1e1a18")
    s.p([(7, 8), (0, 13), (1, 14), (8, 11)], "#f2c43a")  # bill
    s.r(3, 5, 10, 7, "#f2c43a")  # casque
    legs(s, [14, 18], 21, 25, "#3a3632", 1)
    eye(s, 10, 8, "#d03a32")


def sp_sun_bear(s):
    k = "#1e1a18"
    quad(s, k, None, bx=(9, 27), by=(11, 23), leg=[11, 14, 21, 24], lt=20, lb=27, lw=3)
    s.e(3, 7, 14, 17, k)
    s.e(1, 12, 7, 17, "#c8a46a")  # pale muzzle
    s.e(9, 7, 11, 9, k); s.e(4, 6, 6, 8, k)
    s.l([(10, 18), (13, 20), (16, 18)], "#e8b84a", 1)  # chest crescent
    eye(s, 6, 10, "#8a6a4a")


def sp_chevrotain(s):  # silver-grey rear, rufous front
    deer(s, "#a0603a", "#8a5030", "#c89a6a", small=True)
    s.e(17, 15, 24, 21, "#b8bcc0")
    s.dots([(7, 13), (6, 14)], "#f2ede4")
    eye(s, 7, 12)


def sp_dugong(s):
    s.p([(23, 15), (31, 10), (29, 16), (31, 22)], "#8a7a6a")
    s.e(4, 10, 27, 22, "#9c8c7a")
    s.e(6, 16, 25, 22, "#c2b4a2")
    s.p([(5, 15), (0, 19), (2, 21), (7, 19)], "#9c8c7a")  # down-turned snout
    s.p([(10, 19), (12, 25), (15, 19)], "#8a7a6a")
    eye(s, 7, 14)


SPECIES = {
    1: sp_dragon, 2: sp_lac_bird, 3: sp_kim_quy, 4: sp_lan, 5: sp_phoenix, 6: sp_nghe,
    7: sp_nine_elephant, 8: sp_rooster, 9: sp_nine_horse, 10: sp_iron_horse, 11: sp_fish_demon,
    12: sp_fox, 13: sp_whale, 14: sp_rhino, 15: sp_kouprey, 16: sp_gigantopithecus, 17: sp_tiger,
    18: sp_edwards, 19: sp_turtle_hk, 20: sp_saola, 21: sp_muntjac, 22: sp_snub, 23: sp_delacour,
    24: sp_catba, 25: lambda s: douc(s, "#8a2a22"), 26: lambda s: douc(s, "#8d8a85"),
    27: lambda s: douc(s, "#1e1a18"), 28: lambda s: sp_gibbon(s, "#1e1a18"),
    29: lambda s: sp_gibbon(s, "#1e1a18", cheek="#f2ede4"), 30: sp_pangolin, 31: sp_crocodile,
    32: sp_pond_turtle, 33: sp_softshell_giant, 34: sp_hawksbill, 35: sp_ibis, 36: sp_sandpiper,
    37: sp_catfish, 38: sp_elephant, 39: sp_rabbit, 40: sp_civet, 41: sp_dolphin, 42: sp_peafowl,
    43: sp_spoonbill, 44: sp_slow_loris, 45: sp_crane, 46: sp_clouded, 47: sp_sun_bear,
    48: sp_hornbill, 49: sp_dugong, 50: sp_chevrotain,
}


# ---------- everyday animals, insects, common wildlife (11/2026) ----------

def dog(s, coat, belly=None, ears="up", tail="curl", mark=None):
    if tail == "curl":
        s.l([(25, 14), (28, 10), (26, 8)], coat, 2)
    elif tail == "long":
        s.l([(25, 14), (30, 12)], coat, 2)
    else:
        s.px(26, 13, coat)
    quad(s, coat, belly, bx=(10, 26), by=(12, 21), leg=[11, 14, 21, 24], lt=19, lb=27, lw=2)
    s.p([(12, 14), (9, 8), (13, 8), (15, 13)], coat)
    s.e(3, 6, 12, 13, coat)
    s.r(1, 10, 5, 12, coat)
    if ears == "up":
        s.p([(8, 6), (9, 2), (11, 6)], coat)
    else:
        s.p([(9, 6), (12, 6), (12, 11)], mark or coat)
    if mark:
        s.l([(14, 12), (24, 12)], mark, 1)
    s.px(1, 10, "#1e1a18"); eye(s, 6, 8)


def cat(s, coat, belly=None, stripes=None, patches=None, eyec="#1e1a18"):
    s.l([(24, 18), (29, 14), (29, 8)], coat, 2)
    quad(s, coat, belly, bx=(11, 25), by=(14, 22), leg=[12, 15, 20, 23], lt=20, lb=27, lw=2)
    s.e(4, 9, 13, 17, coat)
    s.p([(5, 10), (5, 5), (8, 9)], coat); s.p([(10, 9), (12, 5), (13, 10)], coat)
    for x in (stripes or []):
        s.l([(x, 14), (x - 1, 18)], stripes and "#6a4a2a", 1)
    for (x, y, c) in (patches or []):
        s.e(x, y, x + 4, y + 3, c)
    eye(s, 7, 12, eyec); eye(s, 10, 12, eyec); s.px(8, 14, "#d88a8a")


def hen(s, body, wing, comb="#e0202a", tail="#1f3a2a", legc="#d0a040", thick=False):
    s.p([(20, 10), (29, 6), (28, 15), (30, 19), (22, 19)], tail)
    bird_ground(s, body, wing, body, None, legc=legc)
    if thick:
        s.r(12, 21, 15, 27, legc); s.r(17, 21, 20, 27, legc)
    s.p([(6, 5), (7, 2), (9, 4), (10, 2), (11, 5)], comb)
    s.r(6, 11, 7, 13, comb)


def pig(s, skin, saddle=None, tusk=False, bristle=None):
    quad(s, skin, None, bx=(9, 27), by=(11, 23), leg=[11, 14, 22, 25], lt=21, lb=27, lw=2)
    if saddle:
        s.e(13, 11, 22, 20, saddle)
    if bristle:
        s.l([(11, 11), (24, 11)], bristle, 1)
    s.e(3, 11, 13, 20, skin)
    s.e(1, 14, 5, 18, "#e8a8a8" if not bristle else "#6a4a3a")
    s.px(2, 16, "#1e1a18"); s.px(3, 16, "#1e1a18")
    s.p([(9, 11), (11, 7), (12, 12)], skin)
    s.l([(26, 14), (28, 13)], skin, 1)
    if tusk:
        s.l([(4, 18), (3, 15)], "#f2ede4", 1)
    eye(s, 7, 14)


def rat(s, fur, belly, big=False):
    s.l([(24, 22), (31, 20)], "#d8a8a0", 1)
    s.e(10, 15 if big else 17, 26, 25, fur)
    s.e(12, 20, 24, 25, belly)
    s.e(3, 15, 13, 23, fur)
    s.p([(3, 19), (0, 20), (3, 21)], fur)
    s.e(8, 12, 12, 16, "#d8a8a0")
    legs(s, [12, 21], 24, 27, "#d8a8a0", 2)
    s.px(0, 20, "#1e1a18"); eye(s, 5, 18)


def bug(s, body, head, wings=None, legsc="#2a1e14", antenna=True, abd=None):
    if wings:
        s.e(10, 6, 24, 16, wings)
    s.e(13, 13, 28, 21, abd or body)
    s.e(8, 12, 15, 20, body)
    s.e(3, 12, 9, 18, head)
    for x in (9, 12, 15):
        s.l([(x, 20), (x - 2, 25), (x - 3, 27)], legsc, 1)
    if antenna:
        s.l([(4, 12), (1, 6)], legsc, 1); s.l([(6, 12), (5, 5)], legsc, 1)
    eye(s, 5, 14)


def lizard(s, body, spots=None, belly=None):
    s.l([(18, 22), (26, 24), (31, 21)], body, 2)
    s.e(8, 16, 22, 23, body)
    if belly:
        s.l([(10, 22), (20, 22)], belly, 1)
    s.e(1, 15, 10, 21, body)
    legs(s, [9, 18], 22, 26, body, 2)
    for (x, y) in (spots or []):
        s.px(x, y, spots and "#f07a3a")
    eye(s, 4, 17)


def frog(s, skin, warts=None):
    s.e(6, 12, 25, 25, skin)
    s.e(3, 10, 14, 20, skin)
    s.e(4, 8, 8, 12, skin); s.e(9, 8, 13, 12, skin)
    s.l([(22, 22), (28, 25), (24, 27)], skin, 3)
    s.l([(10, 22), (6, 27)], skin, 2)
    for (x, y) in (warts or []):
        s.px(x, y, warts and "#3a2a1a")
    eye(s, 6, 10, "#e8c040"); eye(s, 11, 10, "#e8c040")
    s.l([(3, 17), (10, 18)], "#1e1a18", 1)


def sp_buffalo(s):
    quad(s, "#4a4644", None, bx=(9, 28), by=(10, 22), leg=[11, 14, 22, 25], lt=20, lb=28, lw=3)
    s.e(2, 10, 13, 19, "#4a4644")
    s.l([(4, 10), (2, 5), (6, 2), (10, 3)], "#b8ac96", 2)
    s.l([(11, 10), (15, 6), (16, 3)], "#b8ac96", 2)
    s.r(1, 16, 5, 18, "#6a6460"); eye(s, 6, 13)


def sp_goat(s):
    quad(s, "#e8e2d4", None, bx=(10, 25), by=(12, 21), leg=[11, 14, 20, 23], lt=19, lb=27)
    s.e(3, 7, 11, 14, "#e8e2d4")
    s.l([(8, 7), (11, 2)], "#8a7a5a", 1); s.l([(7, 7), (9, 2)], "#8a7a5a", 1)
    s.l([(4, 14), (4, 17)], "#d8d0c0", 2)
    s.px(26, 12, "#e8e2d4"); eye(s, 6, 10)


def sp_duck(s):
    s.e(9, 13, 25, 24, "#9a7a54"); s.e(12, 15, 22, 21, "#7a5a3a")
    s.p([(24, 15), (29, 13), (26, 19)], "#7a5a3a")
    s.l([(11, 14), (8, 8)], "#2f6a4a", 2); s.e(4, 4, 11, 10, "#2f6a4a")
    s.r(0, 7, 4, 8, "#e0a030"); legs(s, [14, 18], 24, 27, "#e0a030", 1)
    eye(s, 7, 6)


def smallbird(s, body, head, wing, bill="#3a3632", mark=None):
    s.p([(20, 15), (28, 17), (27, 20), (20, 19)], wing)
    s.e(9, 12, 22, 21, body); s.e(12, 13, 21, 18, wing)
    s.e(5, 8, 13, 16, head)
    s.p([(5, 11), (1, 12), (5, 13)], bill)
    if mark:
        mark(s)
    legs(s, [13, 16], 21, 25, "#7a6a5a", 1); eye(s, 8, 11)


def sp_carp(s):
    fish(s, "#e07a2a", "#f2c46a", "#d0502a")
    for x in range(10, 24, 3):
        s.l([(x, 11), (x, 18)], "#c8642a", 1)
    s.l([(4, 17), (1, 20)], "#d0502a", 1)


def sp_crab(s):
    s.e(7, 13, 25, 23, "#6a4a3a")
    s.e(1, 9, 8, 15, "#8a5a3a"); s.e(24, 9, 31, 15, "#8a5a3a")
    for x in (9, 13, 19, 23):
        s.l([(x, 22), (x - 2 if x < 16 else x + 2, 27)], "#5a3a2a", 1)
    s.px(13, 12, "#1e1a18"); s.px(19, 12, "#1e1a18")


def sp_snail(s):
    s.e(2, 20, 26, 26, "#c8a87a")
    s.e(9, 7, 27, 24, "#c89a3a"); s.e(13, 11, 23, 20, "#a8782a"); s.e(16, 14, 20, 17, "#c89a3a")
    s.l([(4, 20), (2, 15)], "#c8a87a", 1); eye(s, 2, 15)


def sp_ray(s):
    s.e(3, 9, 25, 23, "#9a8a6a")
    s.l([(24, 16), (31, 16)], "#9a8a6a", 2)
    s.dots([(8, 13), (12, 18), (17, 12), (19, 19), (10, 15)], "#f2ede4")
    s.l([(12, 3), (10, 6), (13, 6), (11, 9)], "#f2d040", 1)
    eye(s, 7, 15)


def sp_jelly(s):
    s.e(6, 4, 26, 18, "#d8a8e0"); s.e(10, 7, 22, 14, "#e8c8f0")
    for x in (8, 12, 16, 20, 24):
        s.l([(x, 16), (x - 1, 22), (x + 1, 28)], "#c888d0", 1)


def sp_squid(s):
    s.e(8, 6, 28, 18, "#e0b8a0")
    s.p([(26, 8), (31, 12), (26, 16)], "#d8a890")
    for y in (14, 16, 18):
        s.l([(9, y), (2, y + 6)], "#e0b8a0", 1)
    s.dots([(14, 10), (18, 12), (22, 9)], "#b07860")
    s.e(0, 24, 5, 29, "#2a2430"); eye(s, 11, 12)


def sp_owl(s):
    s.e(7, 6, 25, 27, "#8a7458"); s.e(11, 14, 21, 26, "#b8a07a")
    s.p([(8, 7), (9, 2), (12, 7)], "#8a7458"); s.p([(20, 7), (23, 2), (24, 7)], "#8a7458")
    s.e(9, 8, 15, 14, "#d8c8a0"); s.e(17, 8, 23, 14, "#d8c8a0")
    s.px(12, 11, "#e07a2a"); s.px(20, 11, "#e07a2a")
    s.p([(15, 13), (16, 16), (17, 13)], "#3a2a1a")
    legs(s, [13, 18], 26, 28, "#d8b870", 1)


def sp_kite(s):
    s.p([(18, 14), (31, 6), (28, 14)], "#6a4a30")
    s.p([(22, 17), (31, 21), (31, 15)], "#5a3a24")
    s.e(8, 11, 24, 21, "#7a5638")
    s.e(4, 7, 12, 14, "#9a7a58")
    s.p([(4, 10), (1, 12), (4, 12)], "#e8c040")
    legs(s, [13, 17], 21, 25, "#e8c040", 1); eye(s, 7, 9)


def snake(s, body, belly, hood=False, pattern=None):
    s.l([(28, 26), (20, 27), (12, 25), (18, 21), (26, 20), (24, 15), (16, 14)], body, 3)
    s.l([(16, 14), (12, 8)], body, 3)
    if hood:
        s.e(8, 2, 17, 12, body); s.e(10, 5, 15, 10, belly)
    s.e(6, 3, 13, 8, body)
    for (x, y) in (pattern or []):
        s.px(x, y, belly)
    s.l([(6, 6), (3, 7)], "#d03a3a", 1); eye(s, 8, 5)


SPECIES.update({
    51: lambda s: dog(s, "#c89a5a", "#efe0c4"),
    52: lambda s: dog(s, "#2a2420", "#c89a5a", tail="bob"),
    53: lambda s: dog(s, "#8a5a32", None, tail="long", mark="#5a3a1e"),
    54: lambda s: dog(s, "#3a3430", "#d8c8a8", ears="up", tail="curl"),
    55: lambda s: dog(s, "#d8a860", "#f2e2c4", tail="long"),
    56: lambda s: cat(s, "#a8885a", "#e8dcc4", stripes=[14, 17, 20, 23]),
    57: lambda s: cat(s, "#1e1a1c", None, eyec="#e8d040"),
    58: lambda s: cat(s, "#f2ede4", None, patches=[(13, 14, "#e08a3a"), (19, 15, "#2a2420"), (6, 9, "#e08a3a")]),
    59: lambda s: hen(s, "#c8742a", "#a8501a"),
    60: lambda s: hen(s, "#e0c8a0", "#c8a070", tail="#4a3a2a", legc="#e8b040", thick=True),
    61: lambda s: hen(s, "#3a2a20", "#8a3a1a", tail="#1a2a20", legc="#e0c060"),
    62: lambda s: pig(s, "#2e2a2c"),
    63: lambda s: pig(s, "#2e2a2c", saddle="#f2e8e0"),
    64: lambda s: rat(s, "#9a9088", "#d8d0c8"),
    65: lambda s: rat(s, "#6a5a4a", "#a89880", big=True),
    66: lambda s: rat(s, "#8a6a4a", "#c8b090"),
    67: sp_buffalo, 68: sp_goat,
    69: lambda s: sp_horse(s, "#a8703a", "#3a2418"),
    70: sp_duck,
    71: lambda s: wader(s, "#f6f4ee", "#f6f4ee", "#f6f4ee", "#1e1a18", "#1e1a18"),
    72: lambda s: smallbird(s, "#a88a6a", "#7a4a2a", "#8a6a4a", mark=lambda s: s.r(7, 13, 9, 14, "#1e1a18")),
    73: lambda s: smallbird(s, "#f2ede4", "#f2ede4", "#2a2622", bill="#1e1a18", mark=lambda s: s.r(5, 14, 12, 15, "#1e1a18")),
    74: lambda s: fish(s, "#7a8a5a", "#c8c8a0", "#5a6a3a"),
    75: sp_carp,
    76: lambda s: (fish(s, "#4a4a3a", "#a8a088", "#3a3a2a"), s.dots([(12, 13), (16, 14), (20, 13)], "#2a2a1e")),
    77: sp_crab, 78: sp_snail,
    79: lambda s: lizard(s, "#d8c8b0", belly="#f2ede4"),
    80: lambda s: lizard(s, "#8a6a3a", belly="#e8d8a0"),
    81: lambda s: frog(s, "#8a6a4a", warts=[(10, 15), (14, 17), (18, 14), (20, 19), (12, 20)]),
    82: lambda s: frog(s, "#7a8a4a"),
    83: lambda s: bug(s, "#7a3a1a", "#5a2a14", wings="#9a4a22"),
    84: lambda s: (bug(s, "#2a2a30", "#2a2a30", wings="#c8d8e8", legsc="#e8e8e8", abd="#3a3a40"), s.l([(3, 15), (0, 18)], "#2a2a30", 1)),
    85: lambda s: (bug(s, "#3a3a30", "#d0503a", wings="#5a5a40", abd="#e8e050"), s.e(22, 15, 29, 21, "#fff27a")),
    86: lambda s: bug(s, "#b8301a", "#a02a14", legsc="#7a1a0a"),
    87: lambda s: bug(s, "#d8902a", "#c07a1a", legsc="#8a5a1a"),
    88: lambda s: (bug(s, "#e0a020", "#3a2a14", wings="#d8e8f0", abd="#e0a020"), [s.l([(x, 14), (x, 20)], "#2a1e14", 1) for x in (17, 21, 25)]),
    89: lambda s: bug(s, "#4a5a3a", "#3a4a2a", wings="#c8e0d8", abd="#5a6a4a"),
    90: lambda s: (bug(s, "#6a9a3a", "#5a8a2a", legsc="#4a7a2a"), s.l([(20, 20), (26, 12), (30, 24)], "#4a7a2a", 2)),
    91: lambda s: (s.e(6, 4, 18, 9, "#d8e8f0"), s.e(6, 11, 18, 16, "#d8e8f0"), s.l([(8, 10), (31, 10)], "#2a6aa8", 2), s.e(2, 7, 8, 13, "#1a4a7a")),
    92: lambda s: (bug(s, "#6aaa4a", "#7aba5a", legsc="#4a8a3a", abd="#5a9a3a"), s.l([(7, 16), (4, 10), (1, 13)], "#4a8a3a", 2)),
    93: lambda s: pig(s, "#4a3a30", tusk=True, bristle="#2a2018"),
    94: lambda s: (cat(s, "#c8a060", "#efe0c4"), s.dots([(14, 15), (17, 17), (20, 15), (23, 17), (16, 19), (22, 19)], "#2a2018")),
    95: lambda s: (primate(s, "#a8885a", "#d88a7a", tail="#a8885a")),
    96: lambda s: (s.e(18, 4, 30, 20, "#8a5a3a"), s.e(6, 12, 22, 25, "#8a6a4a"), s.e(9, 19, 19, 25, "#b8502a"), s.e(2, 8, 11, 16, "#8a6a4a"), s.p([(7, 9), (8, 5), (10, 9)], "#8a6a4a"), legs(s, [8, 16], 23, 27, "#6a4a2a", 2), eye(s, 5, 11)),
    97: lambda s: (deer(s, "#b8682e", "#b8682e", "#e0b080"), s.l([(9, 7), (10, 4)], "#e8d8b8", 1), eye(s, 7, 9)),
    98: lambda s: lizard(s, "#7a8aa8", spots=[(11, 18), (15, 17), (19, 19), (6, 17), (24, 23)]),
    99: lambda s: snake(s, "#4a4030", "#e8d8a0", hood=True),
    100: lambda s: snake(s, "#8a7a4a", "#3a3020", pattern=[(20, 27), (14, 25), (22, 20), (24, 16)]),
    101: sp_ray, 102: sp_jelly, 103: sp_squid, 104: sp_owl, 105: sp_kite,
    106: lambda s: lizard(s, "#4a4a3a", spots=[(12, 18), (16, 19), (20, 18)]),
    107: lambda s: dog(s, "#c0582a", "#efd8b8", tail="long"),
    108: lambda s: (bug(s, "#6a5034", "#5a4028", legsc="#3a2a1a", abd="#7a6040"), s.l([(7, 17), (2, 14)], "#3a2a1a", 2)),
})


def main():
    data = json.loads((ROOT / "data/vindex.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    rows = (len(data["species"]) + 9) // 10
    sheet = Image.new("RGBA", (10 * 34 * 4, rows * 34 * 4), (246, 239, 227, 255))
    for s in data["species"]:
        sp = S()
        SPECIES[s["id"]](sp)
        img = sp.done()
        img.save(OUT / f'{s["id"]:02d}.png')
        i = s["dex"] - 1
        sheet.alpha_composite(img.resize((128, 128), Image.NEAREST), ((i % 10) * 136 + 4, (i // 10) * 136 + 4))
    sheet.save(OUT / "_sheet.png")
    print("drew", len(data["species"]), "sprites ->", OUT)


if __name__ == "__main__":
    main()
