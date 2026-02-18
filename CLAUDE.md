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

Boot → Preloader → Game の3段階で初期化される Phaser シーンベースアーキテクチャ。

- `src/main.ts` — エントリーポイント。Phaser.Game インスタンス生成、設定定義。新しいシーンは `config.scene` 配列に追加する
- `src/scenes/Boot.ts` — 最小限のアセット読み込み後 Preloader へ遷移
- `src/scenes/Preloader.ts` — メインアセット読み込み（プログレスバーUI付き）、完了後 Game へ遷移。アセットの読み込みは `preload()` 内に追加する
- `src/scenes/Game.ts` — メインゲームロジックの実装箇所

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
