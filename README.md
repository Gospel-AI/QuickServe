# QuickServe

地域の熟練ワーカーのためのサービス予約プラットフォーム

## プロジェクト構成

```
quickserve/
├── apps/
│   ├── api/           # Node.js + Express + TypeScript + Prisma
│   ├── mobile/        # React Native (Expo)
│   └── web/           # Next.js (Admin Panel)
└── docs/
    └── openapi.yaml   # API仕様書
```

## 技術スタック

| 領域 | 技術 |
|------|------|
| Mobile | React Native (Expo) |
| Web Admin | Next.js 15 |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | JWT + OTP (Africastalking) |
| Payment | MTN Mobile Money |
| Realtime | Socket.io |

## セットアップ

### 前提条件
- Node.js >= 20
- pnpm >= 9
- PostgreSQL

### インストール

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.env.example apps/web/.env

# データベースのセットアップ
pnpm db:push
```

### 開発サーバー起動

```bash
# すべてのアプリを起動
pnpm dev

# 個別に起動
pnpm dev:api      # API (port 3000)
pnpm dev:mobile   # Mobile (Expo)
pnpm dev:web      # Web Admin (port 3001)
```

## API エンドポイント

主要エンドポイント:

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/v1/auth/otp/send | OTP送信 |
| POST | /api/v1/auth/otp/verify | OTP検証 |
| GET | /api/v1/categories | カテゴリー一覧 |
| GET | /api/v1/workers/search | 近隣ワーカー検索 |
| POST | /api/v1/bookings | 予約作成 |
| POST | /api/v1/payments/initiate | 支払い開始 |

詳細は `docs/openapi.yaml` を参照してください。

## 開発ガイド

### コード生成（型定義）

OpenAPI仕様から型を自動生成:

```bash
# Mobile
cd apps/mobile && pnpm generate:api

# Web
cd apps/web && pnpm generate:api
```

### データベース操作

```bash
# スキーマをDBに反映
pnpm db:push

# マイグレーション作成
pnpm db:migrate

# Prisma Studio（GUI）
pnpm db:studio
```

## ディレクトリ構造詳細

### API (`apps/api/`)
```
src/
├── config/         # 環境変数、DB設定
├── common/         # 共通ミドルウェア、ユーティリティ
├── modules/        # 機能別モジュール
│   ├── auth/
│   ├── users/
│   ├── workers/
│   ├── bookings/
│   ├── payments/
│   └── reviews/
└── websocket/      # Socket.io設定
```

### Mobile (`apps/mobile/`)
```
app/
├── (auth)/         # 認証画面
├── (customer)/     # 顧客向け画面
└── (worker)/       # ワーカー向け画面
src/
├── store/          # Zustand状態管理
└── services/       # API通信
```

### Web (`apps/web/`)
```
src/
├── app/
│   ├── (auth)/     # ログイン
│   └── (dashboard)/ # 管理画面
├── store/          # Zustand状態管理
└── lib/            # API通信
```

## ライセンス

Private - All rights reserved
