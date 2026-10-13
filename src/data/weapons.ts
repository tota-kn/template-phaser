export type WeaponId =
  | "fire"
  | "ice"
  | "thunder"
  | "hammer"
  | "arrow"
  | "acid"
  | "sonic"
  | "flash";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  /** 武器選択画面に出す説明。効果そのものは書かない（推理の余地を残す） */
  desc: string;
  color: number;
  speed: number;
  /** 0 なら直進、>0 なら放物線 */
  gravity: number;
  cooldown: number;
  radius: number;
}

export const WEAPONS: WeaponDef[] = [
  { id: "fire", name: "炎", desc: "火の玉を放つ", color: 0xff7a2f, speed: 900, gravity: 0, cooldown: 220, radius: 14 },
  { id: "ice", name: "氷", desc: "冷気の塊を放つ", color: 0x7fe3ff, speed: 900, gravity: 0, cooldown: 220, radius: 14 },
  { id: "thunder", name: "雷", desc: "電撃を放つ", color: 0xffe14d, speed: 1200, gravity: 0, cooldown: 200, radius: 11 },
  { id: "hammer", name: "鉄球", desc: "重い鉄球を投げる（放物線）", color: 0x9aa0a6, speed: 650, gravity: 1700, cooldown: 420, radius: 20 },
  { id: "arrow", name: "矢", desc: "鋭い矢を射る", color: 0xd9c48c, speed: 1400, gravity: 0, cooldown: 180, radius: 8 },
  { id: "acid", name: "酸", desc: "腐食液を飛ばす", color: 0x8bdc5a, speed: 800, gravity: 0, cooldown: 240, radius: 13 },
  { id: "sonic", name: "音波", desc: "振動を放つ", color: 0xc59bff, speed: 1000, gravity: 0, cooldown: 220, radius: 16 },
  { id: "flash", name: "閃光", desc: "強い光を放つ", color: 0xffffff, speed: 1300, gravity: 0, cooldown: 600, radius: 12 },
];

export function weaponById(id: WeaponId): WeaponDef {
  const w = WEAPONS.find((x) => x.id === id);
  if (!w) throw new Error(`unknown weapon: ${id}`);
  return w;
}

export const LOADOUT_SIZE = 3;
