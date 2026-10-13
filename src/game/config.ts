// 調整用の数値はすべてここに集める。試作で触りながら詰める前提。

export const VIEW = {
  width: 1920,
  height: 1080,
};

export const PHYS = {
  /** 重力加速度 (px/s^2) */
  gravity: 2000,
  /** 落下速度の上限 (px/s)。意図しない破壊を防ぐ調整用 */
  maxFall: 1900,
  /** 通常床の摩擦による減速 (px/s^2)。坂で転がり続けるよう重力の斜面成分より小さくする */
  friction: 550,
  /** 平地でこの速度以下になったら停止 (px/s) */
  stopSpeed: 30,
  /** この速度以上で当たると壊せる (px/s) */
  breakSpeed: 1250,
  /** プレイヤー半径 (px) */
  radius: 22,
  /** 撃たずに地上を離れた直後に地上発射を許す猶予 (ms) */
  coyoteMs: 100,
  /** 跳ね返る壁の反発係数 */
  bounce: 0.85,
  /** 物理の分割ステップ (s)。すり抜け防止 */
  substep: 1 / 240,
  /** 世界全体の時間の進み (1=等速)。軌道の形は変えずに動きだけ遅くする */
  timeScale: 0.7,
  /** 固定大砲に入ってから発射までの時間 (s) */
  cannonDelay: 0.3,
};

/** 発射段階: 0=0溜め, 1=弱, 2=中, 3=強 */
export const CHARGE = {
  /** 各段階に到達するまでの長押し時間 (ms)。0溜めはこれ未満で離したとき */
  levelMs: [0, 140, 420, 780],
  /** 各段階の初速 (px/s)。0溜めは速度を0に置き換えてその場で止まる */
  speeds: [0, 650, 1000, 1500],
  /** ミッション用のエネルギーコスト */
  costs: [0, 1, 2, 3],
  names: ["0", "弱", "中", "強"],
  colors: [0x9e9e9e, 0x66bb6a, 0xffca28, 0xef5350],
  /** 0溜めの連続使用を防ぐ待ち時間 (ms) */
  zeroCooldownMs: 450,
};

export function chargeLevel(heldMs: number): number {
  let level = 0;
  for (let i = 1; i < CHARGE.levelMs.length; i++) {
    if (heldMs >= CHARGE.levelMs[i]) level = i;
  }
  return level;
}
