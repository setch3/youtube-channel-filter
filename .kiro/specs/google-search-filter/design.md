# 設計書

## 概要

YouTube Channel Filter拡張機能にGoogle検索結果でのYouTube動画フィルタリング機能を追加します。この機能は既存のYouTube内フィルタリング機能と同じブロックリストを使用し、Google検索結果に表示されるYouTube動画を対象チャンネルに基づいて非表示にします。

## アーキテクチャ

### 拡張機能の拡張

現在の拡張機能は`*://*.youtube.com/*`のみを対象としていますが、Google検索ページ（`*://www.google.com/*`）も対象に追加する必要があります。

### コンテンツスクリプトの分離

- **既存**: `content.js` - YouTube専用のフィルタリングロジック
- **新規**: `google-content.js` - Google検索専用のフィルタリングロジック
- **共通**: 設定管理とストレージ同期は両方で共有

## コンポーネントと インターフェース

### 1. Manifest.json の更新

```json
{
  "host_permissions": [
    "*://*.youtube.com/*",
    "*://www.google.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["*://*.youtube.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["*://www.google.com/*"],
      "js": ["google-content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### 2. Google検索用コンテンツスクリプト

#### Google検索結果のYouTube動画セレクタ
Google検索結果でのYouTube動画は以下の構造で表示されます：
- 一般的な動画結果: `div[data-ved]` 内の `a[href*="youtube.com/watch"]`
- 動画カルーセル: `g-scrolling-carousel` 内の YouTube リンク
- 埋め込み動画プレビュー: `div[jsname]` 内の YouTube コンテンツ

#### セレクタ戦略
```javascript
const googleYouTubeSelectors = [
  'div[data-ved] a[href*="youtube.com/watch"]',
  'div[data-ved] a[href*="youtube.com/shorts"]',
  'g-scrolling-carousel a[href*="youtube.com"]',
  'div[jsname] a[href*="youtube.com"]'
];
```

### 3. チャンネル情報抽出

Google検索結果からYouTube動画のチャンネル情報を抽出する方法：

1. **URL解析**: YouTube URLからチャンネルIDまたはハンドルを抽出
2. **テキスト解析**: 検索結果のスニペットからチャンネル名を抽出
3. **メタデータ**: 可能な場合、構造化データからチャンネル情報を取得

### 4. 設定管理の拡張

#### 新しい設定項目
```javascript
{
  bannedIds: [],           // 既存
  bannedNames: [],         // 既存
  hideShortsSearch: false, // 既存
  enableGoogleFilter: true // 新規: Google検索フィルタリングの有効/無効
}
```

## データモデル

### YouTube動画情報の構造
```javascript
{
  url: string,           // YouTube動画のURL
  channelId: string,     // チャンネルID（@handleまたはUCID）
  channelName: string,   // チャンネル表示名
  title: string,         // 動画タイトル
  element: HTMLElement   // 対象のDOM要素
}
```

### フィルタリング判定ロジック
```javascript
function shouldHideVideo(videoInfo, bannedIds, bannedNames) {
  const idMatch = bannedIds.some(id => 
    videoInfo.channelId && videoInfo.channelId.toLowerCase() === id.toLowerCase()
  );
  const nameMatch = bannedNames.some(name => 
    videoInfo.channelName && videoInfo.channelName.includes(name)
  );
  return idMatch || nameMatch;
}
```

## エラーハンドリング

### 1. DOM要素の取得失敗
- チャンネル情報が取得できない場合は、動画を非表示にしない
- ログ出力でデバッグ情報を提供（開発時のみ）

### 2. ストレージアクセスエラー
- Chrome storage APIのエラーをキャッチ
- デフォルト設定で継続動作

### 3. Google検索ページの構造変更
- セレクタが無効になった場合の fallback 機能
- 複数のセレクタパターンでロバスト性を確保

## テスト戦略

### 1. 単体テスト
- チャンネル情報抽出関数のテスト
- フィルタリング判定ロジックのテスト
- 設定管理機能のテスト

### 2. 統合テスト
- Google検索結果での実際のフィルタリング動作
- 設定変更の即座反映
- MutationObserverによる動的コンテンツ対応

### 3. 手動テスト項目
- 様々な検索クエリでのYouTube動画フィルタリング
- 動的コンテンツ読み込み（無限スクロール等）での動作
- 設定ページでの有効/無効切り替え
- 既存のYouTube内フィルタリングとの連携

## パフォーマンス考慮事項

### 1. 効率的なDOM監視
- MutationObserverの対象を検索結果コンテナに限定
- 不要なDOM走査を避けるための最適化されたセレクタ

### 2. 設定キャッシュ
- ストレージアクセスを最小限に抑制
- メモリ内での設定キャッシュ

### 3. 非同期処理
- DOM操作をメインスレッドをブロックしないように実装
- 大量の検索結果に対する段階的処理

## セキュリティ考慮事項

### 1. コンテンツセキュリティポリシー
- Google検索ページのCSPに準拠
- インラインスクリプトの回避

### 2. 権限の最小化
- 必要最小限のhost_permissionsのみ要求
- ユーザーデータへの不要なアクセスを回避

## 実装フェーズ

### フェーズ1: 基本機能
- Google検索ページでの基本的なYouTube動画検出
- 既存ブロックリストによるフィルタリング

### フェーズ2: 動的コンテンツ対応
- MutationObserverによる動的コンテンツ監視
- 無限スクロール等への対応

### フェーズ3: 設定拡張
- Google検索フィルタリングの有効/無効設定
- オプションページの更新