import Phaser from "phaser";

/**
 * キーボードとゲームパッドを1つのアクションにまとめる。
 * ゲームパッドは標準配置（Xbox 系の並び）を想定:
 *   0:A 1:B 2:X 3:Y 4:LB 5:RB 6:LT 7:RT 8:Back/Select 9:Start 12-15:十字キー
 * ブラウザの仕様上、パッドはページを開いた後にボタンを1回押すまで認識されない。
 */
export type Action =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
  | "shoot"
  | "prev"
  | "next"
  | "slot1"
  | "slot2"
  | "slot3"
  | "confirm"
  | "toggle"
  | "back";

const KEYMAP: Record<Action, string[]> = {
  left: ["LEFT", "A"],
  right: ["RIGHT", "D"],
  up: ["UP", "W"],
  down: ["DOWN", "S"],
  jump: ["UP", "W", "SPACE"],
  shoot: ["Z", "J"],
  prev: ["Q"],
  next: ["E", "X", "K"],
  slot1: ["ONE"],
  slot2: ["TWO"],
  slot3: ["THREE"],
  confirm: ["ENTER"],
  toggle: ["SPACE", "Z", "J"],
  back: ["ESC"],
};

const PADMAP: Record<Action, number[]> = {
  left: [14],
  right: [15],
  up: [12],
  down: [13],
  jump: [0],
  shoot: [2, 7, 1],
  prev: [4, 6],
  next: [5, 3],
  slot1: [],
  slot2: [],
  slot3: [],
  confirm: [9],
  toggle: [0],
  back: [8],
};

const AXIS_THRESHOLD = 0.5;

export class Controls {
  private scene: Phaser.Scene;
  private keys: Partial<Record<string, Phaser.Input.Keyboard.Key>> = {};
  private current = new Set<Action>();
  private previous = new Set<Action>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    if (kb) {
      const codes = Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>;
      for (const names of Object.values(KEYMAP)) {
        for (const n of names) {
          if (!this.keys[n]) this.keys[n] = kb.addKey(codes[n], true);
        }
      }
    }
  }

  get pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    return gp.getPad(0) ?? null;
  }

  /** 毎フレーム最初に呼ぶ */
  update(): void {
    this.previous = this.current;
    this.current = new Set<Action>();
    const pad = this.pad;
    for (const action of Object.keys(KEYMAP) as Action[]) {
      let on = KEYMAP[action].some((n) => this.keys[n]?.isDown);
      if (!on && pad) {
        on = PADMAP[action].some((i) => pad.buttons[i]?.pressed);
        if (!on) {
          const x = pad.axes[0]?.getValue() ?? 0;
          const y = pad.axes[1]?.getValue() ?? 0;
          if (action === "left") on = x < -AXIS_THRESHOLD;
          if (action === "right") on = x > AXIS_THRESHOLD;
          if (action === "up") on = y < -AXIS_THRESHOLD;
          if (action === "down") on = y > AXIS_THRESHOLD;
        }
      }
      if (on) this.current.add(action);
    }
  }

  isDown(a: Action): boolean {
    return this.current.has(a);
  }

  justPressed(a: Action): boolean {
    return this.current.has(a) && !this.previous.has(a);
  }

  /** シーン開始直後の押しっぱなしを「押した」と誤判定しないため */
  primeHeld(): void {
    this.update();
    this.previous = new Set(this.current);
  }
}
