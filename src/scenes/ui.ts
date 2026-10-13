export const FONT = '"Hiragino Sans","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';

export function textStyle(
  size: number,
  color = "#e8e8f0",
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color, ...extra };
}
