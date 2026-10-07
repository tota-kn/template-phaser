// ゲームの状態と物理。Phaserに依存しない純粋なロジックとして書き、描画と入力はシーン側で扱う。

import { CHARGE, PHYS, VIEW } from "./config";
import { buildSegments, type EnemyDef, type LevelDef, type Rect, type Seg, type SurfaceKind } from "./levels";

export type GameEventType =
  | "fire"
  | "misfire"
  | "break"
  | "kill"
  | "stock"
  | "collect"
  | "shatter"
  | "land"
  | "bounce"
  | "cannon"
  | "clear"
  | "dead";

export interface GameEvent {
  type: GameEventType;
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  groundKind: SurfaceKind;
  /** 最後に地上にいた時刻 (ms)。撃って離れた場合は -Infinity にして猶予を無効化する */
  lastGroundedAt: number;
  /** 空中発射ストック（最大1個） */
  stock: boolean;
  /** 0溜めで撃った後、次の着地でぴたりと止まる */
  noRoll: boolean;
  /** 乗っている敵の番号（いなければ -1） */
  ridingEnemy: number;
  /** 入っている固定大砲の番号（いなければ -1） */
  inCannon: number;
  cannonTimer: number;
  /** この時刻まで大砲に再び吸い込まれない (ms) */
  cannonLockUntil: number;
}

interface BlockState {
  rect: Rect;
  alive: boolean;
}

interface EnemyState {
  def: EnemyDef;
  x: number;
  dir: number;
  dx: number;
  alive: boolean;
}

interface CollectibleState {
  x: number;
  y: number;
  state: "idle" | "got" | "broken";
}

interface Contact {
  nx: number;
  ny: number;
}

const COLLECT_RADIUS = 16;
const CANNON_RADIUS = 30;

export class World {
  readonly level: LevelDef;
  readonly segs: Seg[];
  time = 0;
  player!: Player;
  blocks: BlockState[] = [];
  enemies: EnemyState[] = [];
  collectibles: CollectibleState[] = [];
  energy = 0;
  shots = 0;
  cleared = false;
  dead = false;
  zeroReadyAt = 0;
  events: GameEvent[] = [];

  constructor(level: LevelDef) {
    this.level = level;
    this.segs = buildSegments(level);
    this.reset();
  }

  reset(): void {
    const l = this.level;
    this.time = 0;
    this.player = {
      x: l.start.x,
      y: l.start.y,
      vx: 0,
      vy: 0,
      grounded: false,
      groundKind: "normal",
      lastGroundedAt: -Infinity,
      stock: false,
      noRoll: false,
      ridingEnemy: -1,
      inCannon: -1,
      cannonTimer: 0,
      cannonLockUntil: 0,
    };
    this.blocks = l.blocks.map((rect) => ({ rect, alive: true }));
    this.enemies = l.enemies.map((def) => ({ def, x: def.x, dir: 1, dx: 0, alive: true }));
    this.collectibles = l.collectibles.map((c) => ({ x: c.x, y: c.y, state: "idle" }));
    this.energy = 0;
    this.shots = 0;
    this.cleared = false;
    this.dead = false;
    this.zeroReadyAt = 0;
    this.events = [];
  }

  get speed(): number {
    return Math.hypot(this.player.vx, this.player.vy);
  }

  get canBreak(): boolean {
    return this.speed >= PHYS.breakSpeed;
  }

  get zeroReady(): boolean {
    return this.time >= this.zeroReadyAt;
  }

  /** 地上にいるか、撃たずに地上を離れた直後の猶予内か */
  isGroundedish(): boolean {
    const p = this.player;
    return p.grounded || this.time - p.lastGroundedAt <= PHYS.coyoteMs;
  }

  /** 今撃てるか。chargeStartedGrounded は溜め開始時点で地上にいたか */
  canFire(chargeStartedGrounded: boolean): boolean {
    if (this.player.inCannon >= 0) return false;
    return chargeStartedGrounded || this.isGroundedish() || this.player.stock;
  }

  fire(level: number, dirX: number, dirY: number, chargeStartedGrounded: boolean): boolean {
    const p = this.player;
    if (this.cleared || this.dead || p.inCannon >= 0) return false;
    if (level === 0 && !this.zeroReady) {
      this.emit("misfire");
      return false;
    }
    const free = chargeStartedGrounded || this.isGroundedish();
    if (!free) {
      if (!p.stock) {
        this.emit("misfire");
        return false;
      }
      p.stock = false;
    }
    const len = Math.hypot(dirX, dirY) || 1;
    const speed = CHARGE.speeds[level];
    // 置き換え式：現在の速度は捨てる
    p.vx = (dirX / len) * speed;
    p.vy = (dirY / len) * speed;
    p.noRoll = level === 0;
    p.grounded = false;
    p.ridingEnemy = -1;
    p.lastGroundedAt = -Infinity;
    this.energy += CHARGE.costs[level];
    this.shots++;
    if (level === 0) this.zeroReadyAt = this.time + CHARGE.zeroCooldownMs;
    this.emit("fire");
    return true;
  }

  update(dt: number): void {
    if (this.cleared || this.dead) return;
    const steps = Math.max(1, Math.ceil(dt / PHYS.substep));
    const h = dt / steps;
    for (let i = 0; i < steps && !this.cleared && !this.dead; i++) {
      this.step(h);
    }
  }

  private emit(type: GameEventType, x = this.player.x, y = this.player.y): void {
    this.events.push({ type, x, y });
  }

  private gainStock(): void {
    if (!this.player.stock) {
      this.player.stock = true;
      this.emit("stock");
    }
  }

  private step(h: number): void {
    this.time += h * 1000;
    const p = this.player;
    const r = PHYS.radius;

    // 敵の巡回
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const prev = e.x;
      e.x += e.dir * e.def.speed * h;
      if (e.x > e.def.maxX) {
        e.x = e.def.maxX;
        e.dir = -1;
      } else if (e.x < e.def.minX) {
        e.x = e.def.minX;
        e.dir = 1;
      }
      e.dx = e.x - prev;
    }

    // 固定大砲の中
    if (p.inCannon >= 0) {
      const c = this.level.cannons[p.inCannon];
      p.x = c.x;
      p.y = c.y;
      p.vx = 0;
      p.vy = 0;
      p.cannonTimer -= h;
      if (p.cannonTimer <= 0) {
        const len = Math.hypot(c.dirX, c.dirY) || 1;
        p.vx = (c.dirX / len) * c.speed;
        p.vy = (c.dirY / len) * c.speed;
        p.inCannon = -1;
        p.noRoll = false;
        p.cannonLockUntil = this.time + 400;
        p.lastGroundedAt = -Infinity;
        this.emit("fire");
      }
      return;
    }

    // 乗っている敵に運ばれる
    if (p.ridingEnemy >= 0) {
      const e = this.enemies[p.ridingEnemy];
      if (e && e.alive) p.x += e.dx;
    }

    const wasGrounded = p.grounded;
    const impactSpeed = this.speed;

    p.vy = Math.min(p.vy + PHYS.gravity * h, PHYS.maxFall);
    p.x += p.vx * h;
    p.y += p.vy * h;

    p.grounded = false;
    p.ridingEnemy = -1;
    let groundNx = 0;
    let groundNy = -1;

    const onContact = (c: Contact, kind: SurfaceKind) => {
      const vn = p.vx * c.nx + p.vy * c.ny;
      if (vn < 0) {
        if (kind === "bouncy") {
          const k = 1 + PHYS.bounce;
          p.vx -= k * vn * c.nx;
          p.vy -= k * vn * c.ny;
          if (-vn > 200) this.emit("bounce");
        } else {
          p.vx -= vn * c.nx;
          p.vy -= vn * c.ny;
        }
      }
      if (c.ny < -0.6 && kind !== "bouncy") {
        p.grounded = true;
        p.groundKind = kind;
        groundNx = c.nx;
        groundNy = c.ny;
      }
    };

    // 地形
    for (const s of this.segs) {
      const c = circleSeg(p, r, s);
      if (c) onContact(c, s.kind);
    }

    // 壊せるブロック
    for (const b of this.blocks) {
      if (!b.alive) continue;
      const c = circleRect(p, r, b.rect, false);
      if (!c) continue;
      if (impactSpeed >= PHYS.breakSpeed) {
        b.alive = false;
        this.emit("break", b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2);
        this.gainStock();
      } else {
        circleRect(p, r, b.rect, true);
        onContact(c, "normal");
      }
    }

    // 敵：速ければ倒す、遅ければ乗れる（足場になる）
    this.enemies.forEach((e, idx) => {
      if (!e.alive) return;
      const rect = { x: e.x, y: e.def.y, w: e.def.w, h: e.def.h };
      const c = circleRect(p, r, rect, false);
      if (!c) return;
      if (impactSpeed >= PHYS.breakSpeed) {
        e.alive = false;
        this.emit("kill", rect.x + rect.w / 2, rect.y + rect.h / 2);
        this.gainStock();
      } else {
        circleRect(p, r, rect, true);
        onContact(c, "normal");
        if (c.ny < -0.6) p.ridingEnemy = idx;
      }
    });

    // コレクション：遅ければ回収、速ければ壊れる
    for (const col of this.collectibles) {
      if (col.state !== "idle") continue;
      if (Math.hypot(p.x - col.x, p.y - col.y) < r + COLLECT_RADIUS) {
        if (impactSpeed >= PHYS.breakSpeed) {
          col.state = "broken";
          this.emit("shatter", col.x, col.y);
        } else {
          col.state = "got";
          this.emit("collect", col.x, col.y);
        }
      }
    }

    // 固定大砲
    if (this.time >= p.cannonLockUntil) {
      this.level.cannons.forEach((c, idx) => {
        if (p.inCannon >= 0) return;
        if (Math.hypot(p.x - c.x, p.y - c.y) < r + CANNON_RADIUS) {
          p.inCannon = idx;
          p.cannonTimer = PHYS.cannonDelay;
          p.vx = 0;
          p.vy = 0;
          p.grounded = false;
          this.emit("cannon", c.x, c.y);
        }
      });
      if (p.inCannon >= 0) return;
    }

    // 地上での挙動
    if (p.grounded) {
      if (!wasGrounded && impactSpeed > 300) this.emit("land");
      p.lastGroundedAt = this.time;
      if (p.noRoll || p.groundKind === "sticky") {
        // 0溜め後の着地、粘着床はぴたりと止まる。noRollは一度止まったら解除（坂では再び転がる）
        p.vx = 0;
        p.vy = 0;
        p.noRoll = false;
      } else {
        // 接線方向の速度に摩擦をかける
        const tx = -groundNy;
        const ty = groundNx;
        let vt = p.vx * tx + p.vy * ty;
        const friction = p.groundKind === "ice" ? 0 : PHYS.friction;
        const dec = friction * h;
        vt = Math.abs(vt) <= dec ? 0 : vt - Math.sign(vt) * dec;
        const flat = groundNy < -0.97;
        if (flat && Math.abs(vt) < PHYS.stopSpeed && p.groundKind !== "ice") vt = 0;
        p.vx = tx * vt;
        p.vy = ty * vt;
      }
    }

    // ゴール
    const g = this.level.goal;
    if (p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h) {
      this.cleared = true;
      this.emit("clear");
    }

    // 画面下に落ちたらやり直し
    if (p.y > VIEW.height + r * 3) {
      this.dead = true;
      this.emit("dead");
    }
  }
}

/** 円と線分の衝突。めり込みを解消し、法線（線分から円へ向かう向き）を返す */
function circleSeg(p: Player, r: number, s: Seg): Contact | null {
  const abx = s.x2 - s.x1;
  const aby = s.y2 - s.y1;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((p.x - s.x1) * abx + (p.y - s.y1) * aby) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = s.x1 + abx * t;
  const cy = s.y1 + aby * t;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r || d2 === 0) return null;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  p.x += nx * (r - d);
  p.y += ny * (r - d);
  return { nx, ny };
}

/** 円と矩形の衝突。resolve=true のときのみめり込みを解消する */
function circleRect(p: Player, r: number, rect: Rect, resolve: boolean): Contact | null {
  const cx = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
  let dx = p.x - cx;
  let dy = p.y - cy;
  let d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  let nx: number;
  let ny: number;
  let pen: number;
  if (d2 === 0) {
    // 中心が矩形内：最も近い辺から押し出す
    const left = p.x - rect.x;
    const right = rect.x + rect.w - p.x;
    const top = p.y - rect.y;
    const bottom = rect.y + rect.h - p.y;
    const m = Math.min(left, right, top, bottom);
    if (m === top) [nx, ny, pen] = [0, -1, top + r];
    else if (m === bottom) [nx, ny, pen] = [0, 1, bottom + r];
    else if (m === left) [nx, ny, pen] = [-1, 0, left + r];
    else [nx, ny, pen] = [1, 0, right + r];
  } else {
    const d = Math.sqrt(d2);
    nx = dx / d;
    ny = dy / d;
    pen = r - d;
  }
  if (resolve) {
    p.x += nx * pen;
    p.y += ny * pen;
  }
  return { nx, ny };
}
