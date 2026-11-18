// [v1.1.2 作業版 Rev.1] 上部ヘッダーUI刷新・マイク待機グリーン化・四隅純白化・朗読復旧・検索3段階使い分け・キャラ個性大幅強化
/* ==========================================================================
   AIペット クロちゃん🐾＆シロくん🦉 バージョン一元管理エンジン（version.js v1.1.2）
   - バージョン管理ルール完全準拠（大幅刷新:〇 / 機能追加:● / 修正:◎）
   - システム指示（System Instructions）の日付基準に100%連動
   - アプリ本体（index.html）およびアルバムビューワー（viewer.html）のバージョン完全同期
   - 他ファイル内のバージョン文字列ハードコードを全廃し、本ファイルのみで一元管理
   ========================================================================== */

const VersionManager = {
  // 正式バージョン（v1.1.2）
  current: "v1.1.2",

  // バージョン更新履歴（最新順・最大10件保持）
  history: [
    {
      version: "v1.1.2",
      date: "2026/11/09",
      type: "feature",   // 機能追加・UI刷新（●更新）
      changes: "上部ヘッダーUIを全面刷新（旧モデルバッジ撤廃・『📖 日記帳』を右端特等席へ移設・中央ステータス視認性向上）。マイク待機中（オン）にエメラルドグリーン発光＆呼吸パルスを適用し、話しかけ可能状態を直感化。外向きシャドウの滲みを除去し四隅の外側を完全純白化。絵日記朗読機能のイベントすり抜け・本文巻き込みバグを完全改修。写真なし日にクロちゃん・シロくんの手描き風スケッチイラストを自動表示。日記帳の『ひとこと』がスクロールせず1画面に収まるようレイアウト最適化。一般的な質問ではカードを出さずAIが音声解説する検索3段階使い分けを配備。クロちゃん（膝・おなか乗り、前世発明）＆シロくん（未来研究所、右肩・左腕とまり、風に弱いギャップ）の個性を大幅強化。"
    },
    {
      version: "v1.1.1 (Rev.2)",
      date: "2026/11/09",
      type: "fix",       // 修正（◎更新）
      changes: "絵日記写真の日付境界を完全厳格化。写真保存時の対象日付バインドにより、過去や別日の写真プールへの写真混入バグを物理的に完全根絶。当日撮影された写真のみを厳格抽出し写真なし日の過去引き継ぎを遮断。全コードからバージョン文字列のハードコードを撤廃しversion.jsへ完全一元化。Tailscale・スマホ環境での旧キャッシュ起動を防止するキャッシュバスター（?v=v1.1.1）を全スクリプトに装備。"
    },
    {
      version: "v1.1.1",
      date: "2026/11/09",
      type: "fix",       // 修正（◎更新）
      changes: "語尾置換（cleanEnding）の文末アンカー厳格化によりマンホール・ホテル等の語中『ホ』誤読を完全根絶。写真ストレージ安全お掃除時の原本JSONに絵日記本文・ひとことを完全保持させ、PCビューワー（viewer.html）で本文未作成日であっても写真プール・メイン写真が100%閲覧・拡大・整理できる堅牢仕様へ根本改修。ソース直書きの個人名ハードコードを全撤廃し、PCビューワーから誰でも自由に単語登録・削除できる動的音声認識辞書（customDictionary）連携基盤を新設。"
    },
    {
      version: "v1.0.0 (Rev.11)",
      date: "2026/11/09",
      type: "fix",       // 修正（◎更新）
      changes: "シロくんのおてつだいモード時の即時ツール実行指示をクロちゃんと同等に強化。さらにカード救済フォールバック（_detectCardsFromSpeech）をセリフの言い回し依存から完全脱却させ、ユーザーが料理ジャンルや施設、ニュースを求めた際はペットのセリフに関わらず100%確実にGoogleマップ・ニュースカードを発行する堅牢アーキテクチャへ改修。"
    },
    {
      version: "v1.0.0 (Rev.10)",
      date: "2026/11/09",
      type: "fix",       // 修正（◎更新）
      changes: "写真撮影時の呼びかけ・AI思考依頼・吹き出しをキャラクタープラグイン定義へ完全一本化（セリフ混同・タイポ根絶）。語尾相互混入遮断フィルターの配備。位置情報プロバイダの2系統分離により、画面ヘッダーのスリム市名表示を維持したまま「今どこ？」の回答を「〇〇市〇〇町付近」の高精度へ完全復帰。Googleマップ検索に町名エリア＋精密GPS座標（&ll=&center=）を二重連携させピンポイント最寄り検索を強化。"
    },
    {
      version: "v1.0.0 (Rev.8)",
      date: "2026/11/09",
      type: "fix",       // 修正（◎更新）
      changes: "style.css の完全外出し分離（index.html の大幅スリム化）。パートナー切り替え時にお好みの肉声ボイス（VOICEVOX）が初期化されず各キャラ独立で永久保持されるよう改修。居眠りボタン押下時に笑顔や会話フレームのまま寝る不具合を解消し、即座にIdle待機表情へ固定した上で自然に閉眼・あくび導入する就寝フローの完全化。"
    },
    {
      version: "v1.0.0",
      date: "2026/11/09",
      type: "major",     // イニシャルリリース（〇更新）
      changes: "AIペット「クロちゃん🐾＆シロくん（ホウ博士）🦉」初期正式リリース。マルチキャラクター完全分離プラグインアーキテクチャ（char_kuro.js, char_shiro.js, core_engine.js, app.js）の確立。クロちゃん元祖まぶた座標＆上から自然な瞬きの100%完全復元。シロくん首かしげ幾何追従（右目上がり独立計算）＆メガネ内径ジャストフィット自然閉眼スリット。絵日記写真の日付境界完全厳格化（写真なし日の過去引き継ぎ完全遮断）。4大トークスタイル自律判断、なかよし／おてつだい（Googleマップ・最新ニュース検索カード）完全棲み分け。TTSレート制限（429）防護壁＆自声エコー物理遮断フラグ（isSpeechProducing）。非破壊ストレージ大掃除（原本自動バックアップ＆3〜5KB極小化）とビューワー側での高画質写真プロテクト・マージ機構の完全装備。スマホ画面下端ギリギリまでの操作バー最適配置。"
    }
  ],

  // 履歴の取得（最大10件を厳密に保証）
  getHistory() {
    return this.history.slice(0, 10);
  },

  // 画面各所のバージョン表記を一括更新するDOM適用エンジン
  applyToDOM() {
    const ver = this.current;

    // 1. ブラウザタイトル
    if (document.title.includes("ビューワー") || document.title.includes("思い出アルバム")) {
      document.title = `クロちゃんの思い出アルバム ＆ バックアップ ビューワー＆エディター🐾 ${ver}`;
    } else {
      document.title = `AIペット クロちゃん＆シロくん🐾🦉 ${ver}`;
    }

    // 2. 画面最下部の極小タグ（アプリ側）
    const bottomTag = document.querySelector('.app-version-tag');
    if (bottomTag) {
      const isShiro = localStorage.getItem('kuro_active_character') === 'shiro';
      bottomTag.textContent = isShiro ? `🦉 シロくん（ホウ博士） ${ver}` : `🐾 クロちゃん ${ver}`;
    }

    // 3. 設定モーダルの右上表示
    const settingVerTag = document.getElementById('setting-modal-version-tag');
    if (settingVerTag) settingVerTag.textContent = ver;

    // 4. システム診断モニタのタイトル
    const diagTitle = document.getElementById('diag-header-title');
    if (diagTitle) diagTitle.textContent = `🩺 システム診断モニタ (${ver})`;

    // 5. ビューワー側のヘッダーバッジ
    const viewerBadge = document.getElementById('header-pkg-version');
    if (viewerBadge && !viewerBadge.textContent.includes("バックアップ")) {
      viewerBadge.textContent = `${ver} 対応`;
    }

    // 6. 設定画面内の更新履歴一覧の自動描画
    const historyContainer = document.getElementById('version-history-container');
    if (historyContainer) {
      historyContainer.innerHTML = this.getHistory().map(h => `
        <div class="version-history-row">
          <div class="version-history-meta">
            <span class="version-tag-pill ${h.type || 'fix'}">${h.version}</span>
            <span class="version-date-text">📅 ${h.date}</span>
          </div>
          <div class="version-changes-text">${h.changes}</div>
        </div>
      `).join('');
    }
  }
};

// DOM読み込み完了時に自動実行
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    VersionManager.applyToDOM();
  });
}