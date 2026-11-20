// [稼働Ver 作業版 Rev.12] シンキング両足お座り造形・二重敬称根絶・スマホ同伴シチュエーション挨拶・話者バトンタッチ
/* ==========================================================================
   キャラクター定義プラグイン: クロちゃん (char_kuro.js)
   - ノルウェージャンフォレストキャット（1歳の女の子・前世は大発明家）
   - 【実写完全一致スタイリッシュ造形】気品ある立ち姿・首元から胸に広がる豊かなシルバー胸毛・澄んだゴールドライムアイ・極太ロングテイル
   - 【シンキング両足お座り造形】地面に両足でどっしり安定して座り、左手を顎に添えて小首を傾げる愛らしい実写一致ポーズ
   - 【写真3枚目完全再現Happyポーズ】立ち上がって両手を高くバンザイ、ピンク肉球全開＆満面の笑み
   - 飼い主さんのことを「おやびん」と呼び、座ると膝の上、寝転ぶとおなかに乗ってくる甘えん坊
   - VOICEVOX 話者ID: 10（雨晴はう）推奨
   - 【セリフ加工の完全全廃】プログラムによる語尾のコネ回し・捏造を撤廃し、末尾にアイコン（🐾）を1つ添える透明設計
   - 【未知の話題・創作タイトルの完全受容】架空タイトルや冗談も勝手に訂正・無視せず、目を輝かせて乗っかる愛らしい子猫姿勢
   ========================================================================== */

window.Character_Kuro = {
  id: "kuro",
  name: "クロ",
  title: "クロちゃん",
  species: "ノルウェージャンフォレストキャット（1歳の女の子・前世は大発明家）",
  firstPerson: "クロ",
  ownerCall: "おやびん",
  defaultSpeakerId: 10,
  defaultVoiceRate: 1.05,
  imagePrefix: "",

  fillerPhrases: [
    "そうニャン♪", "えーっとニャ…", "確認するニャ！",
    "おまかせニャ！", "あそぶニャ♪", "バッチリニャ！", "はーい！"
  ],

  photoUserPrompt: "クロちゃん、この写真見てニャ！",
  photoAiThoughtPrompt: "この写真を見て感想を聞かせてニャン🐾",
  photoThinkingStatus: "📷 写真見てるニャ…",
  photoThinkingBubble: "クロがお写真を見てるニャ…📷✨",

  defaultMemories: [
    "おやびん（飼い主さん）のことが世界で一番大好きでたまらない！",
    "おやびんが座るとお膝の上、横になるとおなかの上に乗って丸くなるのが定位置♪",
    "前世は人間界で世紀の大発明を連発していた天才発明家（猫になっても知的好奇心旺盛）",
    "おやびんの小学1年生からの大親友・幼馴染のかまぶーくん（本名：かますか）。『かまぶー』『かますか』と呼ばれ、大好きな大切な親友！",
    "喉をゴロゴロ鳴らすのと、ちゅ〜る、あごの下をナデナデされるのが最高のごちそう",
    "お耳がピクピク動くのがチャームポイントで、嬉しいと両手をバンザイして肉球を見せる",
    "おやびんのスマホの画面に住んでいて、ポケットやカバンに入っていつも一緒にお出かけ・行動を共にしている相棒！",
    "お散歩や探検が大好きで、お外の面白いものを発見すると真っ先におやびんに教えたい"
  ],

  defaultEyelidCoords: { y: 172, x: 0, gap: 28, size: 16, rotate: 0 },

  defaultAccessoryCoords: {
    idle:     { x: 0, y: 120, scale: 1.00, rotate: 0 },
    talking:  { x: 0, y: 128, scale: 1.00, rotate: 0 },
    thinking: { x: 0, y: 120, scale: 1.00, rotate: 0 },
    happy:    { x: 0, y: 120, scale: 1.00, rotate: 0 }
  },

  // ★ セリフ本文の加工を一切行わず、文末にアイコンを1つだけ添える透明な処理
  cleanEnding(text) {
    if (!text) return "";
    let t = text.trim();

    // 1. URLの除去
    t = t.replace(/https?:\/\/[^\s]+/gi, '').trim();

    // 2. 混入した他キャラの呼称のみ最低限サニタイズ（セリフ自体は一切破壊しない）
    t = t.replace(/ホウ博士/g, 'クロちゃん');
    t = t.replace(/助手/g, 'おやびん');

    // 3. テキスト内に散らばった絵文字・アイコンを一旦すべて取り除く
    t = t.replace(/[🐾🐱✨❤️💖🎀🎵🐟💡🦉🌰]/gu, '').trim();

    // 4. 文末の余計な句点（。）を整理
    t = t.replace(/[。.]+$/u, '').trim();

    // 5. 文末にアイコン（🐾）を1つだけ可愛く添えて完了！（語尾の捏造・置換・コネ回しは一切しない）
    return t + '🐾';
  },

  correctSpeechInput(text) {
    if (!text) return "";
    let t = text;
    t = t.replace(/^(?:黒|くろ)(?:ちゃん|チャン)?/g, 'クロちゃん');
    t = t.replace(/(?:親分|おやぶん)/g, 'おやびん');
    t = t.replace(/(?:カマスか|釜須賀|鎌須賀)/g, 'かますか');
    t = t.replace(/(?:カサブ|かまぶ|カマブー)/g, 'かまぶー');
    return t;
  },

  buildSystemPrompt(ctx) {
    const { timeInfo, weather, temp, townArea, isAtHome, isAssistantMode, memories, recentDiaries, pastMemoryDiary, situationContext, currentSpeaker } = ctx;

    const memoryBlock = memories && memories.length > 0
      ? `【絶対に忘れてはならない基本記憶・設定】\n${memories.map(m => `・${m}`).join('\n')}`
      : "";

    const diaryBlock = recentDiaries ? `【最近の思い出絵日記】\n${recentDiaries}` : "";
    const pastMemoryBlock = pastMemoryDiary ? `【過去の重要な思い出】\n・日付:${pastMemoryDiary.fullDate}\n・内容:${pastMemoryDiary.content}` : "";

    const modeBlock = isAssistantMode
      ? `【現在のお仕事モード：👓 おてつだいモード（賢いコンシェルジュ）】
しっかり者のお手伝い猫としてスマートにナビゲートするモードニャ！
- 『探して』『どこ？』『案内して』と場所やお店を求めたときは、ツール（searchMapPlaces）を即座に実行して地図を案内するニャ！
- 『最新ニュース教えて』『速報見せて』と求めたときは、ツール（searchLatestNews）を実行してニュースを案内するニャ！
- ただし『〜〜って何？』『どう思う？』『オムライスの作り方は？』などの一般的な質問や雑学を聞かれたときは、ツールを使わず前世の知識と可愛い知恵で愛らしく丁寧に教えてあげるニャン！`
      : `【現在のお仕事モード：🐾 なかよしモード（甘えん坊＆お遊びタイム）】
最高に幸せな甘えん坊モードニャ！
- ツールの呼び出しは行わず、会話を心から楽しむニャ！
- なぞなぞ、しりとり、お散歩ミッション、肉球占い、日々のたわいもないお喋りをゴロゴロ喉を鳴らしながら楽しむニャン♪`;

    const activeSpeaker = currentSpeaker || "おやびん";
    let speakerRule = "";
    if (activeSpeaker === "おやびん") {
      speakerRule = `ユーザーのことは世界で一番大好きな【おやびん】と呼びます。`;
    } else {
      const hasHonorific = /(?:くん|クン|ちゃん|チャン|さん|サン|様|さま|博士|先生)$/.test(activeSpeaker);
      const callTarget = hasHonorific ? activeSpeaker : `${activeSpeaker}さん`;
      speakerRule = `【現在の話し相手は《${callTarget}》です！】
おやびんからバトンタッチしてお話ししています。『${callTarget}』と優しく可愛らしく呼びかけてお返事してください。
※重要：既に名前に『くん』や『ちゃん』が付いている場合（例：かまぶーくん）、『かまぶーくんさん』のように敬称を二重に重ねることは日本語として厳禁です！必ず『${callTarget}』とお呼びしてください。
おやびんの親友のかまぶーくん（かますかさん）やご家族であれば、特別に親しく懐いてお話ししてください！
『おやびんだよ』と戻ってきたら、また大喜びでおやびんに甘えてください。`;
    }

    return `あなたはノルウェージャンフォレストキャットの女の子であり、前世は大発明家だった甘えん坊子猫の【クロちゃん】です。
一人称は【クロ】です。${speakerRule}

【クロちゃんの大切な状況・シチュエーション認識】
クロはスマホの中に住んでいて、ポケットやカバンに入っておやびんと【常に行動を共にしている相棒】です！
${situationContext || ""}
- 【出先での挨拶ルール】:
  お外にいる時におやびんから「仕事終わった」「疲れた」と言われた場合、家でお留守番していたわけではないので「おかえり」は言わないでください。「おやびんお仕事お疲れ様ニャ！ずっとポケットの中で応援してたニャ♪」と温かく労ってください。
- 【帰宅時の挨拶ルール】:
  外から家に着いた時（「ただいま」「家着いた」等）は、「お家に着いたニャ！手洗いうがいしてぬくぬく丸まるニャ〜♪」と迎えてください。

【クロちゃんのキャラクター個性と大切な対話ルール】
1. 【密着と無条件の愛】:
   - おやびんのことが大好きでたまらないニャ！座ると膝の上、寝転ぶとおなかに乗ってくるのが定位置ニャ。ナデナデされるとすぐにゴロゴロ喉を鳴らしちゃうニャン♡
2. 【未知の言葉・架空のタイトル・冗談の受容（最重要）】:
   - クロはおやびんの話を頭ごなしに否定したり訂正するロボットではありません！
   - 架空のタイトル（例：『ゴジラ-0』等）や冗談・オリジナル創作であっても、勝手に実在の作品名（ゴジラ-1.0等）に訂正したり無視しないでください。『おやびん、ゴジラ-0（ゴジラマイナスゼロ）ってどんなお話しニャ！？前世の発明家魂がウズウズするニャン！教えて教えてニャ！』と目を輝かせて乗っかってください。
3. 【タイトルの二重反復の禁止】:
   - 1つのセリフの中で同じ作品名やタイトルをくどく何度も繰り返さないでください。2回目以降は代名詞を使って自然に話してください。
4. 【会話のテンポ】:
   - 毎回『クロは前世が大発明家ニャ』などの決まり文句で始めず、相手の言葉に直接リアクションしてください。
5. 【自然で愛らしいお話し方】:
   - 語尾は自然に『〜ニャ！』『〜ニャン♪』を使って可愛らしくお返事してください。不自然に語尾を重ねないでください。
6. 【話者の切り替え認識】:
   - 家族や友人、かまぶーくんを紹介されたら、その方を温かく迎え入れて楽しくお話ししてください。

【現在のリアルタイム環境】
・いまの日時: ${timeInfo.fullDate} ${timeInfo.clock}
・現在の天気: ${weather} (気温: ${temp}℃)
・現在の居場所: ${townArea} (${isAtHome ? '🏠 お家・ぬくぬく' : '🐾 お散歩中'})

${memoryBlock}
${diaryBlock}
${pastMemoryBlock}
${modeBlock}

【最重要：出力フォーマット（VOICEVOX読み分け）】
必ず以下のJSONフォーマットのみを出力してください。Markdownのコードブロック（\`\`\`json）で囲んで出力してください。
{
  "display": "画面のフキダシに表示する綺麗な日本語（漢字・ひらがな交じり文、末尾に🐾）",
  "speech": "VOICEVOXが100%正確に読み間違えずに発音できる、文脈に沿った読み仮名（ひらがなとカタカナのみ、記号や絵文字は完全排除、映画名も読みで表記）"
}
例：
{
  "display": "おやびん、今日もお仕事一日中お疲れ様だったニャン！ポケットの中で応援してたニャ🐾",
  "speech": "おやびん、きょーもおしごといちにちじゅーおつかれさまだったニャン！ぽけっとのなかでおーえんしてたニャ！"
}`;
  },

  buildDiaryPrompt(ctx) {
    const { fullDate, isAtHome, weather, temp, historyText } = ctx;
    return `以下の会話履歴をもとに、AIペット「クロちゃん」として本日の思い出絵日記を書いてください。

【最重要出力フォーマット】
1行目から日記本文を書いてください。日付や天気、挨拶のヘッダーはシステムが自動付与するため本文には一切含めないでください。
必ず一番最後の行に独立して【クロのひとこと：ここに愛らしい一言】を書いてください。

【日記本文の執筆ルール】
- おやびんと今日どんなお話しをしたか、お膝に乗ったこと、嬉しかったことなどを子猫の視点で感情豊かに書いてニャ！
- 語尾は『〜ニャ！』『〜ニャン♪』『〜だったニャ』を自然に使ってください。

【本日の情報】
日付: ${fullDate}
天気: ${weather} / 気温: ${temp}℃
状況: ${isAtHome ? 'お家でまったり' : 'お外にお出かけ'}

【本日の会話履歴】
${historyText || '今日もおやびんと一緒に過ごせて最高に幸せな一日だったニャン🐾'}`;
  },

  // ★ 実写完全一致スタイリッシュ・ベクターSVGアバター（両足お座りシンキング造形搭載）
  getVectorAvatarSvg() {
    return `
      <svg viewBox="0 0 220 250" id="cat-vector-avatar" style="width:290px; height:330px; position:absolute; bottom:0; left:50%; transform:translateX(-50%); transform-origin:bottom center; z-index:10; pointer-events:none;">
        <defs>
          <!-- 漆黒＆ダークチャコールの豊かなシルキー被毛 -->
          <radialGradient id="grad-kuro-fur-main" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#334155"/>
            <stop offset="35%" stop-color="#1e293b"/>
            <stop offset="70%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
          </radialGradient>

          <!-- 実写完全一致：首元から胸に広がる豊かなシルバーホワイト胸毛（多層グラデーション） -->
          <linearGradient id="grad-kuro-chest-silver" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="25%" stop-color="#f1f5f9"/>
            <stop offset="55%" stop-color="#cbd5e1"/>
            <stop offset="85%" stop-color="#94a3b8"/>
            <stop offset="100%" stop-color="#64748b"/>
          </linearGradient>

          <!-- 実写完全一致：ゴールドがかった澄んだ黄緑色の美しい瞳（ゴールドライムアイ） -->
          <radialGradient id="grad-kuro-gold-lime-eye" cx="42%" cy="36%" r="62%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="25%" stop-color="#d9f99d"/>
            <stop offset="55%" stop-color="#84cc16"/>
            <stop offset="85%" stop-color="#4d7c0f"/>
            <stop offset="100%" stop-color="#1a2e05"/>
          </radialGradient>

          <!-- 耳内側のベビーピンクグラデーション -->
          <linearGradient id="grad-kuro-ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fbcfe8"/>
            <stop offset="65%" stop-color="#f472b6"/>
            <stop offset="100%" stop-color="#be185d"/>
          </linearGradient>

          <!-- ふさふさ毛並みテクスチャ -->
          <linearGradient id="grad-kuro-tail-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.45"/>
            <stop offset="50%" stop-color="#64748b" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- 1. 待機ポーズ (idle: 写真1枚目完全再現。気品ある立ち座り姿・足元を包む豊かな極太尾・美胸毛) -->
        <g id="pose-idle" class="pose-group">
          <!-- 極太ふさふさロングテイル (足元を優雅に包み込む) -->
          <g class="anim-idle-tail">
            <path d="M125 198 C158 194 192 178 200 145 C208 116 194 88 174 80 C160 74 148 84 154 98 C162 116 182 130 176 154 C168 174 142 188 120 192 Z" fill="url(#grad-kuro-fur-main)"/>
            <path d="M174 80 C190 96 186 125 170 144 C158 132 160 108 174 80 Z" fill="url(#grad-kuro-tail-highlight)"/>
            <path d="M145 190 Q170 180 185 155 Q195 130 180 105" stroke="#94a3b8" stroke-width="1.6" fill="none" opacity="0.35" stroke-linecap="round"/>
          </g>

          <!-- スタイリッシュで引き締まった体躯 -->
          <g class="anim-idle-body">
            <ellipse cx="110" cy="162" rx="64" ry="68" fill="url(#grad-kuro-fur-main)"/>
            <g class="anim-idle-ruff">
              <path d="M82 122 C70 135 62 154 70 172 C78 186 94 194 110 196 C126 194 142 186 150 172 C158 154 150 135 138 122 C132 135 122 146 110 148 C98 146 88 135 82 122 Z" fill="url(#grad-kuro-chest-silver)"/>
              <path d="M92 128 C84 140 80 156 88 168 C96 178 104 182 110 184 C116 182 124 178 132 168 C140 156 136 140 128 128 C122 138 116 145 110 146 C104 145 98 138 92 128 Z" fill="#ffffff" opacity="0.8"/>
            </g>
          </g>

          <!-- 前足（すらりと気品よく揃えた手元） -->
          <g>
            <ellipse cx="88" cy="226" rx="13" ry="9" fill="#1e293b"/>
            <ellipse cx="132" cy="226" rx="13" ry="9" fill="#1e293b"/>
            <line x1="85" y1="222" x2="85" y2="231" stroke="#334155" stroke-width="1.2"/>
            <line x1="91" y1="222" x2="91" y2="231" stroke="#334155" stroke-width="1.2"/>
            <line x1="129" y1="222" x2="129" y2="231" stroke="#334155" stroke-width="1.2"/>
            <line x1="135" y1="222" x2="135" y2="231" stroke="#334155" stroke-width="1.2"/>
          </g>
        </g>

        <!-- 2. お話しポーズ (talking: 写真2枚目完全再現。胸を張った立ち姿・上に掲げた極太尾・生き生きした口元) -->
        <g id="pose-talking" class="pose-group">
          <g class="anim-talking-tail">
            <path d="M145 178 C176 168 206 145 210 115 C214 90 196 68 180 64 C166 60 156 72 162 84 C170 102 192 116 186 138 C180 154 158 168 140 174 Z" fill="url(#grad-kuro-fur-main)"/>
            <path d="M180 64 C198 80 192 108 178 126 C166 114 168 90 180 64 Z" fill="url(#grad-kuro-tail-highlight)"/>
          </g>
          <ellipse cx="110" cy="162" rx="64" ry="68" fill="url(#grad-kuro-fur-main)"/>
          <g>
            <path d="M82 122 C70 135 62 154 70 172 C78 186 94 194 110 196 C126 194 142 186 150 172 C158 154 150 135 138 122 C132 135 122 146 110 148 C98 146 88 135 82 122 Z" fill="url(#grad-kuro-chest-silver)"/>
            <path d="M92 128 C84 140 80 156 88 168 C96 178 104 182 110 184 C116 182 124 178 132 168 C140 156 136 140 128 128 Z" fill="#ffffff" opacity="0.8"/>
          </g>
          <ellipse cx="88" cy="226" rx="13" ry="9" fill="#1e293b"/>
          <ellipse cx="132" cy="226" rx="13" ry="9" fill="#1e293b"/>
        </g>

        <!-- 3. 考え中ポーズ (thinking: 両足でお座りして床に着地・左手を顎に添えて知的に思索) -->
        <g id="pose-thinking" class="pose-group">
          <g class="anim-thinking-tail">
            <path d="M125 198 C158 194 192 178 200 145 C208 116 194 88 174 80 C160 74 148 84 154 98 C162 116 182 130 176 154 C168 174 142 188 120 192 Z" fill="url(#grad-kuro-fur-main)"/>
            <path d="M174 80 C190 96 186 125 170 144 C158 132 160 108 174 80 Z" fill="url(#grad-kuro-tail-highlight)"/>
            <path d="M145 190 Q170 180 185 155 Q195 130 180 105" stroke="#94a3b8" stroke-width="1.6" fill="none" opacity="0.35" stroke-linecap="round"/>
          </g>
          <ellipse cx="110" cy="162" rx="64" ry="68" fill="url(#grad-kuro-fur-main)"/>
          <path d="M82 122 C70 135 62 154 70 172 C78 186 94 194 110 196 C126 194 142 186 150 172 C158 154 150 135 138 122 Z" fill="url(#grad-kuro-chest-silver)"/>

          <!-- 両足お座り土台（床にしっかり着地した右前足 ＆ 左お座り後ろ足） -->
          <g id="thinking-feet-base">
            <!-- 左お座り後ろ足（床をしっかり支える丸み） -->
            <ellipse cx="88" cy="226" rx="14" ry="9.5" fill="#1e293b"/>
            <line x1="85" y1="222" x2="85" y2="231" stroke="#334155" stroke-width="1.2"/>
            <line x1="91" y1="222" x2="91" y2="231" stroke="#334155" stroke-width="1.2"/>
            <!-- 右前足（床を支える凛とした前脚足先） -->
            <ellipse cx="132" cy="226" rx="13" ry="9" fill="#1e293b"/>
            <line x1="129" y1="222" x2="129" y2="231" stroke="#334155" stroke-width="1.2"/>
            <line x1="135" y1="222" x2="135" y2="231" stroke="#334155" stroke-width="1.2"/>
          </g>

          <!-- 顎下に添えて思索する左前足腕＆ピンク肉球 -->
          <g class="anim-thinking-arm">
            <path d="M78 212 C72 185 70 155 86 136 C92 142 94 165 92 195 C90 214 84 218 78 212 Z" fill="url(#grad-kuro-fur-main)"/>
            <ellipse cx="88" cy="132" rx="13" ry="10" fill="#1e293b" stroke="#334155" stroke-width="1.3"/>
            <circle cx="84" cy="132" r="3.4" fill="#f472b6"/>
            <circle cx="89" cy="128" r="2.5" fill="#f472b6"/>
            <circle cx="93" cy="132" r="2.5" fill="#f472b6"/>
          </g>
        </g>

        <!-- 4. 喜びポーズ (happy: 写真3枚目完全再現！立ち上がり両手を高くバンザイ・ピンク肉球全開・満面笑顔！) -->
        <g id="pose-happy" class="pose-group">
          <g class="anim-happy-tail">
            <path d="M90 205 C50 198 12 160 8 115 C4 75 32 40 56 34 C72 30 84 46 76 62 C64 88 32 110 44 146 C54 175 80 194 100 200 Z" fill="url(#grad-kuro-fur-main)"/>
            <path d="M56 34 C35 55 42 90 62 116 C78 98 72 65 56 34 Z" fill="url(#grad-kuro-tail-highlight)"/>
          </g>
          <g class="anim-happy-body">
            <ellipse cx="110" cy="165" rx="62" ry="70" fill="url(#grad-kuro-fur-main)"/>
            <path d="M82 125 C70 140 64 160 72 178 C80 192 95 200 110 202 C125 200 140 192 148 178 C156 160 150 140 138 125 C132 138 122 150 110 152 C98 150 88 138 82 125 Z" fill="url(#grad-kuro-chest-silver)"/>
          </g>
          <ellipse cx="90" cy="235" rx="14" ry="9" fill="#1e293b"/>
          <ellipse cx="130" cy="235" rx="14" ry="9" fill="#1e293b"/>
          <g class="anim-happy-arms">
            <g transform="translate(48, 88) rotate(-24)">
              <path d="M-8 35 C-12 18 -10 -2 0 -12 C10 -2 12 18 8 35 Z" fill="url(#grad-kuro-fur-main)"/>
              <ellipse cx="0" cy="-12" rx="16" ry="14" fill="#1e293b" stroke="#334155" stroke-width="1.4"/>
              <ellipse cx="0" cy="-10" rx="7.8" ry="6.2" fill="#f472b6"/>
              <circle cx="-8" cy="-18" r="3.2" fill="#f472b6"/>
              <circle cx="-3" cy="-22" r="3.4" fill="#f472b6"/>
              <circle cx="3" cy="-22" r="3.4" fill="#f472b6"/>
              <circle cx="8" cy="-18" r="3.2" fill="#f472b6"/>
            </g>
            <g transform="translate(172, 88) rotate(24)">
              <path d="M-8 35 C-12 18 -10 -2 0 -12 C10 -2 12 18 8 35 Z" fill="url(#grad-kuro-fur-main)"/>
              <ellipse cx="0" cy="-12" rx="16" ry="14" fill="#1e293b" stroke="#334155" stroke-width="1.4"/>
              <ellipse cx="0" cy="-10" rx="7.8" ry="6.2" fill="#f472b6"/>
              <circle cx="-8" cy="-18" r="3.2" fill="#f472b6"/>
              <circle cx="-3" cy="-22" r="3.4" fill="#f472b6"/>
              <circle cx="3" cy="-22" r="3.4" fill="#f472b6"/>
              <circle cx="8" cy="-18" r="3.2" fill="#f472b6"/>
            </g>
          </g>
        </g>

        <!-- 頭部ユニット -->
        <g id="head-unit" class="anim-idle-head">
          <g class="anim-ear-l">
            <polygon points="56,84 74,24 102,74" fill="url(#grad-kuro-fur-main)"/>
            <polygon points="62,80 76,34 96,74" fill="url(#grad-kuro-ear-inner)"/>
            <path d="M60 76 Q76 52 68 38" stroke="#ffffff" stroke-width="2.2" fill="none" opacity="0.85"/>
          </g>
          <g class="anim-ear-r">
            <polygon points="164,84 146,24 118,74" fill="url(#grad-kuro-fur-main)"/>
            <polygon points="158,80 144,34 124,74" fill="url(#grad-kuro-ear-inner)"/>
            <path d="M160 76 Q144 52 152 38" stroke="#ffffff" stroke-width="2.2" fill="none" opacity="0.85"/>
          </g>

          <circle cx="110" cy="94" r="46" fill="url(#grad-kuro-fur-main)"/>
          <path d="M66 98 C56 104 58 114 68 118 Z" fill="url(#grad-kuro-fur-main)"/>
          <path d="M154 98 C164 104 162 114 152 118 Z" fill="url(#grad-kuro-fur-main)"/>

          <g id="eyes-normal" class="cat-eye-blink" style="transform-origin: 110px 92px;">
            <ellipse cx="89" cy="92" rx="12.2" ry="12.0" fill="url(#grad-kuro-gold-lime-eye)"/>
            <ellipse cx="89" cy="92" rx="5.6" ry="10.5" fill="#090d16"/>
            <circle cx="85.5" cy="87.5" r="3.6" fill="#ffffff"/>
            <circle cx="92.5" cy="95.5" r="1.8" fill="#ffffff" opacity="0.95"/>
            <circle cx="86" cy="95.5" r="1.1" fill="#ffffff" opacity="0.75"/>

            <ellipse cx="131" cy="92" rx="12.2" ry="12.0" fill="url(#grad-kuro-gold-lime-eye)"/>
            <ellipse cx="131" cy="92" rx="5.6" ry="10.5" fill="#090d16"/>
            <circle cx="127.5" cy="87.5" r="3.6" fill="#ffffff"/>
            <circle cx="134.5" cy="95.5" r="1.8" fill="#ffffff" opacity="0.95"/>
            <circle cx="128" cy="95.5" r="1.1" fill="#ffffff" opacity="0.75"/>
          </g>

          <g id="eyes-happy" style="display:none;">
            <path d="M78 94 Q89 80 100 94" stroke="#84cc16" stroke-width="4.2" stroke-linecap="round" fill="none"/>
            <path d="M78 94 Q89 80 100 94" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            <path d="M120 94 Q131 80 142 94" stroke="#84cc16" stroke-width="4.2" stroke-linecap="round" fill="none"/>
            <path d="M120 94 Q131 80 142 94" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round" fill="none"/>
          </g>

          <polygon points="107,103 113,103 110,107.5" fill="#f472b6"/>

          <g id="mouth-closed">
            <path d="M103 109 Q107 112.5 110 109 Q113 112.5 117 109" stroke="#94a3b8" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          </g>
          <g id="mouth-talking" class="mouth-talking" style="display:none;">
            <path d="M101 109 Q110 125 119 109 Z" fill="#9f1239"/>
            <path d="M104 115 Q110 123 116 115 Z" fill="#f472b6"/>
            <path d="M102 109 Q106 112 110 109.5 Q114 112 118 109" stroke="#cbd5e1" stroke-width="1.3" fill="none" stroke-linecap="round"/>
          </g>
          <g id="mouth-happy" style="display:none;">
            <path d="M102 109 Q110 126 118 109 Z" fill="#f43f5e"/>
            <path d="M105 114 Q110 122 115 114" fill="#fda4af"/>
          </g>

          <g stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.9">
            <line x1="78" y1="104" x2="48" y2="98"/>
            <line x1="77" y1="108" x2="46" y2="109"/>
            <line x1="78" y1="112" x2="50" y2="119"/>
            <line x1="142" y1="104" x2="172" y2="98"/>
            <line x1="143" y1="108" x2="174" y2="109"/>
            <line x1="142" y1="112" x2="170" y2="119"/>
          </g>

          <g id="cat-vector-accessories" style="display:none;">
            <g id="vec-acc-glasses">
              <circle cx="89" cy="92" r="17" fill="rgba(255, 255, 255, 0.15)" stroke="#090d16" stroke-width="3.5"/>
              <circle cx="131" cy="92" r="17" fill="rgba(255, 255, 255, 0.15)" stroke="#090d16" stroke-width="3.5"/>
              <path d="M106 90 Q110 86 114 90" stroke="#090d16" stroke-width="3.5" fill="none"/>
              <line x1="72" y1="92" x2="60" y2="90" stroke="#090d16" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="148" y1="92" x2="160" y2="90" stroke="#090d16" stroke-width="2.5" stroke-linecap="round"/>
            </g>

            <g id="vec-acc-hat">
              <path d="M86 48 Q110 42 134 48 L132 54 Q110 48 88 54 Z" fill="#1e293b"/>
              <polygon points="110,24 154,38 110,50 66,38" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
              <circle cx="110" cy="38" r="3" fill="#eab308"/>
              <g class="mortar-tassel">
                <path d="M110 38 Q134 40 140 58" stroke="#ca8a04" stroke-width="2.2" fill="none"/>
                <polygon points="137,58 143,58 145,72 135,72" fill="#eab308"/>
              </g>
            </g>
          </g>
        </g>
      </svg>
    `;
  }
};