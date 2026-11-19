// VieIndex habitat banners – animated "HD pixel art" (PO 19 Nov 2026: "64-bit" = high-detail pixel art), one live scene per
// habitat. Drawn every frame on a 280×90 canvas shown at 2× with hard pixel edges. Method after huashu-art-motion (MIT):
// low-res canvas, ordered dithering, per-layer outlines, a main motion + small loops so the picture stays alive. Original art.
// API: VieHabitat.start(canvas, "Forest") → stop()
(function () {
  const W = 280, H = 90;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function painter(g) {
    const P = {
      px(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); },
      /** vertical gradient through colour stops, 4×4 ordered dithering between steps (8 steps per segment) */
      grad(y0, y1, stops, x0 = 0, x1 = W) {
        const n = stops.length - 1;
        for (let y = y0; y < y1; y++) {
          const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * n, i = Math.min(n - 1, Math.floor(t)), f = (t - i) * 8;
          const lo = Math.floor(f) / 8, hi = Math.min(1, lo + 1 / 8), frac = (f - Math.floor(f)) * 16;
          const ca = mix(stops[i], stops[i + 1], lo), cb = mix(stops[i], stops[i + 1], hi);
          for (let x = x0; x < x1; x++) { g.fillStyle = frac > BAYER[(y % 4) * 4 + (x % 4)] ? cb : ca; g.fillRect(x, y, 1, 1); }
        }
      },
      disc(cx, cy, r, c) { g.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - w), Math.round(cy + y), 2 * w + 1, 1); } },
      /** shaded blob: dark rim, mid body, lit top-left, highlight */
      blob(cx, cy, r, [dk, md, lt, hl]) {
        P.disc(cx, cy, r, dk); P.disc(cx, cy - 0.5, r - 1, md);
        P.disc(cx - r * 0.25, cy - r * 0.3, Math.max(1, r * 0.6), lt); if (hl) P.disc(cx - r * 0.4, cy - r * 0.45, Math.max(1, r * 0.25), hl);
      },
      /** silhouette below a wavy line with a lit edge and atmospheric haze toward `haze` */
      ridge(base, amp, freq, col, seed, edge, jag = 0) {
        const r = rng(seed), ph = r() * 6;
        for (let x = 0; x < W; x++) {
          const y = Math.round(base - amp * (0.55 * Math.sin(x * freq + ph) + 0.3 * Math.sin(x * freq * 2.3 + ph * 2) + 0.15 * Math.sin(x * freq * 5.1)) - jag * r());
          P.px(x, y, 1, H - y, col); if (edge) P.px(x, y, 1, 1, edge);
        }
      },
      cloud(x, y, w, t, [dk, md, lt]) {
        for (let i = 0; i < w; i += 3) { const r = 3 + Math.round(2 * Math.sin((i / w) * Math.PI) + 1); P.disc(x + i, y + 1, r, dk); }
        for (let i = 0; i < w; i += 3) { const r = 2 + Math.round(2 * Math.sin((i / w) * Math.PI) + 1); P.disc(x + i, y, r, md); }
        for (let i = 2; i < w - 4; i += 4) P.disc(x + i - 1, y - 1, 1 + Math.round(Math.sin((i / w) * Math.PI)), lt);
      },
      /** water: gradient + moving shimmer streaks + optional mirrored reflection band */
      water(y0, stops, t, shimmer, seed = 1, speed = 6) {
        P.grad(y0, H, stops);
        const r = rng(seed);
        for (let k = 0; k < 70; k++) {
          const y = y0 + 1 + Math.floor(r() * (H - y0 - 1)), len = 2 + Math.floor(r() * 5 * (1 + (y - y0) / 30));
          const x = Math.floor((r() * W + t * speed * (0.5 + (y - y0) / 40)) % (W + 10)) - 5;
          if (Math.floor(t * 3 + k) % 4) P.px(x, y, len, 1, shimmer);
        }
      },
      reflect(ySrc0, ySrc1, yDst, tint, alpha = 0.45) {
        const img = g.getImageData(0, ySrc0, W, ySrc1 - ySrc0);
        for (let i = 0; i < ySrc1 - ySrc0; i++) {
          const y = yDst + i; if (y >= H) break;
          g.putImageData(img, 0, y - i, 0, ySrc1 - ySrc0 - 1 - i, W, 1);
        }
        g.globalAlpha = alpha; g.fillStyle = tint; g.fillRect(0, yDst, W, Math.min(H - yDst, ySrc1 - ySrc0)); g.globalAlpha = 1;
      },
      rays(x0, slope, n, col, alpha = 0.18) { g.globalAlpha = alpha; g.fillStyle = col; for (let k = 0; k < n; k++) for (let y = 0; y < H; y += 1) { const x = Math.round(x0 + k * 14 - y * slope); g.fillRect(x, y, 5 + (k % 2) * 3, 1); } g.globalAlpha = 1; },
      bird(x, y, t, c, phase = 0) { const f = Math.floor(t * 6 + phase) % 3; P.px(x, y, 2, 1, c); if (f === 0) { P.px(x - 2, y - 1, 2, 1, c); P.px(x + 2, y - 1, 2, 1, c); } else if (f === 1) { P.px(x - 2, y, 2, 1, c); P.px(x + 2, y, 2, 1, c); } else { P.px(x - 2, y + 1, 2, 1, c); P.px(x + 2, y + 1, 2, 1, c); } },
      grass(y, n, t, cols, seed, hmin = 4, hmax = 9, wind = 1) {
        const r = rng(seed);
        for (let i = 0; i < n; i++) { const x = r() * W, h = hmin + r() * (hmax - hmin), c = cols[Math.floor(r() * cols.length)], ph = r() * 6;
          for (let k = 0; k < h; k++) P.px(x + Math.round(Math.sin(t * 2 + ph) * wind * (k / h) * 2), y - k, 1, 1, c); }
      },
      palm(x, y, h, t, [trunk, dk, md, lt]) {
        const sway = Math.sin(t * 1.4 + x) * 1.5;
        for (let k = 0; k < h; k++) P.px(x + Math.round(Math.sin(k / h * 1.6) * 3 + sway * k / h), y - k, 2, 1, k % 3 ? trunk : mix(trunk, "#000000", 0.3));
        const tx = x + Math.round(Math.sin(1.6) * 3 + sway), ty = y - h;
        for (let a = 0; a < 7; a++) { const ang = -Math.PI * 0.95 + a * 0.32 + Math.sin(t * 2 + a) * 0.05;
          for (let rr = 1; rr < 13; rr++) { const xx = tx + Math.cos(ang) * rr, yy = ty + Math.sin(ang) * rr * 0.55 + rr * rr / 22; P.px(xx, yy, 2, 1, rr < 4 ? dk : rr < 9 ? md : lt); } }
      },
      house(x, y, w, roof, wall, door = "#4a3628") {
        P.px(x, y, w, 12, wall); P.px(x, y + 11, w, 1, mix(wall, "#000000", 0.25));
        for (let i = 0; i < 7; i++) P.px(x - 4 + i, y - 1 - i, w + 8 - 2 * i, 1, i === 0 ? mix(roof, "#000000", 0.35) : i < 3 ? roof : mix(roof, "#ffffff", 0.15));
        P.px(x + Math.floor(w / 2) - 2, y + 4, 5, 8, door); P.px(x + 3, y + 3, 4, 4, "#2f6f7a"); P.px(x + w - 7, y + 3, 4, 4, "#2f6f7a");
      },
      smoke(x, y, t, c) { for (let k = 0; k < 6; k++) { const p = ((t * 0.5 + k / 6) % 1); g.globalAlpha = 0.55 * (1 - p); P.disc(x + Math.sin(p * 5 + k) * 3 + p * 6, y - p * 26, 1 + Math.round(p * 3), c); } g.globalAlpha = 1; },
    };
    return P;
  }

  // ---------------------------------------------------------------- scenes (t = seconds)
  const S = {};
  S.Forest = (P, t) => {
    P.grad(0, 52, ["#f3e3b8", "#cfe6d8", "#9fd0cf", "#79b6bd"]);
    P.ridge(30, 8, 0.03, "#7aa6a0", 1, "#a9cbc2"); P.ridge(36, 6, 0.05, "#5f908a", 2, "#86b2a8");
    P.rays(170, 0.55, 4, "#fff6d0", 0.16);
    for (let y = 36; y < 44; y++) for (let x = 0; x < W; x++) if ((x + Math.floor(t * 5) + y * 3) % 5 === 0) P.px(x, y, 1, 1, "#e3efe6");
    const r = rng(7);
    for (let i = 0; i < 30; i++) P.blob(r() * W, 46 + r() * 8, 5 + r() * 5, ["#1f4a33", "#2f6b4f", "#3f8a5a", null]);
    for (const [x, rad] of [[22, 18], [104, 14], [236, 19]]) { P.px(x - 2, 50, 5, 40, "#4a3628"); P.px(x - 2, 50, 1, 40, "#6b4d34");
      P.blob(x, 38, rad, ["#16342a", "#245c3e", "#3f8a4f", "#8fcf6a"]); P.blob(x - rad * 0.7, 46, rad * 0.55, ["#16342a", "#2f6b4f", "#5aa04a", null]); }
    P.px(0, 82, W, 8, "#1f4a33");
    P.grass(86, 80, t, ["#5aa04a", "#8fcf6a", "#3f8a45"], 3, 5, 12);
    for (let i = 0; i < 9; i++) { const x = (i * 37 + Math.sin(t * 0.9 + i) * 10 + 300) % W, y = 60 + (i * 13) % 20 + Math.sin(t * 1.7 + i * 2) * 3; if (Math.floor(t * 2.5 + i) % 3) P.px(x, y, 1, 1, "#fff3a0"); }
    for (let i = 0; i < 4; i++) { const p = (t * 0.12 + i * 0.25) % 1; P.px(40 + i * 60 + Math.sin(p * 12) * 4, 30 + p * 52, 2, 1, i % 2 ? "#d99a2b" : "#8fcf6a"); }
  };
  S.Field = (P, t) => {
    P.grad(0, 34, ["#fbe6b4", "#cfe8e8", "#9fd3e0"]); P.disc(48, 14, 7, "#fff1c4"); P.disc(48, 14, 5, "#fff8de");
    P.cloud(((150 - t * 3) % 320 + 320) % 320 - 30, 9, 30, t, ["#d6e3e6", "#eef4f2", "#ffffff"]);
    P.ridge(30, 6, 0.04, "#7f9c96", 3, "#a5bdb5"); P.ridge(36, 5, 0.07, "#6c9a6a", 4, "#93b884");
    const cols = ["#9ccf6b", "#c9d86a", "#e7c05f", "#b9d36b", "#7fbf5a"];
    for (let b = 0; b < 12; b++) { const y0 = 38 + b * 4.5;
      for (let x = 0; x < W; x++) { const yy = Math.round(y0 + 2.2 * Math.sin(x * 0.035 + b * 0.8)); P.px(x, yy, 1, 5, cols[b % 5]); P.px(x, yy, 1, 1, "#7a5a32");
        if ((x + b * 7 + Math.floor(t * 4)) % 9 === 0) P.px(x, yy + 1, 1, 1, mix(cols[b % 5], "#ffffff", 0.35)); } }
    P.house(212, 44, 18, "#7a4a2a", "#c28245"); P.smoke(222, 36, t, "#e6e0d4");
    P.bird(((t * 14) % 320) - 20, 20, t, "#2b1d14"); P.bird(((t * 14) % 320) - 10, 24, t, "#2b1d14", 1);
  };
  S.Village = (P, t) => {
    P.grad(0, 46, ["#f6d6a8", "#f3e6c4", "#cfe6e0"]); P.disc(230, 18, 8, "#fff1c4");
    P.ridge(42, 4, 0.05, "#7fa59a", 5);
    for (let x = 0; x < W; x += 5) { const h = 22 + ((x * 7) % 9), sway = Math.round(Math.sin(t * 1.6 + x * 0.3) * 1.5);
      for (let y = 0; y < h; y++) P.px(x + Math.round(sway * y / h), 56 - y, 1, 1, y % 6 === 0 ? "#2f6b3a" : "#4f8a45");
      for (let k = 0; k < 4; k++) P.px(x + sway - 1 + k, 56 - h - (k % 2), 1, 1, "#7fbf5a"); }
    P.house(40, 52, 32, "#b33a2a", "#e6cf9a"); P.house(170, 54, 26, "#8c1c13", "#efdcae");
    P.smoke(60, 42, t, "#d9d2c6");
    P.blob(118, 40, 15, ["#1f4a33", "#2f6b4f", "#4f8a45", "#8fcf6a"]); P.px(116, 52, 4, 14, "#4a3628");
    P.grad(64, H, ["#c28245", "#a8703a"]);
    for (let x = 0; x < W; x += 3) P.px(x, 64 + (x * 5) % 26, 2, 1, "#8a5a32");
    const cx = (t * 10) % 320 - 20; P.px(cx, 72, 4, 3, "#f3eee5"); P.px(cx + 3, 70, 2, 2, "#f3eee5"); P.px(cx + 4, 69, 1, 1, "#c0392b"); P.px(cx + 1, 75, 1, 2, "#e7c05f");
  };
  S.Home = (P, t) => {
    P.grad(0, 58, ["#f3e1b8", "#e9cf98"]);
    for (let y = 2; y < 58; y += 6) { P.px(0, y, W, 1, "#d8b77a"); for (let x = (Math.floor(y / 6) % 2) * 7; x < W; x += 14) P.px(x, y, 1, 6, "#d8b77a"); }
    P.px(26, 10, 46, 48, "#5a3a24"); P.px(30, 14, 18, 44, "#7a4a2a"); P.px(50, 14, 18, 44, "#7a4a2a"); P.px(48, 14, 2, 44, "#4a2c1a");
    for (let k = 0; k < 4; k++) { P.px(33, 18 + k * 10, 12, 1, "#a8703a"); P.px(53, 18 + k * 10, 12, 1, "#a8703a"); }
    P.px(170, 16, 50, 26, "#5a3a24"); P.grad(19, 39, ["#bfe3ef", "#8fcbe0"], 173, 217); for (let k = 0; k < 5; k++) P.px(173 + k * 11, 19, 1, 20, "#5a3a24");
    const sw = Math.sin(t * 1.5) * 2; P.px(124 + sw, 0, 1, 10, "#2b1d14"); P.disc(124 + sw, 15, 5, "#c0392b"); P.disc(124 + sw, 14, 3, "#e8603c"); P.px(123 + sw, 20, 3, 3, "#e7c05f");
    P.grad(58, H, ["#c26a4a", "#a14f36"]);
    for (let y = 58; y < H; y += 6) { P.px(0, y, W, 1, "#7a3a26"); for (let x = (Math.floor(y / 6) % 2) * 8; x < W; x += 16) P.px(x, y, 1, 6, "#7a3a26"); }
    for (const x of [100, 248]) { P.px(x - 6, 48, 12, 10, "#b33a2a"); P.px(x - 6, 48, 12, 1, "#e8603c"); P.blob(x, 40, 8, ["#1f4a33", "#2f6b4f", "#4f8a45", null]);
      for (let k = 0; k < 6; k++) P.disc(x - 5 + (k * 7) % 11, 34 + (k * 5) % 11, 1, "#f39a2b"); }
    const p = (t * 0.3) % 1; P.px(150 + Math.sin(p * 8) * 10, 30 + p * 30, 2, 1, "#fff6d0");
  };
  S.Sea = (P, t) => {
    P.grad(0, 40, ["#f7c9a0", "#f6dcc0", "#cfe6ee", "#9fd0e6"]); P.disc(70, 34, 9, "#fff1c4");
    P.cloud(((200 - t * 2) % 320 + 320) % 320 - 30, 12, 34, t, ["#e8cdbb", "#f6e3d6", "#fff4ec"]);
    P.ridge(38, 3, 0.05, "#6f9ca6", 6);
    P.water(40, ["#7fc3d8", "#4f9fc4", "#2f6fa8", "#1f4e79"], t, "#d6f0f6", 2);
    for (let k = 0; k < 3; k++) { const y = 62 + k * 6 + Math.round(Math.sin(t * 1.8 + k) * 1.5); for (let x = 0; x < W; x += 2) if ((x + k * 13 + Math.floor(t * 8)) % 7 < 4) P.px(x, y, 2, 1, "#eaf8fb"); }
    for (let y = 74; y < H; y++) for (let x = 0; x < W; x++) if (y > 76 + 3 * Math.sin(x * 0.06 + t * 0.8)) P.px(x, y, 1, 1, (x + y) % 5 ? "#e7c787" : "#f3dca8");
    const bx = 130 + Math.sin(t * 0.7) * 6, by = 52 + Math.sin(t * 2) * 1.2; P.disc(bx, by, 5, "#4a3628"); P.px(bx - 5, by - 1, 11, 1, "#7a4a2a"); P.px(bx, by - 6, 1, 5, "#2b1d14");
    P.palm(250, 86, 32, t, ["#7a5a3a", "#1f6f4a", "#3f8a45", "#8fcf6a"]);
  };
  S.Wetland = (P, t) => {
    P.grad(0, 46, ["#e98a6a", "#f3b07a", "#f6d3a0", "#f7e6c4"]); P.disc(180, 30, 10, "#fff1c4"); P.disc(180, 30, 7, "#fff8e4");
    for (let i = 0; i < 4; i++) P.bird(((t * 9 + i * 30) % 330) - 30, 12 + i * 3, t, "#4a2c1a", i);
    P.ridge(44, 2, 0.07, "#3f5a3a", 7);
    P.water(46, ["#f3c48a", "#c9a07a", "#7f8f86", "#4f6f6a"], t, "#fde7c0", 4, 4);
    const r = rng(9);
    for (let i = 0; i < 16; i++) { const x = r() * W, y = 52 + r() * 30, w = 4 + r() * 4; P.px(x - w / 2, y, w, 2, "#3f8a45"); P.px(x - w / 2, y, w, 1, "#6bb35a");
      if (r() < 0.4) { const bloom = 0.5 + 0.5 * Math.sin(t + i); P.disc(x, y - 2, 1 + Math.round(bloom), "#f2a0b4"); P.px(x, y - 3, 1, 1, "#ffe3ec"); } }
    for (const [x, y] of [[60, 62], [92, 66]]) { const bob = Math.round(Math.sin(t * 1.2 + x) * 1); P.px(x, y - 14 + bob, 3, 8, "#9aa6b0"); P.px(x + 2, y - 17 + bob, 2, 3, "#c0392b"); P.px(x + 3, y - 16 + bob, 3, 1, "#3a3532"); P.px(x, y - 6, 1, 8, "#5a4a3a"); P.px(x + 2, y - 6, 1, 8, "#5a4a3a"); }
    P.grass(90, 90, t, ["#4f6f3a", "#6b8a45", "#8fa85a", "#a8703a"], 5, 8, 18, 1.5);
  };
  S.River = (P, t) => {
    P.grad(0, 36, ["#f3e3b8", "#cfe6e0", "#a9d6e0"]); P.cloud(((90 - t * 2.5) % 320 + 320) % 320 - 30, 10, 28, t, ["#d6e3e6", "#eef4f2", "#ffffff"]);
    P.ridge(32, 3, 0.05, "#6f9a8a", 8);
    for (let i = 0; i < 9; i++) P.palm(10 + i * 32, 46, 14 + (i * 7) % 8, t, ["#6b4d34", "#1f5a3a", "#2f7a45", "#6bb35a"]);
    P.px(0, 44, W, 3, "#4f6f3a");
    P.water(47, ["#8fb8a8", "#6f9f8f", "#4f7f74", "#3f6a62"], t, "#c9e4d8", 5, 5);
    const bx = ((t * 7) % 340) - 40, by = 62 + Math.sin(t * 1.6) * 0.8;
    P.px(bx, by, 34, 3, "#4a3628"); P.px(bx + 2, by + 3, 30, 1, "#2b1d14"); P.px(bx + 10, by - 6, 14, 6, "#7a5a3a"); P.px(bx + 8, by - 7, 18, 1, "#a8703a");
    for (let k = 0; k < 6; k++) P.px(bx - 3 - k * 4, by + 3 + (k % 2), 3, 1, "#c9e4d8");
    P.px(0, 82, W, 8, "#3f6a3a"); P.grass(84, 60, t, ["#6bb35a", "#9ccf6b", "#4f8a45"], 6, 4, 10);
  };
  S.Mountain = (P, t) => {
    P.grad(0, 50, ["#cfe0ee", "#b8d6ea", "#9fc8e2"]);
    P.ridge(26, 12, 0.03, "#9aa8b4", 10, "#e8eef4", 1); P.ridge(36, 10, 0.045, "#7a8f94", 11, "#c8d4d6", 1);
    for (let k = 0; k < 3; k++) { const x0 = ((k * 110 - t * (4 + k)) % 380 + 380) % 380 - 60; for (let y = 0; y < 6; y++) for (let x = 0; x < 70; x++) if ((x + y * 2) % 3 && Math.abs(x - 35) < 35 - y * 3) P.px(x0 + x, 40 + k * 3 + y, 1, 1, "#eef4f6"); }
    P.ridge(50, 8, 0.06, "#4f7a5a", 12, "#7fa67a");
    for (let b = 0; b < 6; b++) for (let x = 0; x < W; x++) { const y = Math.round(58 + b * 4 + 2 * Math.sin(x * 0.05 + b)); if (y > 50 + 8 * Math.sin(x * 0.06)) P.px(x, y, 1, 1, "#9ccf6b"); }
    const r = rng(13); for (let i = 0; i < 18; i++) { const x = r() * W, y = 62 + r() * 18; for (let k = 0; k < 9; k++) P.px(x - Math.floor(k / 2), y - 9 + k, k + 1, 1, k % 3 ? "#1f4a33" : "#2f6b3a"); }
    P.px(0, 84, W, 6, "#2f5a3a");
  };
  S.Karst = (P, t) => {
    P.grad(0, 56, ["#f3e6c4", "#d6eaea", "#a9d6e0", "#8fcad6"]);
    for (let y = 30; y < 40; y++) for (let x = 0; x < W; x++) if ((x * 3 + y + Math.floor(t * 3)) % 6 === 0) P.px(x, y, 1, 1, "#eef4f2");
    const towers = [[8, 26, 44, "#7f9894"], [52, 18, 30, "#94aaa4"], [84, 32, 54, "#6f8a86"], [142, 20, 36, "#94aaa4"], [180, 30, 50, "#6f8a86"], [236, 24, 40, "#7f9894"]];
    for (const [x0, w, h, col] of towers) for (let x = x0; x < x0 + w; x++) { const u = (x - x0) / w, top = 56 - h + Math.round(6 * (u - 0.5) ** 2 * 4 - 2);
      for (let y = top; y < 56; y++) P.px(x, y, 1, 1, u > 0.38 ? col : mix(col, "#2b3a3a", 0.35)); P.px(x, top, 1, 2, "#4f8a45"); if (x % 2) P.px(x, top + 2, 1, 1, "#6bb35a"); }
    P.reflect(28, 56, 56, "#2f8f8a", 0.55);
    for (let k = 0; k < 60; k++) { const y = 57 + (k * 7) % 33, x = ((k * 53 + t * 6) % (W + 10)) - 5; if (Math.floor(t * 3 + k) % 3) P.px(x, y, 2 + (k % 4), 1, "#c9ece6"); }
    const jx = ((t * 6) % 340) - 40, jy = 60 + Math.sin(t * 1.4);
    P.px(jx, jy, 22, 3, "#5a3a24"); P.px(jx + 2, jy + 3, 18, 1, "#2b1d14");
    for (const [sx, sh] of [[4, 14], [11, 17]]) { P.px(jx + sx, jy - sh, 1, sh, "#2b1d14"); for (let k = 0; k < sh - 3; k++) P.px(jx + sx + 1, jy - sh + 1 + k, 5 - Math.floor(k / 4), 1, k % 4 === 0 ? "#8c1c13" : "#c0392b"); }
  };
  S.Island = (P, t) => {
    P.grad(0, 40, ["#f3e6c4", "#cfeaf0", "#9fd6ea"]); P.cloud(((60 - t * 2) % 320 + 320) % 320 - 30, 10, 30, t, ["#d6e3e6", "#eef4f2", "#ffffff"]);
    P.water(40, ["#7fd1c1", "#4fb3c4", "#2f8fb4", "#1f6f9a"], t, "#e6f8f4", 6);
    for (let x = 80; x < 200; x++) { const top = 52 - Math.round(12 * Math.sin(((x - 80) / 120) * Math.PI)); for (let y = top; y < 60; y++) P.px(x, y, 1, 1, y < top + 2 ? "#6bb35a" : "#2f7a45"); P.px(x, 59, 1, 2, "#e7c787"); }
    P.reflect(42, 60, 60, "#2f8fb4", 0.6);
    P.palm(110, 52, 18, t, ["#7a5a3a", "#1f6f4a", "#3f8a45", "#8fcf6a"]); P.palm(160, 50, 20, t, ["#7a5a3a", "#1f6f4a", "#3f8a45", "#8fcf6a"]);
    for (let i = 0; i < 3; i++) P.bird(((t * 12 + i * 50) % 330) - 30, 18 + i * 4, t, "#f3eee5", i);
    for (let k = 0; k < 8; k++) P.disc(20 + k * 33, 84 + (k % 2), 2, k % 2 ? "#f39a6b" : "#e98aa0");
  };
  S.Sky = (P, t) => {
    P.grad(0, H, ["#7fc4ea", "#a9daf2", "#d6eef8", "#f3e6c4"]); P.disc(230, 18, 9, "#fff6d6"); P.disc(230, 18, 6, "#ffffff");
    for (const [x, y, w, sp] of [[20, 20, 46, 4], [130, 36, 56, 2.5], [200, 54, 40, 5], [80, 62, 34, 3]]) P.cloud(((x - t * sp) % 360 + 360) % 360 - 50, y, w, t, ["#c9dfee", "#e8f2f8", "#ffffff"]);
    for (let i = 0; i < 7; i++) { const x = ((t * 16) % 360) - 40 - Math.abs(i - 3) * 6, y = 30 + (i - 3) * 3 + Math.abs(i - 3) * 2; P.bird(x, y, t, "#2b3a4a", i); }
    P.ridge(84, 3, 0.05, "#6f9a8a", 14);
  };
  S.Mythic = (P, t) => {
    P.grad(0, 70, ["#6b5b95", "#a98ac0", "#f3b07a", "#f7d68a"]);
    const pulse = 1 + Math.sin(t * 2) * 0.08;
    P.disc(140, 40, Math.round(20 * pulse), "#f7e2a8"); P.disc(140, 40, Math.round(14 * pulse), "#fff3cc"); P.disc(140, 40, 9, "#ffffff");
    for (const [x, y, ph] of [[30, 18, 0], [70, 30, 1], [210, 20, 2], [250, 34, 3]]) { const dx = Math.sin(t * 0.8 + ph) * 4;
      for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2 + t * 0.6; P.px(x + dx + Math.cos(a) * 9, y + Math.sin(a) * 4, 2, 1, "#fff6e0"); P.px(x + dx + Math.cos(a) * 5, y + Math.sin(a) * 2, 1, 1, "#f7d68a"); } }
    P.ridge(70, 3, 0.05, "#5a4a7a", 15);
    for (let i = 0; i < 16; i++) P.px(80 + i * 1.5, 60 - i, 120 - i * 3, 1, i === 0 ? "#5a120c" : i < 4 ? "#8c1c13" : "#b33a2a");
    P.px(70, 58, 8, 2, "#8c1c13"); P.px(202, 58, 8, 2, "#8c1c13"); P.px(68, 55, 3, 3, "#e7c05f"); P.px(209, 55, 3, 3, "#e7c05f");
    P.px(132, 41, 16, 3, "#e7c05f"); P.px(138, 38, 4, 3, "#e7c05f");
    P.px(88, 61, 104, 18, "#4a2c1a"); for (let x = 94; x < 190; x += 12) P.px(x, 61, 4, 18, "#8c1c13");
    P.px(0, 79, W, 11, "#3a2c4a");
    for (let i = 0; i < 10; i++) { const p = (t * 0.15 + i * 0.1) % 1; P.px(10 + i * 27 + Math.sin(p * 9 + i) * 6, p * 82, 2, 2, i % 2 ? "#f2a0b4" : "#f7d68a"); }
  };

  /** start an animation loop on `canvas` for `habitat`; returns a stop function */
  function start(canvas, habitat) {
    const scene = S[habitat] || S.Forest;
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext("2d"), P = painter(g);
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { scene(P, 1); return () => {}; }
    let raf = 0, last = -1, stopped = false;
    const t0 = performance.now();
    const loop = (now) => {
      if (stopped) return;
      const t = (now - t0) / 1000, step = Math.floor(t * 12); // 12 fps, stepped like pixel animation
      if (step !== last) { last = step; g.clearRect(0, 0, W, H); scene(P, step / 12); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }
  function drawAt(canvas, habitat, t) { canvas.width = W; canvas.height = H; const g = canvas.getContext("2d"); (S[habitat] || S.Forest)(painter(g), t); }
  window.VieHabitat = { start, drawAt, names: Object.keys(S), W, H };
})();
