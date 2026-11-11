"""Download one reference photo per VieAni for sketching, with license + author.

    python3 scripts/fetch_refs.py            # photos -> refs/ (git-ignored), credits -> data/ref_credits.json

Sources: iNaturalist (species photos) and Wikimedia Commons (breeds, cultural
art for legendary VieAni). Only Creative Commons / public-domain images are
used. Photos are for drawing reference only: draw your own sprite, do not trace
1:1 if the art will be sold, and keep the credits when sharing the board.
"""
import json, pathlib, re, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "refs"
UA = {"User-Agent": "VieAniRefBoard/0.1 (educational game project)"}
OK_LIC = re.compile(r"^(cc0|cc-by(-sa)?(-nc)?(-nd)?|cc-by-nc(-sa|-nd)?|pd|public domain|cc by|cc-by-sa)", re.I)

# id -> ("commons", search) for breeds, cultural art and species iNaturalist lacks
COMMONS = {
    1: "Lý dynasty dragon sculpture", 2: "Ngọc Lũ bronze drum", 3: "Kim Quy statue",
    4: "Múa lân lion dance Vietnam", 5: "Phượng hoàng Huế phoenix", 6: "Nghê statue Vietnam",
    7: "Đông Hồ painting elephant", 8: "Đông Hồ painting rooster", 9: "Đông Hồ painting horse",
    10: "Thánh Gióng statue Sóc Sơn", 11: "Bạch Long Vĩ island", 12: "Đông Hồ painting fox",
    13: "Vạn Thủy Tú whale skeleton", 16: "Gigantopithecus reconstruction",
    52: "Hmong bobtail dog", 53: "Phu Quoc Ridgeback", 54: "Bac Ha dog", 55: "Lai dog Vietnam",
    56: "Tabby cat", 57: "Black cat", 58: "Calico cat", 59: "Gà Ri chicken", 60: "Dong Tao chicken",
    61: "Vietnamese fighting cock", 62: "Vietnamese pot-bellied pig", 63: "Mong Cai pig", 69: "Horse Vietnam Bac Ha",
}
# better iNaturalist names where the data name is a breed / subspecies / genus placeholder
INAT_NAME = {90: "Oxya chinensis", 14: "Rhinoceros sondaicus", 51: "Canis familiaris", 70: "Anas platyrhynchos domesticus",
             77: "Somanniathelphusa"}


# stand-in species photo when Commons has nothing usable (labelled as a stand-in on the board)
FALLBACK = {12: "Vulpes vulpes", 4: "Panthera leo", 6: "Canis familiaris", 9: "Equus caballus",
            5: "Argusianus argus", 53: "Canis familiaris", 54: "Canis familiaris", 55: "Canis familiaris",
            56: "Felis catus", 57: "Felis catus", 58: "Felis catus", 59: "Gallus gallus", 60: "Gallus gallus",
            61: "Gallus gallus", 62: "Sus scrofa domesticus", 63: "Sus scrofa domesticus", 69: "Equus caballus",
            1: "Varanus salvator", 2: "Antigone antigone", 3: "Rafetus swinhoei", 7: "Elephas maximus",
            8: "Gallus gallus", 10: "Equus caballus", 11: "Pangasianodon gigas", 13: "Megaptera novaeangliae",
            16: "Pongo pygmaeus"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()


def inat(name):
    d = json.loads(get("https://api.inaturalist.org/v1/taxa?" + urllib.parse.urlencode({"q": name, "per_page": 10})))
    # keep only animals whose name matches exactly (avoids e.g. "Oxya" -> a reed, "Mus musculus" -> a wren)
    d["results"] = [t for t in d.get("results", []) if t.get("iconic_taxon_name") not in ("Plantae", "Fungi", "Chromista")
                    and (t.get("name", "").lower() == name.lower() or (t.get("matched_term") or "").lower() == name.lower())]
    for t in d.get("results", []):
        ph = t.get("default_photo") or {}
        if ph.get("medium_url") and OK_LIC.match(ph.get("license_code") or ""):
            return {"url": ph["medium_url"], "author": ph.get("attribution", ""), "license": ph["license_code"],
                    "page": f"https://www.inaturalist.org/taxa/{t['id']}", "matched": t.get("name")}
    # default photo not openly licensed: look through the taxon's other photos
    for t in d.get("results", [])[:1]:
        time.sleep(1.1)
        full = json.loads(get(f"https://api.inaturalist.org/v1/taxa/{t['id']}"))["results"][0]
        for tp in full.get("taxon_photos", []):
            ph = tp.get("photo", {})
            if ph.get("medium_url") and OK_LIC.match(ph.get("license_code") or ""):
                return {"url": ph["medium_url"], "author": ph.get("attribution", ""), "license": ph["license_code"],
                        "page": f"https://www.inaturalist.org/taxa/{t['id']}", "matched": t.get("name")}
    return None


def commons(query):
    q = {"action": "query", "format": "json", "generator": "search", "gsrsearch": query, "gsrnamespace": 6,
         "gsrlimit": 8, "prop": "imageinfo", "iiprop": "url|extmetadata|mime", "iiurlwidth": 500}
    d = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)))
    pages = sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        if not OK_LIC.match(lic.replace(" ", "-").lower()) and "public domain" not in lic.lower():
            continue
        author = re.sub("<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip()
        return {"url": ii.get("thumburl") or ii["url"], "author": author, "license": lic,
                "page": ii.get("descriptionurl"), "matched": p.get("title")}
    return None


def main():
    data = json.loads((ROOT / "data/vieindex.json").read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    cred_p = ROOT / "data/ref_credits.json"
    credits = json.loads(cred_p.read_text(encoding="utf-8")) if cred_p.exists() else {}
    for s in sorted(data["species"], key=lambda s: s["dex"]):
        key = str(s["id"]); img = OUT / f"{s['id']:03d}.jpg"
        if key in credits and img.exists():
            continue
        info = None
        try:
            if s["id"] in COMMONS and "--no-commons" not in sys.argv:
                info = commons(COMMONS[s["id"]]); time.sleep(12)
            if not info and s.get("sci") and s["group"] != "Legendary":
                name = INAT_NAME.get(s["id"], s["sci"].replace(" sp.", ""))
                info = inat(name); time.sleep(1.1)
            if not info and s["id"] in FALLBACK:
                info = inat(FALLBACK[s["id"]]); time.sleep(1.1)
                if info:
                    info["standIn"] = True
            if info:
                raw = get(info["url"]); time.sleep(8)
                from PIL import Image
                import io
                im = Image.open(io.BytesIO(raw)).convert("RGB"); im.thumbnail((600, 600))
                im.save(img, quality=88)
                info["source"] = "iNaturalist" if "inaturalist" in info["page"] else "Wikimedia Commons"
                credits[key] = info
        except Exception as e:  # keep going; report at the end (re-run to retry)
            print("  !", s["vi"], e); time.sleep(45)
        print(f"{s['dex']:03d} {s['vi'][:28]:28} {'ok  ' + credits[key]['source'] if key in credits else 'MISSING'}")
        cred_p.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
    print("photos:", len(credits), "/", len(data["species"]))


if __name__ == "__main__":
    main()
