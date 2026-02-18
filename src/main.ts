import Phaser from "phaser";
import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { Game } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: "game-container",
  backgroundColor: "#87CEEB",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, Preloader, Game, GameOver],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 2400 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
};

new Phaser.Game(config);
