# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Phaser 3 (v3.90) + TypeScript + Vite によるゲーム開発テンプレート。Cloudflare Workers (Static Assets) への自動デプロイ対応。

## コマンド

- **パッケージマネージャー:** pnpm (v9.15.1)
- **開発サーバー起動:** `pnpm dev` (ポート8080)
- **ビルド:** `pnpm build` (tsc型チェック + vite build)
- **ビルド+デプロイ:** `pnpm deploy` (build → wrangler deploy)
- **プレビュー:** `pnpm preview`
- **リンター・テスト:** 未設定

## アーキテクチャ

### シーンフロー

このブランチ（`proto/deduction-boss`）では Boot → Preloader → Prep → Battle → Result → Prep。詳細は下の「試作」節と `docs/design.md` を参照。

- `src/main.ts` — エントリーポイント。Phaser.Game インスタンス生成、設定定義（ゲームパッド有効）。新しいシーンは `config.scene` 配列に追加する
- `src/scenes/Boot.ts` — 最小限のアセット読み込み後 Preloader へ遷移
- `src/scenes/Preloader.ts` — 画像アセットは使わず、試作用テクスチャをすべて Graphics で生成して Prep へ遷移

### シーン追加時の規約

- `Scene` を継承し、`constructor` で `super("シーン名")` で文字列キーを登録
- `src/main.ts` の `config.scene` 配列にクラスを追加
- シーン遷移は `this.scene.start("シーン名")` で行う

### ゲーム設定

- 解像度: 1920x1080px（論理解像度）、背景色: #1a1a2e
- スケール: `Scale.FIT` + `CENTER_BOTH`（アスペクト比維持でスマホ画面にフィット）
- 物理エンジン: Arcade Physics (重力なし)
- 親要素: `#game-container` (index.html)

### TypeScript

- strict モード有効（`noUnusedLocals`, `noUnusedParameters` 含む）
- ターゲット: ES2020、モジュール: ESNext

### ビルド設定

- Vite で Phaser を別チャンク (`phaser.js`) に分離
- Terser による2パスミニファイ
- ベースパス: `/` (Cloudflare Workers用)

## デプロイ

GitHub Actions (`.github/workflows/deploy.yml`) が全ブランチへの push 時に自動ビルド・Cloudflare Workers デプロイを実行。

- 設定ファイル: `wrangler.jsonc` (Workers Static Assets、SPA モード)
- 必要な GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## 試作: 推理アクション「鉄甲の番人」（proto/deduction-boss ブランチ）

**設計の経緯・決定事項・未決事項は `docs/design.md` にまとめてある。作業前に必ず読むこと。**

### このブランチでの注意

- push 時は**コミットメッセージに `[skip ci]` を付ける**。付けないと Cloudflare に `deduction-boss` という Worker として公開デプロイされる（ユーザーはローカルで遊ぶ想定で、公開は依頼されていない）
- 変更後は `pnpm build` で型チェックを通すこと
- ゲームパッド入力は `Controls` 経由で扱い、シーンで直接キーやパッドを読まない

シーンフローは Boot → Preloader（テクスチャ生成）→ Prep（証言・観察記録・武器3つ選択）→ Battle → Result → Prep。

- `src/data/weapons.ts` — 武器8種の定義
- `src/data/boss.ts` — ボスの装甲状態遷移と `resolveHit`（武器×状態 → 反応・観察記録）、証言
- `src/data/progress.ts` — 観察記録・挑戦履歴（localStorage）
- `src/input/Controls.ts` — キーボードとゲームパッド（標準配置）をアクションに統合
- `src/scenes/Game.ts` は削除済み
