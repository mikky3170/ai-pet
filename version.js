// [稼働Ver 作業版 Rev.13] 正式確定（代表ファイル v1.4.2）・マルチキャラクター完全独立バックアップ・キーファクトリ一元化・装飾SVG完全プラグイン化
/* ==========================================================================
   AIペット バージョン一元管理マネージャー (version.js)
   - システム全体のバージョン番号を一元定義（代表ファイル）
   - 更新履歴（最新10件）を動的にDOM（設定画面）へ描画
   ========================================================================== */

window.VersionManager = {
  current: "v1.4.2",

  history: [
    {
      version: "v1.4.2",
      date: "2026/11/23",
      changes: "キャラクターバックアップの完全独立化（他キャラの写真・ログ混入の完全根絶）。ストレージキーファクトリの一元化。リアル装飾SVGのプラグイン側移行による完全プラガブル化。PCビューワーのマルチキャラクター動的対応およびスマホ復元時の会話ログ安全保護マージ機能搭載。"
    },
    {
      version: "v1.4.1",
      date: "2026/11/22",
      changes: "単一状態機械（State Machine）によるステータス完全同期。応答オブジェクト入口正規化（表示・発話・保存の乖離根絶）。ビューワーにおける写真なし日手描きスケッチカード完全同期。"
    },
    {
      version: "v1.4.0",
      date: "2026/11/22",
      changes: "家族・友人・ゲストの話者バトンタッチ機能および関連UI・判定ロジックを完全撤廃。ロジックの肥大化・誤爆を根絶し、おやびん（助手）と一対一で心を通わせる愛らしい対話エンジンへ完全回帰。"
    },
    {
      version: "v1.3.2",
      date: "2026/11/22",
      changes: "幼馴染かまぶー君の本名『かますか』および音声認識ゆれの文脈連動型スマート名寄せ検証。"
    },
    {
      version: "v1.3.1",
      date: "2026/11/20",
      changes: "直近写真の継続対話エンジン新設（撮影後も写真を見直しながら質問・会話が可能に）。二重敬称の完全根絶。クロちゃんのシンキング時にお座り後ろ足を追加し自然な両足着地造形へ刷新。"
    },
    {
      version: "v1.3.0",
      date: "2026/11/19",
      changes: "同伴シチュエーション挨拶エンジン搭載（出先での仕事終わりに『おかえり』を言わずポケットから労う相棒認識）。表示用テキストとVOICEVOX読み仮名（display / speech）のJSON完全分離。"
    },
    {
      version: "v1.2.1",
      date: "2026/11/19",
      changes: "クロちゃんのスタイリッシュな実写一致ベクター造形（澄んだゴールドライムアイ・気品ある体躯・両手バンザイ肉球Happyポーズ）へ刷新。映画タイトル・会社名のカギ括弧二重読みを物理根絶。VOICEVOXローカル直結待機時間を5.5秒に緩和。"
    },
    {
      version: "v1.2.0",
      date: "2026/11/18",
      changes: "core_engine.js と app.js の責務完全分離。映画・英字タイトルの万能Unicodeルビ置換エンジン。アイコン絶対終端ロジック搭載。シロくんの枕詞ループ根絶。全コアロジック・愛されベクター造形100%維持。"
    },
    {
      version: "v1.1.5",
      date: "2026/11/18",
      changes: "昔の愛されたベクターアニメーション・SVG造形・キーフレームを完全復元。語尾重複完全根絶・Gemini API・データ保全等の最新コア機能は100%完全維持。"
    },
    {
      version: "v1.1.4",
      date: "2026/11/18",
      changes: "マーク挟み込みによる語尾重複（ニャ！🐾ニャ！等）の物理的完全根絶ロジックを確立。"
    }
  ],

  applyToDOM() {
    // 1. 設定モーダルのタイトル右端のバージョン表示
    const settingModalVer = document.getElementById('setting-modal-version-tag');
    if (settingModalVer) {
      settingModalVer.textContent = `${this.current}`;
    }

    // 2. フッターのバージョン表示（アクティブキャラ名付き）
    const footerVer = document.getElementById('app-footer-version-tag');
    if (footerVer) {
      const curChar = (typeof getCurChar === 'function') ? getCurChar() : { name: "クロちゃん", id: "kuro" };
      footerVer.textContent = curChar.id === 'shiro' ? `🦉 シロくん（ホウ博士） ${this.current}` : `🐾 クロちゃん ${this.current}`;
    }

    // 3. 設定画面の更新履歴リスト（最新10件）
    const container = document.getElementById('version-history-container');
    if (container) {
      container.innerHTML = '';
      this.history.slice(0, 10).forEach(item => {
        const row = document.createElement('div');
        row.className = 'version-history-row';
        row.innerHTML = `
          <div class="version-history-meta">
            <span class="version-tag-pill feature">${item.version}</span>
            <span class="version-date-text">${item.date}</span>
          </div>
          <div class="version-changes-text">${item.changes}</div>
        `;
        container.appendChild(row);
      });
    }
  }
};