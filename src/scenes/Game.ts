import { Scene } from "phaser";

interface LevelSection {
  grounds: { x: number; width: number }[];
  platforms: { x: number; y: number }[];
  coins: { x: number; y: number }[];
  enemies: { x: number; y: number }[];
}

export class Game extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private flag!: Phaser.Physics.Arcade.Sprite;

  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  private moveLeft = false;
  private moveRight = false;
  private jumpPressed = false;
  private isGameOver = false;

  private readonly GROUND_Y = 952;
  private readonly PLAYER_SPEED = 450;
  private readonly JUMP_VELOCITY = -900;
  private readonly LEVEL_WIDTH = 12800;

  constructor() {
    super("Game");
  }

  create(): void {
    this.score = 0;
    this.isGameOver = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.jumpPressed = false;

    this.cameras.main.setBackgroundColor(0x87ceeb);

    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.setupCamera();
    this.setupCollisions();
    this.createUI();
    this.setupInput();
  }

  private createBackground(): void {
    // Sky gradient is the background color

    // Mountains (parallax layer)
    for (let i = 0; i < 10; i++) {
      const mx = i * 1400;
      const scale = 0.8 + Math.random() * 0.6;
      this.add
        .image(mx, this.GROUND_Y - 20, "mountain")
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setScrollFactor(0.3)
        .setAlpha(0.6);
    }

    // Clouds
    for (let i = 0; i < 20; i++) {
      const cx = i * 700 + Math.random() * 400;
      const cy = 80 + Math.random() * 250;
      this.add
        .image(cx, cy, "cloud")
        .setScale(1 + Math.random() * 1.5)
        .setScrollFactor(0.2 + Math.random() * 0.1)
        .setAlpha(0.7 + Math.random() * 0.3);
    }

    // Bushes (foreground decoration)
    for (let i = 0; i < 30; i++) {
      const bx = i * 450 + Math.random() * 200;
      this.add
        .image(bx, this.GROUND_Y - 10, "bush")
        .setOrigin(0.5, 1)
        .setScale(0.8 + Math.random() * 0.8)
        .setScrollFactor(0.9);
    }
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.group();
    this.enemies = this.physics.add.group();

    const sections = this.generateLevelData();

    // Create ground tiles
    for (const section of sections) {
      for (const ground of section.grounds) {
        const tileCount = Math.ceil(ground.width / 128);
        for (let i = 0; i < tileCount; i++) {
          this.platforms
            .create(ground.x + i * 128, this.GROUND_Y, "ground")
            .setOrigin(0, 0)
            .refreshBody();
        }
      }

      // Create floating platforms
      for (const plat of section.platforms) {
        this.platforms
          .create(plat.x, plat.y, "platform")
          .refreshBody();
      }

      // Create coins
      for (const coin of section.coins) {
        const c = this.coins.create(coin.x, coin.y, "coin") as Phaser.Physics.Arcade.Sprite;
        c.setScale(0.8);
        (c.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.tweens.add({
          targets: c,
          y: coin.y - 15,
          duration: 1000 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      // Create enemies
      for (const enemy of section.enemies) {
        const e = this.enemies.create(enemy.x, enemy.y, "enemy") as Phaser.Physics.Arcade.Sprite;
        e.setScale(1.2);
        const body = e.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setSize(40, 36);
        body.setOffset(8, 6);
        this.tweens.add({
          targets: e,
          x: enemy.x + 150,
          duration: 2000 + Math.random() * 1000,
          yoyo: true,
          repeat: -1,
          ease: "Linear",
        });
      }
    }

    // Goal flag at end
    this.flag = this.physics.add.sprite(this.LEVEL_WIDTH - 300, this.GROUND_Y - 100, "flag");
    this.flag.setOrigin(0.5, 1);
    (this.flag.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.flag.body as Phaser.Physics.Arcade.Body).setSize(30, 180);
  }

  private generateLevelData(): LevelSection[] {
    const sections: LevelSection[] = [];
    const sectionWidth = 1600;
    const numSections = Math.floor(this.LEVEL_WIDTH / sectionWidth);

    for (let s = 0; s < numSections; s++) {
      const baseX = s * sectionWidth;
      const section: LevelSection = {
        grounds: [],
        platforms: [],
        coins: [],
        enemies: [],
      };

      // Ground with occasional gaps (not in first section)
      if (s === 0) {
        section.grounds.push({ x: baseX, width: sectionWidth });
      } else {
        const hasGap = s > 1 && s % 2 === 0;
        if (hasGap) {
          const gapStart = 600 + Math.floor(Math.random() * 400);
          const gapWidth = 256 + Math.floor(Math.random() * 128);
          section.grounds.push({ x: baseX, width: gapStart });
          section.grounds.push({
            x: baseX + gapStart + gapWidth,
            width: sectionWidth - gapStart - gapWidth,
          });
        } else {
          section.grounds.push({ x: baseX, width: sectionWidth });
        }
      }

      // Platforms (more as level progresses)
      const platCount = s === 0 ? 1 : 2 + Math.floor(Math.random() * 2);
      for (let p = 0; p < platCount; p++) {
        const px = baseX + 200 + p * 400 + Math.floor(Math.random() * 200);
        const py = 550 + Math.floor(Math.random() * 250);
        section.platforms.push({ x: px, y: py });

        // Coins on platforms
        for (let c = -1; c <= 1; c++) {
          section.coins.push({ x: px + c * 50, y: py - 50 });
        }
      }

      // Extra floating coins
      const extraCoins = 2 + Math.floor(Math.random() * 3);
      for (let c = 0; c < extraCoins; c++) {
        section.coins.push({
          x: baseX + 200 + c * 300 + Math.floor(Math.random() * 100),
          y: this.GROUND_Y - 80 - Math.floor(Math.random() * 100),
        });
      }

      // Enemies (none in first section, increasing difficulty)
      if (s > 0) {
        const enemyCount = Math.min(1 + Math.floor(s / 2), 3);
        for (let e = 0; e < enemyCount; e++) {
          section.enemies.push({
            x: baseX + 300 + e * 450 + Math.floor(Math.random() * 200),
            y: this.GROUND_Y - 30,
          });
        }
      }

      sections.push(section);
    }

    return sections;
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(200, this.GROUND_Y - 100, "player");
    this.player.setScale(1.2);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(40, 70);
    body.setOffset(12, 5);
    body.setCollideWorldBounds(false);
    body.setMaxVelocityY(1200);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.LEVEL_WIDTH, 1080);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.05);
    this.cameras.main.setDeadzone(200, 300);
    this.physics.world.setBounds(0, 0, this.LEVEL_WIDTH, 1200);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);

    this.physics.add.overlap(
      this.player,
      this.coins,
      (_player, coin) => {
        const c = coin as Phaser.Physics.Arcade.Sprite;
        this.tweens.killTweensOf(c);
        c.destroy();
        this.score += 10;
        this.scoreText.setText(`スコア: ${this.score}`);
        this.showScorePopup(c.x, c.y);
      },
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_player, enemy) => {
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;

        // Stomp from above
        if (playerBody.velocity.y > 0 && playerBody.bottom < enemySprite.body!.center.y) {
          this.tweens.killTweensOf(enemySprite);
          enemySprite.destroy();
          playerBody.setVelocityY(this.JUMP_VELOCITY * 0.6);
          this.score += 50;
          this.scoreText.setText(`スコア: ${this.score}`);
          this.showScorePopup(enemySprite.x, enemySprite.y, "+50");
        } else {
          this.handleDeath();
        }
      },
    );

    this.physics.add.overlap(this.player, this.flag, () => {
      this.handleGoal();
    });
  }

  private showScorePopup(x: number, y: number, text = "+10"): void {
    const popup = this.add.text(x, y, text, {
      fontFamily: "Arial Black, Arial",
      fontSize: "28px",
      color: "#ffdd00",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 60,
      alpha: 0,
      duration: 600,
      onComplete: () => popup.destroy(),
    });
  }

  private handleDeath(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.player.setTint(0xff0000);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, this.JUMP_VELOCITY * 0.8);
    body.setAllowGravity(true);

    this.time.delayedCall(1500, () => {
      this.scene.start("GameOver", { score: this.score });
    });
  }

  private handleGoal(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.score += 1000;
    this.scoreText.setText(`スコア: ${this.score}`);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);

    const clearText = this.add
      .text(this.player.x, this.player.y - 100, "STAGE CLEAR!", {
        fontFamily: "Arial Black, Arial",
        fontSize: "64px",
        color: "#ffdd00",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: clearText,
      y: clearText.y - 50,
      duration: 1500,
      ease: "Bounce.easeOut",
    });

    this.time.delayedCall(3000, () => {
      this.scene.start("GameOver", { score: this.score });
    });
  }

  private createUI(): void {
    this.scoreText = this.add
      .text(30, 20, `スコア: ${this.score}`, {
        fontFamily: "Arial Black, Arial",
        fontSize: "36px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Mobile touch buttons
    this.createTouchControls();
  }

  private createTouchControls(): void {
    const btnScale = 0.9;
    const bottomY = 980;

    // Left button
    const btnLeft = this.add
      .image(130, bottomY, "btn-left")
      .setScrollFactor(0)
      .setDepth(100)
      .setScale(btnScale)
      .setInteractive()
      .setAlpha(0.6);

    btnLeft.on("pointerdown", () => {
      this.moveLeft = true;
      btnLeft.setAlpha(0.9);
    });
    btnLeft.on("pointerup", () => {
      this.moveLeft = false;
      btnLeft.setAlpha(0.6);
    });
    btnLeft.on("pointerout", () => {
      this.moveLeft = false;
      btnLeft.setAlpha(0.6);
    });

    // Right button
    const btnRight = this.add
      .image(330, bottomY, "btn-right")
      .setScrollFactor(0)
      .setDepth(100)
      .setScale(btnScale)
      .setInteractive()
      .setAlpha(0.6);

    btnRight.on("pointerdown", () => {
      this.moveRight = true;
      btnRight.setAlpha(0.9);
    });
    btnRight.on("pointerup", () => {
      this.moveRight = false;
      btnRight.setAlpha(0.6);
    });
    btnRight.on("pointerout", () => {
      this.moveRight = false;
      btnRight.setAlpha(0.6);
    });

    // Jump button
    const btnJump = this.add
      .image(1780, bottomY, "btn-jump")
      .setScrollFactor(0)
      .setDepth(100)
      .setScale(btnScale)
      .setInteractive()
      .setAlpha(0.6);

    btnJump.on("pointerdown", () => {
      this.jumpPressed = true;
      btnJump.setAlpha(0.9);
    });
    btnJump.on("pointerup", () => {
      this.jumpPressed = false;
      btnJump.setAlpha(0.6);
    });
    btnJump.on("pointerout", () => {
      this.jumpPressed = false;
      btnJump.setAlpha(0.6);
    });
  }

  private setupInput(): void {
    // Keyboard support for desktop
    const cursors = this.input.keyboard!.createCursorKeys();
    const wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as {
      up: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      space: Phaser.Input.Keyboard.Key;
    };

    this.events.on("update", () => {
      if (this.isGameOver) return;

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const onFloor = body.blocked.down;

      // Horizontal movement
      const goLeft = this.moveLeft || cursors.left.isDown || wasd.left.isDown;
      const goRight = this.moveRight || cursors.right.isDown || wasd.right.isDown;

      if (goLeft) {
        body.setVelocityX(-this.PLAYER_SPEED);
        this.player.setFlipX(true);
      } else if (goRight) {
        body.setVelocityX(this.PLAYER_SPEED);
        this.player.setFlipX(false);
      } else {
        body.setVelocityX(0);
      }

      // Jump
      const jumpInput =
        this.jumpPressed || cursors.up.isDown || wasd.up.isDown || wasd.space.isDown;
      if (jumpInput && onFloor) {
        body.setVelocityY(this.JUMP_VELOCITY);
      }

      // Fall off screen
      if (this.player.y > 1200) {
        this.handleDeath();
      }
    });
  }

  update(): void {
    // Logic handled in events.on("update") for input binding
  }
}
