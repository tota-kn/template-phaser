# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Phaser 3 (v3.90) + TypeScript + Vite によるゲーム開発テンプレート。Cloudflare Workers (Static Assets) への自動デプロイ対応。

## コマンド

- **パッケージマネージャー:** pnpm (v9.15.1)
- **開発サーバー起動:** `pnpm dev` (ポート8080)
- **ビルド:** `pnpm build` (tsc型チェック + vite build)
- **プレビュー:** `pnpm preview`

## アーキテクチャ

### シーンフロー

Boot → Preloader → Game の3段階で初期化される Phaser シーンベースアーキテクチャ。

- `src/main.ts` — エントリーポイント。Phaser.Game インスタンス生成、設定定義
- `src/scenes/Boot.ts` — 最小限のアセット読み込み後 Preloader へ遷移
- `src/scenes/Preloader.ts` — メインアセット読み込み（プログレスバーUI付き）、完了後 Game へ遷移
- `src/scenes/Game.ts` — メインゲームロジックの実装箇所

### ゲーム設定

- 解像度: 800x600px、背景色: #1a1a2e
- 物理エンジン: Arcade Physics (重力なし)
- 親要素: `#game-container` (index.html)

### ビルド設定

- Vite で Phaser を別チャンク (`phaser.js`) に分離
- Terser による2パスミニファイ
- ベースパス: `/` (Cloudflare Workers用)

## デプロイ

GitHub Actions (`.github/workflows/deploy.yml`) が main および claude/** ブランチへの push 時に自動ビルド・Cloudflare Workers デプロイを実行。

- main ブランチ: `template-phaser.<account>.workers.dev` にデプロイ
- 他ブランチ: `template-phaser-<ブランチ名>.<account>.workers.dev` にデプロイ（プレビュー用）
- 設定ファイル: `wrangler.jsonc` (Workers Static Assets)
- 必要な GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
