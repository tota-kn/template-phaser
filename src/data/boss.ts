import { WEAPONS, weaponById, type WeaponId } from "./weapons";

/**
 * ボス「鉄甲の番人」のルール。
 * 正解手順: 炎で灼熱 → 灼熱中に氷でひび割れ → ひび割れ中に鉄球で装甲破壊 → 核に攻撃。
 * 雷は吸収されて回復される（罠）。酸は総当たり用の「遅いが一応通る」ルート。
 */
export type ArmorState = "armor" | "heated" | "cracked" | "core";

export const BOSS_NAME = "鉄甲の番人";
export const BOSS_MAX_HP = 100;

export const STATE_LABEL: Record<ArmorState, string> = {
  armor: "通常装甲",
  heated: "灼熱",
  cracked: "ひび割れ",
  core: "核露出",
};

/** 各状態の持続時間(ms)。0 は無期限 */
export const STATE_DURATION: Record<ArmorState, number> = {
  armor: 0,
  heated: 4000,
  cracked: 5000,
  core: 7000,
};

export interface HitResult {
  damage: number;
  heal: number;
  next?: ArmorState;
  stunMs?: number;
  label: string;
  color: string;
  /** 観察記録に残す一文。同じ文は1件として扱う */
  observation: string;
}

const GOOD = "#ffd84d";
const WEAK = "#9aa0a6";
const BAD = "#ff5b5b";

export function resolveHit(w: WeaponId, s: ArmorState): HitResult {
  if (w === "thunder") {
    return { damage: 0, heal: 5, label: "吸収された", color: BAD, observation: "雷：電気を吸収され、回復された！" };
  }
  if (s === "core") {
    const name = weaponById(w).name;
    return {
      damage: 3,
      heal: 0,
      stunMs: w === "flash" ? 1200 : undefined,
      label: "核に命中！",
      color: GOOD,
      observation: `${name}：露出した核によく効いた`,
    };
  }
  switch (w) {
    case "fire":
      if (s === "armor") return { damage: 0, heal: 0, next: "heated", label: "灼熱！", color: "#ff8a3d", observation: "炎：装甲が赤く灼けた（やがて冷める）" };
      if (s === "heated") return { damage: 0, heal: 0, next: "heated", label: "灼熱継続", color: "#ff8a3d", observation: "炎：灼けている間に当てると長引いた" };
      return { damage: 0, heal: 0, label: "変化なし", color: WEAK, observation: "炎：ひび割れた装甲には変化なし" };
    case "ice":
      if (s === "heated") return { damage: 0, heal: 0, next: "cracked", label: "ひび割れ！", color: "#7fe3ff", observation: "氷：灼けた装甲が急冷され、ひびが入った！" };
      if (s === "cracked") return { damage: 0, heal: 0, label: "変化なし", color: WEAK, observation: "氷：ひび割れた装甲には変化なし" };
      return { damage: 0, heal: 0, label: "霜がついた", color: WEAK, observation: "氷：表面に霜がついただけ" };
    case "hammer":
      if (s === "cracked") return { damage: 5, heal: 0, next: "core", label: "装甲破壊！", color: GOOD, observation: "鉄球：ひびが砕け、中の核が露出した！" };
      return { damage: 0, heal: 0, label: "弾かれた", color: WEAK, observation: "鉄球：硬い装甲に弾かれた" };
    case "arrow":
      return { damage: 0, heal: 0, label: "弾かれた", color: WEAK, observation: "矢：装甲に弾かれた" };
    case "acid":
      if (s === "cracked") return { damage: 1, heal: 0, label: "微ダメージ", color: WEAK, observation: "酸：ひびから染みたが効き目は小さい" };
      return { damage: 1, heal: 0, label: "微ダメージ", color: WEAK, observation: "酸：装甲がわずかに溶けた（微ダメージ）" };
    case "sonic":
      return { damage: 0, heal: 0, label: "共鳴", color: "#c59bff", observation: "音波：内側で何かが共鳴した。中身がある？" };
    case "flash":
      return { damage: 0, heal: 0, stunMs: 1200, label: "目くらまし", color: "#ffffff", observation: "閃光：目がくらみ、一瞬動きが止まった" };
  }
}

/** 発見しうる観察の総数（進捗表示用） */
export const TOTAL_OBSERVATIONS: number = (() => {
  const states: ArmorState[] = ["armor", "heated", "cracked", "core"];
  const set = new Set<string>();
  for (const w of WEAPONS) for (const s of states) set.add(resolveHit(w.id, s).observation);
  return set.size;
})();

/** 戦闘前から手に入る証言（間接的な手がかり） */
export const CLUES: { who: string; text: string }[] = [
  { who: "村の老人", text: "番人は雷の夜ほど元気になる。雷様の子だと言う者もおる。" },
  { who: "鍛冶屋", text: "鋼ってのは、真っ赤に灼けたところへ水をぶっかけると割れちまうことがあるんだ。" },
  { who: "古文書", text: "番人の鎧は打ち砕けぬ。ただし、ひとたび傷を負えば別なり。" },
];
