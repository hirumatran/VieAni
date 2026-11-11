// UI text in Vietnamese and English. Vietnamese is the main language; English is for a later build.

export type Lang = "vi" | "en";

const STRINGS = {
  vi: {
    tagline: "Huyền Thoại Dã Thú",
    start: "Bắt Đầu",
    login: "Đăng Nhập",
    settings: "Cài Đặt",
    vieindex: "VieIndex",
    practice: "Luyện Tập",
    comingSoon: "Sắp ra mắt",
    loginSoon: "Tài khoản sẽ có sau bản beta",
    back: "Menu",
    close: "Đóng",
    sound: "Âm thanh",
    on: "Bật",
    off: "Tắt",
    battleSpeed: "Tốc độ trận",
    relaxed: "Chế độ thư thả (không giới hạn giờ chuẩn bị)",
    language: "Ngôn ngữ",
    alphaNote: "Bản thử nghiệm",
    stats: (a: number, b: number, c: number) => `${a} VieAni · ${b} tộc hệ · ${c} vật phẩm`,
    fight: "⚔ Đấu thử",
    onBoard: (n: number, m: number) => `Trên sân: ${n}/${m}`,
    dragHint: "Kéo VieAni từ hàng chờ lên sân (nửa dưới), rồi bấm Đấu thử",
    boardFull: "Sân đã đủ quân – đổi chỗ với một VieAni trên sân",
    needUnits: "Hãy đặt ít nhất 1 VieAni lên sân",
    win: "THẮNG",
    lose: "THUA",
    draw: "HÒA",
    hpLost: (n: number) => `Bạn mất ${n} máu`,
    enemyHpLost: (n: number) => `Đối thủ mất ${n} máu`,
    backToBoard: "Về bàn",
  },
  en: {
    tagline: "Legends of the Wild",
    start: "Play",
    login: "Sign In",
    settings: "Settings",
    vieindex: "VieIndex",
    practice: "Practice",
    comingSoon: "Coming soon",
    loginSoon: "Accounts arrive after the beta",
    back: "Menu",
    close: "Close",
    sound: "Sound",
    on: "On",
    off: "Off",
    battleSpeed: "Battle speed",
    relaxed: "Relaxed mode (no prep timer)",
    language: "Language",
    alphaNote: "Test build",
    stats: (a: number, b: number, c: number) => `${a} VieAni · ${b} synergies · ${c} items`,
    fight: "⚔ Test fight",
    onBoard: (n: number, m: number) => `On board: ${n}/${m}`,
    dragHint: "Drag VieAni from the bench onto the board (bottom half), then press Test fight",
    boardFull: "Board is full – swap with a VieAni on the board",
    needUnits: "Place at least 1 VieAni on the board",
    win: "VICTORY",
    lose: "DEFEAT",
    draw: "DRAW",
    hpLost: (n: number) => `You lose ${n} HP`,
    enemyHpLost: (n: number) => `Opponent loses ${n} HP`,
    backToBoard: "Back to board",
  },
};

export type StringKey = keyof typeof STRINGS.vi;

/** small persistent settings (per device). Storage may be blocked (private mode) – then defaults are used. */
export interface Settings { lang: Lang; sound: boolean; speed: 1 | 2; relaxed: boolean }
const DEFAULTS: Settings = { lang: "vi", sound: true, speed: 1, relaxed: true };
const KEY = "vieani.settings";

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: keep for this session only */
  }
}

export const settings: Settings = loadSettings();

export function t<K extends StringKey>(key: K): (typeof STRINGS.vi)[K] {
  return (STRINGS[settings.lang] ?? STRINGS.vi)[key] as (typeof STRINGS.vi)[K];
}
