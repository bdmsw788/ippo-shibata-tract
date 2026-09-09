# IPPO — 新発田トラクト配布

新発田いのちのパンチャーチのトラクト配布プロジェクト用アプリ。新発田市の全戸(38,025世帯)への配布を、複数人で記録・共有しながら進捗を追跡する。

## 主な機能

- **ホーム**: 市全体の進捗、継続ストリーク、実績バッジ、今週のランキング、地区マップ、新発田の風景写真
- **記録**: 担当者・地区・エリアを選んで配布世帯数を記録。記録前後の進捗をその場でプレビュー
- **エリア**: 実際の地図(Leaflet + OpenStreetMap)で地区・町丁目ごとの進捗を確認。リスト表示・検索・絞り込みも可能
- **ランキング**: メンバー別の配布数、実績バッジ一覧、地区別制覇状況

## データ

- 世帯数は新発田市「町丁目字別人口・世帯数」統計(令和8年6月末時点)に基づく実データ
- 町丁目境界は国勢調査 小地域境界データ(geoshape.ex.nii.ac.jp)から取得し、緯度経度に変換して同梱
- 配布記録は共有データベース(Vercel KV / Upstash Redis)に保存され、担当者全員がリアルタイムに近い形で共有する

## セットアップ

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

ローカル開発時、`KV_REST_API_URL` / `KV_REST_API_TOKEN`(または `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`)が未設定の場合は `data/records.json` へのローカルファイル保存にフォールバックする。

## データの編集

- `src/lib/data.ts` — 町丁目・世帯数、メンバー名、バッジ定義、写真情報などの静的データ
- `public/geo/geo.json` — 町丁目・地区・市境界のGeoJSON(緯度経度)
- `public/photos/` — ホーム画面のフォトギャラリーに使う写真(すべてWikimedia Commonsのライセンス画像)

配布記録そのものは共有データベースに保存されるため、ファイル編集の対象ではない。

## 技術構成

- Next.js (App Router) + TypeScript
- 配布記録は `src/app/api/records/route.ts` 経由でVercel KV(Upstash Redis)に保存・取得
- 地図はLeaflet.js + OpenStreetMapのタイルをそのまま利用(APIキー不要、無料)

## デプロイ

このリポジトリはVercelにデプロイされている。`main`ブランチにpushすると自動でデプロイされる。
