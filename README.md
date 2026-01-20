# QuickServe

地域の熟練ワーカーのためのサービス予約プラットフォーム

## プロジェクト構成

```
quickserve/
├── apps/
│   ├── api-public/    # 顧客・ワーカー向けAPI
│   ├── api-admin/     # 管理者専用API
│   ├── mobile/        # React Native (Expo)
│   ├── web-viewer/    # 顧客向けWeb
│   └── web-admin/     # 管理パネル
└── docs/
    └── openapi.yaml   # API仕様書
```

## 技術スタック

| 領域 | 技術 |
|------|------|
| Mobile | React Native (Expo SDK 54) |
| Web | Next.js 15 |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | JWT + OTP (Africastalking) |
| Payment | MTN Mobile Money |
| Realtime | Socket.io |

## クイックスタート

### 前提条件
- Node.js >= 20
- pnpm >= 9
- PostgreSQL
- ngrok (モバイル開発用)

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/Gospel-AI/QuickServe.git
cd QuickServe

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp apps/api-public/.env.example apps/api-public/.env
cp apps/api-admin/.env.example apps/api-admin/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web-viewer/.env.example apps/web-viewer/.env
cp apps/web-admin/.env.example apps/web-admin/.env

# データベースのセットアップ
createdb quickserve
pnpm db:push

# サンプルデータの投入
cd apps/api-public && pnpm db:seed
```

## 開発サーバー起動

### 基本起動

```bash
# すべてのアプリを起動
pnpm dev

# 個別に起動
pnpm dev:api-public   # API Public (port 3000)
pnpm dev:api-admin    # API Admin (port 3003)
pnpm dev:web-viewer   # Web Viewer (port 3001)
pnpm dev:web-admin    # Web Admin (port 3002)
pnpm dev:mobile       # Mobile (Expo)
```

### モバイル開発セットアップ（実機テスト）

実機でモバイルアプリをテストする場合、APIをインターネット経由でアクセス可能にする必要があります。

#### 1. APIサーバーを起動

```bash
pnpm dev:api-public
```

#### 2. ngrokでAPIをトンネル

```bash
ngrok http 3000
```

ngrokが表示するURLをコピー（例: `https://xxxx.ngrok-free.app`）

#### 3. モバイルの環境変数を更新

```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app/api/v1
```

#### 4. Expoをトンネルモードで起動

```bash
pnpm dev:mobile:tunnel
# または
cd apps/mobile && npx expo start --tunnel
```

#### 5. Expo Goアプリでスキャン

QRコードをExpo Goアプリでスキャンして接続

### 開発環境の構成例

| サービス | URL | 用途 |
|----------|-----|------|
| API (ngrok) | https://xxxx.ngrok-free.app | モバイルからのAPI |
| API (local) | http://localhost:3000 | Web開発用 |
| Expo (tunnel) | exp://xxxx.exp.direct | モバイルアプリ |
| Web Viewer | http://localhost:3001 | 顧客向けWeb |
| Web Admin | http://localhost:3002 | 管理パネル |

## テスト用アカウント

### OTP認証（開発モード）

開発環境では固定OTPコード `123456` でログイン可能です。

### サンプルユーザー

| 種別 | 電話番号 | 備考 |
|------|----------|------|
| 顧客 | 0241234567 | Kwame Asante |
| 顧客 | 0551234567 | Ama Mensah |
| 顧客 | 0271234567 | Kofi Boateng |
| ワーカー | 0242222222 | Emmanuel (Plumber) |
| ワーカー | 0243333333 | Abena (Electrician) |
| ワーカー | 0244444444 | Yaw (Phone Repair) |
| ワーカー | 0245555555 | Akosua (Cleaning) |
| ワーカー | 0246666666 | Kwesi (Carpenter) |
| 管理者 | 0200000000 | password: admin123 |

## API エンドポイント

### Public API (`api-public`)

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/v1/auth/otp/request | OTP送信 |
| POST | /api/v1/auth/otp/verify | OTP検証 |
| GET | /api/v1/categories | カテゴリー一覧 |
| GET | /api/v1/workers/search | 近隣ワーカー検索 |
| POST | /api/v1/bookings | 予約作成 |
| POST | /api/v1/payments/initiate | 支払い開始 |

### Admin API (`api-admin`)

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/v1/admin/analytics/dashboard | ダッシュボード統計 |
| GET | /api/v1/admin/users | ユーザー一覧 |
| GET | /api/v1/admin/workers | ワーカー一覧 |
| POST | /api/v1/admin/workers/:id/verify | ワーカー承認 |
| POST | /api/v1/admin/workers/:id/reject | ワーカー拒否 |
| GET | /api/v1/admin/bookings | 予約一覧 |

詳細は `docs/openapi.yaml` を参照してください。

## データベース操作

```bash
# スキーマをDBに反映
pnpm db:push

# マイグレーション作成
pnpm db:migrate

# Prisma Studio（GUI）
pnpm db:studio

# サンプルデータ投入
cd apps/api-public && pnpm db:seed
```

## ディレクトリ構造

### API Public (`apps/api-public/`)
```
src/
├── config/         # 環境変数、DB設定
├── common/         # 共通ミドルウェア、ユーティリティ
├── modules/        # 機能別モジュール
│   ├── auth/       # 認証（OTP）
│   ├── users/      # ユーザー管理
│   ├── workers/    # ワーカー管理
│   ├── bookings/   # 予約管理
│   ├── payments/   # 決済（MTN MoMo）
│   └── reviews/    # レビュー
└── websocket/      # Socket.io（リアルタイム通知）
```

### Mobile (`apps/mobile/`)
```
app/
├── (auth)/         # 認証画面（ログイン、OTP検証）
├── (customer)/     # 顧客向け画面
└── (worker)/       # ワーカー向け画面
src/
├── store/          # Zustand状態管理
└── services/       # API通信
```

### Web Viewer (`apps/web-viewer/`)
```
app/
├── (auth)/         # ログイン、認証
├── (main)/         # メインページ
│   └── search/     # ワーカー検索
└── page.tsx        # ランディングページ
```

### Web Admin (`apps/web-admin/`)
```
src/app/
├── (auth)/         # 管理者ログイン
└── (dashboard)/    # 管理ダッシュボード
    └── dashboard/
        └── workers/ # ワーカー管理
```

## トラブルシューティング

### Network Error（モバイル）

1. APIサーバーが起動しているか確認
2. ngrokでAPIをトンネルしているか確認
3. `apps/mobile/.env` のURLがngrokのURLになっているか確認
4. Expoを再起動: `npx expo start --tunnel --clear`

### OTPが届かない

開発環境では実際のSMSは送信されません。固定コード `123456` を使用してください。

### Expo Go互換性エラー

プロジェクトはSDK 54を使用しています。Expo Goアプリを最新版に更新してください。

## ライセンス

Private - All rights reserved
