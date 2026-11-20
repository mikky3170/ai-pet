// [稼働Ver 作業版 Rev.8] v1.3.1 正式確定・直近写真継続対話・話者ピル3大集約・二重敬称根絶・シンキング両足お座り造形
/* ==========================================================================
   AIペット バージョン一元管理マネージャー (version.js)
   - システム全体のバージョン番号を一元定義（v1.3.1 正式確定）
   - 更新履歴（最新10件）を動的にDOM（設定画面）へ描画
   ========================================================================== */

window.VersionManager = {
  current: "v1.3.1",

  history: [
    {
      version: "v1.3.1",
      date: "2026/11/20",
      changes: "直近写真の継続対話エンジン新設（撮影後も写真を見直しながら質問・会話が可能に）。話者バトンタッチを『家族/友人/ゲスト』の3大スマートピルに集約し確実クリア化。二重敬称（かまぶーくんさん等）の完全根絶。クロちゃんのシンキング時にお座り後ろ足を追加し自然な両足着地造形へ刷新。"
    },
    {
      version: "v1.3.0",
      date: "2026/11/19",
      changes: "同伴シチュエーション挨拶エンジン搭載（出先での仕事終わりに『おかえり』を言わずポケットから労う相棒認識）。幼馴染かまぶーくんの完全記憶。表示用テキストとVOICEVOX読み仮名（display / speech）のJSON完全分離。"
    },
    {
      version: "v1.2.1",
      date: "2026/11/19",
      changes: "クロちゃんのスタイリッシュな実写一致ベクター造形（澄んだゴールドライムアイ・気品ある体躯・両手バンザイ肉球Happyポーズ）へ刷新。映画タイトル・会社名のカギ括弧二重読みを物理根絶。VOICEVOXローカル直結待機時間を5.5秒に緩和し完走率を最大化。絵日記写真の日付ロック厳格化。"
    },
    {
      version: "v1.2.0",
      date: "2026/11/18",
      changes: "core_engine.js と app.js の責務完全分離。映画・英字タイトルの万能Unicodeルビ置換エンジン（ゴジラ-1.0、SPY×FAMILY等の二重重複を物理根絶）。アイコン絶対終端ロジック搭載（アイコン後に言葉を一切漏らさない）。シロくんの枕詞ループ根絶（プロンプト・履歴・受信サニタイズの三重防護）。促音・長音・ひらがな語尾の完全集約。全コアロジック・愛されベクター造形100%維持。"
    },
    {
      version: "v1.1.5",
      date: "2026/11/18",
      changes: "飼い主さんのご指示に基づき、昔の愛されたベクターアニメーション・SVG造形・キーフレームを完全復元（クロちゃん：ふさふさ尻尾・胸毛・耳ピクピク・顎あて熟考・バンザイ肉球／シロくん：ぽっちゃり丸体型・ちょこん耳羽・右羽パタパタ・モフモフ羽添え思索・両翼羽ばたき）。語尾重複完全根絶・Gemini API・データ保全等の最新コア機能は100%完全維持。"
    },
    {
      version: "v1.1.4",
      date: "2026/11/18",
      changes: "マーク挟み込みによる語尾重複（ニャ！🐾ニャ！等）の物理的完全根絶ロジックを確立。"
    },
    {
      version: "v1.1.3",
      date: "2026/11/18",
      changes: "瞳の中心軸固定による瞬きバグ解消。実写完全一致テクスチャ検証。"
    },
    {
      version: "v1.1.2",
      date: "2026/11/17",
      changes: "上部ヘッダーUI刷新（日記帳ボタン移設・マイク待機中のエメラルドグリーン脈動パルス発光）。朗読機能の本文巻き込み防止。写真なし日の手描きスケッチカード自動表示。"
    },
    {
      version: "v1.1.1",
      date: "2026/11/16",
      changes: "Tailscale経由でのPCローカルVoiceVox直結安定化。絵日記の写真プール厳格日付ロック。自声エコー根絶機構強化。とりけし機能のロールバック連携。"
    },
    {
      version: "v1.1.0",
      date: "2025/03/05",
      changes: "パートナー選択（クロちゃん ⇔ シロくん/ホウ博士）完全分離アーキテクチャ実装。キャラ別音声記憶・まぶたキャリブレーション個別管理。砂時計付きキッチンタイマーウィジェット新設。"
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