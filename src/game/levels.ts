import { VIEW } from "./config";

export type SurfaceKind = "normal" | "ice" | "sticky" | "bouncy";

export interface Vec {
  x: number;
  y: number;
}

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: SurfaceKind;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Solid {
  points: Vec[];
  kind: SurfaceKind;
}

export interface EnemyDef extends Rect {
  /** 巡回範囲（左端のx） */
  minX: number;
  /** 巡回範囲（左端のxの最大値） */
  maxX: number;
  /** 移動速度 (px/s) */
  speed: number;
}

export interface CannonDef {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
}

export interface LevelDef {
  name: string;
  hint: string;
  start: Vec;
  goal: Rect;
  solids: Solid[];
  blocks: Rect[];
  enemies: EnemyDef[];
  collectibles: Vec[];
  cannons: CannonDef[];
}

const p = (x: number, y: number): Vec => ({ x, y });
const solid = (kind: SurfaceKind, ...points: Vec[]): Solid => ({ points, kind });

const H = VIEW.height;

export const LEVELS: LevelDef[] = [
  {
    name: "1. はじめの一歩",
    hint: "長押しで溜めて、離すと飛ぶ。溜めている間も落ちる・転がる。坂は転がり続ける。",
    start: p(150, 970),
    goal: { x: 1640, y: 430, w: 100, h: 90 },
    solids: [
      solid("normal", p(0, 1000), p(800, 1000), p(800, H), p(0, H)),
      solid("normal", p(800, 760), p(1100, 760), p(1500, 1000), p(1920, 1000), p(1920, H), p(800, H)),
      solid("normal", p(1550, 520), p(1850, 520), p(1850, 560), p(1550, 560)),
    ],
    blocks: [],
    enemies: [],
    collectibles: [p(1300, 780)],
    cannons: [],
  },
  {
    name: "2. 壊して進む",
    hint: "速く当たれば壊せる。壊すと色が変わり、空中でもう一度撃てる。弱く当てた敵には乗れる。",
    start: p(220, 970),
    goal: { x: 1760, y: 330, w: 130, h: 90 },
    solids: [
      solid("normal", p(0, 1000), p(1400, 1000), p(1400, H), p(0, H)),
      solid("normal", p(1400, 420), p(1920, 420), p(1920, H), p(1400, H)),
    ],
    blocks: [{ x: 1220, y: 920, w: 70, h: 80 }],
    enemies: [{ x: 600, y: 940, w: 70, h: 60, minX: 420, maxX: 820, speed: 140 }],
    collectibles: [p(1000, 600)],
    cannons: [],
  },
  {
    name: "3. いろいろな床",
    hint: "水色は滑る、紫はくっつく、黄色は跳ねる。大砲はタダで運んでくれる。タップ（0溜め）でブレーキ。",
    start: p(150, 970),
    goal: { x: 350, y: 470, w: 100, h: 90 },
    solids: [
      solid("normal", p(0, 1000), p(500, 1000), p(500, H), p(0, H)),
      solid("ice", p(500, 1000), p(1000, 1000), p(1000, H), p(500, H)),
      solid("normal", p(1000, 1000), p(1200, 1050), p(1400, 1000), p(1400, H), p(1000, H)),
      solid("sticky", p(1400, 1000), p(1880, 1000), p(1880, H), p(1400, H)),
      solid("bouncy", p(1880, 250), p(1920, 250), p(1920, H), p(1880, H)),
      solid("normal", p(200, 560), p(600, 560), p(600, 600), p(200, 600)),
    ],
    blocks: [],
    enemies: [],
    collectibles: [p(750, 960), p(1200, 1010), p(1100, 700)],
    cannons: [{ x: 1650, y: 880, dirX: -1, dirY: -1, speed: 1900 }],
  },
];

/** 地形と画面端（左右・天井）を衝突用の線分に変換する。下端は開けておき、落ちたらやり直し */
export function buildSegments(level: LevelDef): Seg[] {
  const segs: Seg[] = [
    { x1: 0, y1: H, x2: 0, y2: 0, kind: "normal" },
    { x1: 0, y1: 0, x2: VIEW.width, y2: 0, kind: "normal" },
    { x1: VIEW.width, y1: 0, x2: VIEW.width, y2: H, kind: "normal" },
  ];
  for (const s of level.solids) {
    const n = s.points.length;
    for (let i = 0; i < n; i++) {
      const a = s.points[i];
      const b = s.points[(i + 1) % n];
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: s.kind });
    }
  }
  return segs;
}
