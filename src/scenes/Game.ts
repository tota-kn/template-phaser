import { Scene, GameObjects, Physics } from "phaser";

const SLING_X = 150;
const SLING_Y = 400;
const FORK_LEFT = { x: 128, y: 345 };
const FORK_RIGHT = { x: 172, y: 345 };
const BALL_REST_Y = 372;
const MAX_PULL = 85;
const LAUNCH_POWER = 11;
const WORLD_GRAVITY = 500;
const TOTAL_BALLS = 5;

export class Game extends Scene {
  private ball: Physics.Arcade.Image | null = null;
  private targets!: Physics.Arcade.StaticGroup;
  private isDragging = false;
  private isLaunched = false;
  private score = 0;
  private ballsLeft = TOTAL_BALLS;
  private scoreText!: GameObjects.Text;
  private ballsText!: GameObjects.Text;
  private rubberBandGfx!: GameObjects.Graphics;
  private slingshotGfx!: GameObjects.Graphics;
  private dragPos = { x: SLING_X, y: BALL_REST_Y };
  private waitingForNextBall = false;

  constructor() {
    super("Game");
  }

  create(): void {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.cameras.main.setBackgroundColor("#1a1a2e");

    // Ground
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x2d8a4e, 1);
    groundGfx.fillRect(0, H - 55, W, 12);
    groundGfx.fillStyle(0x4a3728, 1);
    groundGfx.fillRect(0, H - 43, W, 43);

    // Create textures for ball and targets
    this.createTextures();

    // Slingshot layers (drawn back to front)
    this.slingshotGfx = this.add.graphics();
    this.rubberBandGfx = this.add.graphics();

    // Draw static slingshot parts once
    this.drawSlingshot();

    // Targets
    this.targets = this.physics.add.staticGroup();
    this.spawnTargets();

    // UI
    this.scoreText = this.add
      .text(16, 16, "スコア: 0", {
        fontFamily: "Arial Black, Arial",
        fontSize: "26px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setDepth(5);

    this.ballsText = this.add
      .text(16, 52, `ボール残り: ${this.ballsLeft}`, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffdd00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setDepth(5);

    this.add
      .text(W / 2, 16, "玉投げゲーム", {
        fontFamily: "Arial Black, Arial",
        fontSize: "30px",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(5);

    this.add
      .text(W / 2, H - 18, "玉をドラッグして引っ張り、離して投げよう！", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5, 1)
      .setDepth(5);

    // Reset state
    this.score = 0;
    this.ballsLeft = TOTAL_BALLS;
    this.waitingForNextBall = false;

    // First ball
    this.prepareBall();

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
  }

  createTextures(): void {
    // Ball: orange circle with highlight
    const ballGfx = this.make.graphics({}, false);
    ballGfx.fillStyle(0xff6622, 1);
    ballGfx.fillCircle(16, 16, 15);
    ballGfx.fillStyle(0xffaa55, 0.6);
    ballGfx.fillCircle(10, 9, 6);
    ballGfx.lineStyle(2, 0xcc3300, 1);
    ballGfx.strokeCircle(16, 16, 15);
    ballGfx.generateTexture("ball", 32, 32);
    ballGfx.destroy();

    // 7 coloured target textures
    const colors: Array<{ fill: number; ring: number }> = [
      { fill: 0xff3333, ring: 0xff9999 },
      { fill: 0x33cc33, ring: 0x99ff99 },
      { fill: 0x3366ff, ring: 0x99aaff },
      { fill: 0xffcc00, ring: 0xffee88 },
      { fill: 0xff33cc, ring: 0xff99ee },
      { fill: 0x00cccc, ring: 0x88ffff },
      { fill: 0xff8800, ring: 0xffcc88 },
    ];

    colors.forEach((c, i) => {
      const g = this.make.graphics({}, false);
      // Drop shadow
      g.fillStyle(0x000000, 0.25);
      g.fillCircle(30, 30, 22);
      // Main body
      g.fillStyle(c.fill, 1);
      g.fillCircle(28, 28, 22);
      // Outer ring
      g.lineStyle(3, c.ring, 0.7);
      g.strokeCircle(28, 28, 22);
      // Inner ring
      g.lineStyle(2, c.ring, 0.35);
      g.strokeCircle(28, 28, 12);
      // Highlight
      g.fillStyle(0xffffff, 0.28);
      g.fillCircle(20, 19, 7);
      // Centre dot
      g.fillStyle(c.ring, 0.8);
      g.fillCircle(28, 28, 4);
      g.generateTexture(`target_${i}`, 58, 58);
      g.destroy();
    });
  }

  spawnTargets(): void {
    const positions = [
      { x: 530, y: 310, idx: 0 },
      { x: 620, y: 185, idx: 1 },
      { x: 680, y: 355, idx: 2 },
      { x: 715, y: 135, idx: 3 },
      { x: 565, y: 455, idx: 4 },
      { x: 745, y: 265, idx: 5 },
      { x: 645, y: 480, idx: 6 },
      { x: 760, y: 415, idx: 0 },
    ];

    positions.forEach(({ x, y, idx }) => {
      const sprite = this.targets.create(
        x,
        y,
        `target_${idx}`
      ) as Physics.Arcade.Image;
      // Circle body: radius 22, offset so it centres on the drawn circle at (28,28)
      (sprite.body as Physics.Arcade.StaticBody).setCircle(22, 6, 6);
      sprite.refreshBody();
    });
  }

  prepareBall(): void {
    if (this.ballsLeft <= 0) return;

    this.dragPos = { x: SLING_X, y: BALL_REST_Y };
    this.ball = this.physics.add.image(SLING_X, BALL_REST_Y, "ball");
    this.ball.setDepth(10);
    // Cancel world gravity so ball stays still until launched
    this.ball.setGravityY(-WORLD_GRAVITY);
    this.ball.setVelocity(0, 0);

    this.isLaunched = false;
    this.isDragging = false;
    this.waitingForNextBall = false;
  }

  onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isLaunched || !this.ball) return;
    const dx = pointer.x - SLING_X;
    const dy = pointer.y - BALL_REST_Y;
    if (Math.sqrt(dx * dx + dy * dy) < 55) {
      this.isDragging = true;
    }
  }

  onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || this.isLaunched || !this.ball) return;

    const dx = pointer.x - SLING_X;
    const dy = pointer.y - SLING_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > MAX_PULL) {
      const angle = Math.atan2(dy, dx);
      this.dragPos.x = SLING_X + Math.cos(angle) * MAX_PULL;
      this.dragPos.y = SLING_Y + Math.sin(angle) * MAX_PULL;
    } else {
      this.dragPos.x = pointer.x;
      this.dragPos.y = pointer.y;
    }

    this.ball.setVelocity(0, 0);
    this.ball.setPosition(this.dragPos.x, this.dragPos.y);
  }

  onPointerUp(): void {
    if (!this.isDragging || this.isLaunched || !this.ball) return;

    this.isDragging = false;
    this.isLaunched = true;
    this.ballsLeft--;
    this.ballsText.setText(`ボール残り: ${this.ballsLeft}`);

    const vx = (SLING_X - this.dragPos.x) * LAUNCH_POWER;
    const vy = (SLING_Y - this.dragPos.y) * LAUNCH_POWER;

    // Remove gravity offset so world gravity applies naturally
    this.ball.setGravityY(0);
    this.ball.setVelocity(vx, vy);

    // Overlap detection against all targets
    this.physics.add.overlap(this.ball, this.targets, (_b, targetObj) => {
      this.hitTarget(targetObj as Physics.Arcade.Image);
    });
  }

  hitTarget(target: Physics.Arcade.Image): void {
    if (!this.ball) return; // Guard against duplicate triggers

    // Remove ball immediately
    this.ball.destroy();
    this.ball = null;

    // Score
    this.score += 100;
    this.scoreText.setText(`スコア: ${this.score}`);

    // Floating score popup
    const hitText = this.add
      .text(target.x, target.y - 20, "+100", {
        fontFamily: "Arial Black",
        fontSize: "24px",
        color: "#ffdd00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: hitText,
      y: hitText.y - 65,
      alpha: 0,
      duration: 800,
      onComplete: () => hitText.destroy(),
    });

    // Target burst animation
    this.tweens.add({
      targets: target,
      scaleX: 1.9,
      scaleY: 1.9,
      alpha: 0,
      duration: 280,
      ease: "Power2",
      onComplete: () => {
        target.destroy();
        this.afterBallLost();
      },
    });
  }

  afterBallLost(): void {
    if (this.waitingForNextBall) return;
    this.waitingForNextBall = true;

    const remaining = this.targets.countActive(true);

    if (remaining <= 0) {
      this.time.delayedCall(500, this.showEndScreen, [true], this);
      return;
    }

    if (this.ballsLeft > 0) {
      this.time.delayedCall(700, this.prepareBall, [], this);
    } else {
      this.time.delayedCall(1200, this.showEndScreen, [false], this);
    }
  }

  update(): void {
    this.drawRubberBand();

    // Check if launched ball went out of bounds
    if (this.isLaunched && this.ball) {
      const W = this.cameras.main.width;
      const H = this.cameras.main.height;
      if (
        this.ball.x > W + 60 ||
        this.ball.x < -100 ||
        this.ball.y > H + 60
      ) {
        this.ball.destroy();
        this.ball = null;
        this.afterBallLost();
      }
    }
  }

  drawSlingshot(): void {
    this.slingshotGfx.clear();

    // Main stick
    this.slingshotGfx.lineStyle(10, 0x8b4513, 1);
    this.slingshotGfx.lineBetween(SLING_X, SLING_Y + 50, SLING_X, SLING_Y - 12);

    // Fork arms
    this.slingshotGfx.lineBetween(SLING_X, SLING_Y - 12, FORK_LEFT.x, FORK_LEFT.y);
    this.slingshotGfx.lineBetween(SLING_X, SLING_Y - 12, FORK_RIGHT.x, FORK_RIGHT.y);

    // Fork tips
    this.slingshotGfx.fillStyle(0x5c2a00, 1);
    this.slingshotGfx.fillCircle(FORK_LEFT.x, FORK_LEFT.y, 6);
    this.slingshotGfx.fillCircle(FORK_RIGHT.x, FORK_RIGHT.y, 6);
  }

  drawRubberBand(): void {
    this.rubberBandGfx.clear();

    if (!this.ball || this.isLaunched) return;

    const bx = this.ball.x;
    const by = this.ball.y;

    // Rubber band lines
    this.rubberBandGfx.lineStyle(4, 0x7b0000, 1);
    this.rubberBandGfx.lineBetween(FORK_LEFT.x, FORK_LEFT.y, bx, by);
    this.rubberBandGfx.lineBetween(FORK_RIGHT.x, FORK_RIGHT.y, bx, by);

    // Pull indicator circle (shown only while dragging)
    if (this.isDragging) {
      const dx = bx - SLING_X;
      const dy = by - SLING_Y;
      const power = Math.min(Math.sqrt(dx * dx + dy * dy) / MAX_PULL, 1);

      const color =
        power < 0.5 ? 0x44ff44 : power < 0.8 ? 0xffdd00 : 0xff4444;
      this.rubberBandGfx.lineStyle(2, color, 0.55);
      this.rubberBandGfx.strokeCircle(SLING_X, SLING_Y, MAX_PULL);

      // Power text
      const pct = Math.round(power * 100);
      // Draw a small arc to show power
      this.rubberBandGfx.lineStyle(4, color, 0.7);
      this.rubberBandGfx.beginPath();
      this.rubberBandGfx.arc(
        SLING_X,
        SLING_Y,
        MAX_PULL + 10,
        -Math.PI / 2,
        -Math.PI / 2 + (pct / 100) * 2 * Math.PI,
        false
      );
      this.rubberBandGfx.strokePath();
    }
  }

  showEndScreen(success: boolean): void {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(20);

    const mainMsg = success ? "クリア！" : "ゲームオーバー";

    this.add
      .text(W / 2, H / 2 - 70, mainMsg, {
        fontFamily: "Arial Black, Arial",
        fontSize: "52px",
        color: success ? "#ffd700" : "#ff4444",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.add
      .text(W / 2, H / 2 + 5, `スコア: ${this.score}`, {
        fontFamily: "Arial Black, Arial",
        fontSize: "38px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(21);

    const btn = this.add
      .text(W / 2, H / 2 + 85, "もう一度プレイ", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#1a5276",
        padding: { x: 22, y: 11 },
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setStyle({ color: "#ffdd00" }));
    btn.on("pointerout", () => btn.setStyle({ color: "#ffffff" }));
    btn.on("pointerdown", () => this.scene.restart());

    this.tweens.add({
      targets: btn,
      alpha: 0.55,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
  }
}
