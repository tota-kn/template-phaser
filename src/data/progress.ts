import type { WeaponId } from "./weapons";

export type AttemptResult = "win" | "lose" | "retreat";

export interface Attempt {
  loadout: WeaponId[];
  result: AttemptResult;
  timeSec: number;
  bossHpLeft: number;
  newObservations: number;
}

export interface Progress {
  observations: string[];
  attempts: Attempt[];
}

const KEY = "deduction-boss-proto-v1";

let cache: Progress | null = null;

export function getProgress(): Progress {
  if (cache) return cache;
  let loaded: Progress | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) loaded = JSON.parse(raw) as Progress;
  } catch {
    loaded = null;
  }
  cache = loaded ?? { observations: [], attempts: [] };
  return cache;
}

export function saveProgress(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getProgress()));
  } catch {
    // 保存できない環境でもプレイは続けられる
  }
}

export function resetProgress(): void {
  cache = { observations: [], attempts: [] };
  saveProgress();
}

export const RESULT_LABEL: Record<AttemptResult, string> = {
  win: "勝利",
  lose: "敗北",
  retreat: "撤退",
};
