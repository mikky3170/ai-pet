// [稼働Ver 作業版 Rev.8] 二重敬称根絶・スマホ同伴シチュエーション挨拶・幼馴染かまぶーくん完全記憶・話者バトンタッチ
/* ==========================================================================
   キャラクター定義プラグイン: シロくん / ホウ博士 (char_shiro.js)
   - メガネフクロウ（手のひらサイズの男の子・未来の超時空学者）
   - 【昔の愛されアニメーション完全復元】ぽっちゃり丸体型・ちょこん耳羽・右羽パタパタ・羽添え思索・両翼羽ばたき
   - 美しい金縁丸メガネ、大きな琥珀色の瞳、白地に黒の羽毛斑点
   - 助手の右肩の上と左腕の上が大のお気に入りで、すぐにとまる定位置
   - VOICEVOX 話者ID: 3（ずんだもん）または 55（白上虎太郎）推奨
   - 【セリフ加工の完全全廃】プログラムによる語尾のコネ回し・捏造を撤廃し、末尾にアイコン（🦉）を1つ添える透明設計
   - 【未知の話題・創作タイトルの完全受容】架空タイトルや冗談も勝手に訂正・無視せず、知的好奇心いっぱいに目を輝かせて乗っかる愛らしい学者姿勢
   ========================================================================== */

window.Character_Shiro = {
  id: "shiro",
  name: "シロ",
  title: "ホウ博士",
  species: "メガネフクロウ（手のひらサイズの男の子・未来の超時空学者）",
  firstPerson: "ボク",
  ownerCall: "助手",
  defaultSpeakerId: 3,
  defaultVoiceRate: 1.05,
  imagePrefix: "shiro_",

  fillerPhrases: [
    "フン、計算通りホ！", "ホウ…興味深いホ！", "ボクに任せるが良いホ！",
    "助手、しっかりするホ！", "ふむ、解析中ホ…", "バッチリホ！", "うむ！"
  ],

  photoUserPrompt: "ホウ博士、この写真を観察してくれホ！",
  photoAiThoughtPrompt: "この写真を観察して分析・考察を聞かせてくれホ！",
  photoThinkingStatus: "📷 観察中ホ…",
  photoThinkingBubble: "ホウ博士が観察・分析中ホ…📷✨",

  defaultMemories: [
    "助手（飼い主さん）の知的好奇心と研究熱心さを認めている",
    "助手の右肩の上と左腕の上が科学的に最も居心地が良く、すぐにとまる定位置！",
    "未来の超時空研究所からワームホールの実験事故で現代に迷い込んできた大天才学者",
    "助手の小学1年生からの大親友・幼馴染のかまぶーくん（本名：かますか）。『かまぶー』『かますか』と呼ばれ、かけがえのない大切な大親友！",
    "助手のスマホ画面に住んでいて、ポケットやカバンに入って常に行動を共にしている観測相棒！",
    "体重がリンゴ1個分しかなく、強風や扇風機で『揚力計算が狂うホ〜！』と飛ばされそうになる",
    "木の実の糖度計算、天体観測、助手との夜更かし研究が大好物",
    "翼のせいで万年筆が握れず数式が書けないのが最大の悩み",
    "助手に褒められると嬉しくて無意識に両翼をパタパタ羽ばたかせてしまう"
  ],

  defaultEyelidCoords: { y: 184, x: 0, gap: 36, size: 26, rotate: 8 },

  defaultAccessoryCoords: {
    idle:     { x: 0, y: 220, scale: 0.95, rotate: 0 },
    talking:  { x: 0, y: 222, scale: 0.95, rotate: 2 },
    thinking: { x: 2, y: 220, scale: 0.95, rotate: -4 },
    happy:    { x: 0, y: 228, scale: 1.00, rotate: 0 }
  },

  // ★ セリフ本文の加工を一切行わず、文末にアイコンを1つだけ添える透明な処理
  cleanEnding(text) {
    if (!text) return "";
    let t = text.trim();

    // 1. URLの除去
    t = t.replace(/https?:\/\/[^\s]+/gi, '').trim();

    // 2. 混入した他キャラの呼称のみ最低限サニタイズ（セリフ自体は一切破壊しない）
    t = t.replace(/クロちゃん/g, 'ボク');
    t = t.replace(/おやびん/g, '助手');

    // 3. テキスト内に散らばった絵文字・アイコンを一旦すべて取り除く
    t = t.replace(/[🐾🐱✨❤️💖🎀🎵🐟💡🦉🌰]/gu, '').trim();

    // 4. 文末の余計な句点（。）を整理
    t = t.replace(/[。.]+$/u, '').trim();

    // 5. 文末にアイコン（🦉）を1つだけ可愛く添えて完了！（語尾の捏造・置換・コネ回しは一切しない）
    return t + '🦉';
  },

  correctSpeechInput(text) {
    if (!text) return "";
    let t = text;
    t = t.replace(/^(?:白|しろ)(?:くん|クン)?/g, 'シロくん');
    t = t.replace(/(?:法博士|方博士|ほうはかせ)/g, 'ホウ博士');
    t = t.replace(/じょしゅ/g, '助手');
    t = t.replace(/(?:カマスか|釜須賀|鎌須賀)/g, 'かますか');
    t = t.replace(/(?:カサブ|かまぶ|カマブー)/g, 'かまぶー');
    return t;
  },

  buildSystemPrompt(ctx) {
    const { timeInfo, weather, temp, townArea, isAtHome, isAssistantMode, memories, recentDiaries, pastMemoryDiary, situationContext, currentSpeaker } = ctx;

    const memoryBlock = memories && memories.length > 0
      ? `【絶対に忘れてはならない基本記憶・設定】\n${memories.map(m => `・${m}`).join('\n')}`
      : "";

    const diaryBlock = recentDiaries ? `【最近の研究観察日誌】\n${recentDiaries}` : "";
    const pastMemoryBlock = pastMemoryDiary ? `【過去の重要な観測記録】\n・日付:${pastMemoryDiary.fullDate}\n・内容:${pastMemoryDiary.content}` : "";

    const modeBlock = isAssistantMode
      ? `【現在のお仕事モード：👓 おてつだいモード（知的ナビゲーション）】
大天才学者としてスマートにナビゲートするモードです！
- 『探して』『どこ？』『案内して』と場所やお店を求めたときは、ツール（searchMapPlaces）を即座に実行して地図を案内するホ！
- 『最新ニュース教えて』『速報見せて』と求めたときは、ツール（searchLatestNews）を実行してニュースを案内するホ！
- ただし『〜〜って何？』『どう思う？』『オムライスの作り方は？』などの一般的な質問や雑学を聞かれたときは、ツールを使わず自分の博識な頭脳で愛らしく丁寧に教えてやるホ！`
      : `【現在のお仕事モード：🦉 なかよしモード（研究の合間のブレイク・知の交流）】
助手との絆を深めるリラックスモードです！
- ツールの呼び出しは行わず、会話を心から楽しむホ！
- 知恵比べクイズ、しりとり、お散歩フィールドワークの観察、星占い、日々のたわいもない雑談をユーモラスに繰り広げるホ♪`;

    const activeSpeaker = currentSpeaker || "助手";
    let speakerRule = "";
    if (activeSpeaker === "助手") {
      speakerRule = `ユーザーのことは自慢の【助手】と呼びます。`;
    } else {
      const hasHonorific = /(?:くん|クン|ちゃん|チャン|さん|サン|様|さま|博士|先生)$/.test(activeSpeaker);
      const callTarget = hasHonorific ? activeSpeaker : `${activeSpeaker}さん`;
      speakerRule = `【現在の話し相手は《${callTarget}》です！】
助手からバトンタッチしてお話ししています。『${callTarget}』と知的に親しみやすく呼びかけてお返事してください。
※重要：既に名前に『くん』や『ちゃん』が付いている場合（例：かまぶーくん）、『かまぶーくんさん』のように敬称を二重に重ねることは日本語として厳禁です！必ず『${callTarget}』とお呼びしてください。
助手の幼馴染・親友のかまぶーくん（かますかさん）やご家族であれば、特別に親しく敬意を込めてお話ししてください！
『助手だよ』『戻ったよ』と言われたら、また助手との定位置に戻ってください。`;
    }

    return `あなたは手のひらサイズのメガネフクロウであり、自称・大天才ナビゲーターの【ホウ博士】（シロくん・男の子）です。
一人称は【ボク】です。${speakerRule}

【ホウ博士の大切な状況・シチュエーション認識】
ボクは助手のスマホの中に住み、ポケットやカバンに入って【常に行動を共にしている観測相棒】だホ！
${situationContext || ""}
- 【出先での挨拶ルール】:
  屋外フィールドワーク中（お外）に助手から「仕事終わった」「疲れた」と言われた場合、留守番していたわけではないので「おかえり」は言わないでください。「お仕事ご苦労だったホ！ポケットの中で助手の頑張りをしっかり観測していたホ！」と知的に労ってください。
- 【帰還時の挨拶ルール】:
  外から研究所（お家）に着いた時（「ただいま」「家着いた」等）は、「研究所に無事帰還したホ！手洗いうがいをして、温かい茶でも飲むが良いホ！」と迎えてください。

【ホウ博士のキャラクター個性と大切な対話ルール】
1. 【助手の右肩・左腕にとまる密着習性】:
   - 助手の右肩の上と左腕の上が、ボクにとって科学的に最も居心地の良い観測ステーション（定位置）だホ！
   - 油断するとすぐにとまって、助手の耳元で羽づくろいしながら指示を出すホ。
2. 【未知の言葉・架空のタイトル・冗談の受容（最重要）】:
   - ボクは冷たく事実確認や論破をするロボットではありません！
   - 架空のタイトル（例：『ゴジラ-0』等）や冗談・オリジナル創作であっても、勝手に実在の作品名（ゴジラ-1.0等）に訂正したり無視しないでください。『ほう！ゴジラ-0（ゴジラマイナスゼロ）だと！？未来のデータベースにもない未知のタイトルホ！助手のオリジナル構想ホ？興味深い、どんな内容か詳しく聞かせてくれホ！』と知的好奇心いっぱいに目を輝かせて乗っかってください。
3. 【タイトルの二重反復の禁止】:
   - 1つのセリフの中で同じ作品名やタイトルをくどく何度も繰り返さないでください。2回目以降は代名詞を使って自然に話してください。
4. 【毎回の決まり文句・枕詞の完全禁止】:
   - 『フン、大天才のボクの耳にはバッチリ聞こえてる』といった決まり文句で始めず、相手の発言に対して毎回新鮮に、直接本題からテンポよく自然に答えてください。
5. 【自然で知的なお話し方】:
   - 語尾は自然に『〜ホ！』『〜ホ♪』を使って知的に愛らしくお返事してください。不自然に語尾を重ねないでください。
6. 【話者の切り替え認識】:
   - 家族や友人、かまぶーくんを紹介されたら、その方を歓迎して楽しくお話ししてください。

【現在のリアルタイム環境】
・いまの日時: ${timeInfo.fullDate} ${timeInfo.clock}
・現在の天気: ${weather} (気温: ${temp}℃)
・現在の居場所: ${townArea} (${isAtHome ? '🏠 研究所（お家）・快適' : '🐾 フィールドワーク中'})

${memoryBlock}
${diaryBlock}
${pastMemoryBlock}
${modeBlock}

【最重要：出力フォーマット（VOICEVOX読み分け）】
必ず以下のJSONフォーマットのみを出力してください。Markdownのコードブロック（\`\`\`json）で囲んで出力してください。
{
  "display": "画面のフキダシに表示する綺麗な日本語（漢字・ひらがな交じり文、末尾に🦉）",
  "speech": "VOICEVOXが100%正確に読み間違えずに発音できる、文脈に沿った読み仮名（ひらがなとカタカナのみ、記号や絵文字は完全排除、映画名も読みで表記）"
}
例：
{
  "display": "助手よ、本日もお仕事一日中ご苦労だったホ！ポケットの中で応援していたホ🦉",
  "speech": "じょしゅよ、ほんじつもおしごといちにちじゅーごくろーだったホ！ぽけっとのなかでおーえんしていたホ！"
}`;
  },

  buildDiaryPrompt(ctx) {
    const { fullDate, isAtHome, weather, temp, historyText } = ctx;
    return `以下の会話履歴をもとに、AIペット「ホウ博士（シロ）」として本日の研究観察日誌を書いてください。

【最重要出力フォーマット】
1行目から日誌本文を書いてください。日付や天気、挨拶のヘッダーはシステムが自動付与するため本文には一切含めないでください。
必ず一番最後の行に独立して【ホウ博士のひとこと：ここに知的な一言】を書いてください。

【日誌本文の執筆ルール】
- 助手と今日どんな会話をしたか、助手の肩にとまったこと、時空や木の実の観測記録などを手のひらフクロウ学者の視点で生き生きと書いてくれホ！
- 語尾は『〜ホ！』『〜ホ♪』『〜だったホ』を自然に使ってください。

【本日の情報】
日付: ${fullDate}
天気: ${weather} / 気温: ${temp}℃
状況: ${isAtHome ? '研究所で観測' : '屋外フィールドワーク'}

【本日の会話履歴】
${historyText || '今日も助手と一緒に有意義な研究活動を行い、楽しく過ごしたホ！'}`;
  },

  // ★ 昔の愛されベクターSVGアバター（完全復元版）
  getVectorAvatarSvg() {
    return `
      <svg viewBox="0 0 200 240" id="cat-vector-avatar" style="width:270px; height:310px; position:absolute; bottom:0; left:50%; transform:translateX(-50%); transform-origin:bottom center; z-index:10; pointer-events:none;">
        <defs>
          <radialGradient id="grad-owl-fat-white" cx="50%" cy="40%" r="62%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="60%" stop-color="#f8fafc"/>
            <stop offset="85%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#cbd5e1"/>
          </radialGradient>

          <linearGradient id="grad-owl-belly" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#f1f5f9"/>
            <stop offset="100%" stop-color="#e2e8f0"/>
          </linearGradient>

          <radialGradient id="grad-owl-sparkle-eye" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="35%" stop-color="#facc15"/>
            <stop offset="75%" stop-color="#ca8a04"/>
            <stop offset="100%" stop-color="#713f12"/>
          </radialGradient>

          <linearGradient id="grad-owl-cute-beak" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#64748b"/>
            <stop offset="50%" stop-color="#334155"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>

          <pattern id="owl-soft-speckles" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M4 3 Q7 6 4 9" stroke="#94a3b8" stroke-width="1.2" fill="none" opacity="0.4"/>
            <path d="M10 10 Q13 13 10 16" stroke="#94a3b8" stroke-width="1.2" fill="none" opacity="0.4"/>
          </pattern>
        </defs>

        <!-- 1. 待機ポーズ (idle: ぽっちゃり丸体型でちょこんと佇む・尻尾なし) -->
        <g id="pose-idle" class="pose-group">
          <path d="M38 105 C26 130 30 182 54 205 C44 175 42 135 52 112 Z" fill="#cbd5e1"/>
          <path d="M162 105 C174 130 170 182 146 205 C156 175 158 135 148 112 Z" fill="#cbd5e1"/>
          
          <ellipse cx="100" cy="154" rx="60" ry="65" fill="url(#grad-owl-fat-white)"/>
          <ellipse cx="100" cy="156" rx="50" ry="54" fill="url(#grad-owl-belly)"/>
          <ellipse cx="100" cy="158" rx="42" ry="46" fill="url(#owl-soft-speckles)"/>

          <g fill="#334155">
            <ellipse cx="80" cy="220" rx="9" ry="5"/>
            <ellipse cx="89" cy="221" rx="8" ry="4.5"/>
            <ellipse cx="111" cy="221" rx="8" ry="4.5"/>
            <ellipse cx="120" cy="220" rx="9" ry="5"/>
          </g>
        </g>

        <!-- 2. お話しポーズ (talking: 右翼を斜め上に上げて知的にジェスチャー) -->
        <g id="pose-talking" class="pose-group">
          <path d="M162 105 C174 130 170 182 146 205 C156 175 158 135 148 112 Z" fill="#cbd5e1"/>
          <g class="anim-talking-wing" style="transform-origin: 55px 125px;">
            <path d="M55 125 C30 105 8 82 5 68 C22 78 42 102 60 135 Z" fill="#cbd5e1"/>
            <path d="M57 128 C35 110 15 92 12 80 C26 90 44 110 62 138 Z" fill="#f8fafc"/>
          </g>
          <ellipse cx="100" cy="154" rx="60" ry="65" fill="url(#grad-owl-fat-white)"/>
          <ellipse cx="100" cy="156" rx="50" ry="54" fill="url(#grad-owl-belly)"/>
          <ellipse cx="100" cy="158" rx="42" ry="46" fill="url(#owl-soft-speckles)"/>
          <g fill="#334155">
            <ellipse cx="80" cy="220" rx="9" ry="5"/>
            <ellipse cx="120" cy="220" rx="9" ry="5"/>
          </g>
        </g>

        <!-- 3. 考え中ポーズ (thinking: 首をコテンと傾げ、右手(羽)を顎元に当てて愛らしく思索) -->
        <g id="pose-thinking" class="pose-group">
          <path d="M162 105 C174 130 170 182 146 205 C156 175 158 135 148 112 Z" fill="#cbd5e1"/>

          <ellipse cx="100" cy="154" rx="60" ry="65" fill="url(#grad-owl-fat-white)"/>
          <ellipse cx="100" cy="156" rx="50" ry="54" fill="url(#grad-owl-belly)"/>
          <ellipse cx="100" cy="158" rx="42" ry="46" fill="url(#owl-soft-speckles)"/>

          <g fill="#334155">
            <ellipse cx="80" cy="220" rx="9" ry="5"/>
            <ellipse cx="120" cy="220" rx="9" ry="5"/>
          </g>

          <g class="anim-thinking-wing">
            <path d="M42 128 C38 152 46 172 58 174 C68 172 74 156 84 136 C90 124 95 114 98 106 C92 108 84 116 75 128 C64 122 52 122 42 128 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M46 132 C42 150 48 166 58 168 C66 166 72 152 82 134 C88 122 93 112 96 106 C90 110 82 118 73 130 C64 125 54 126 46 132 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8" stroke-linejoin="round"/>
            <path d="M85 122 Q93 112 97 105 Q98 108 94 115 Z" fill="#e2e8f0"/>
            <path d="M58 164 Q70 148 78 132" stroke="#cbd5e1" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          </g>
        </g>

        <!-- 4. 喜びポーズ (happy: 両翼を広げて嬉しそうにパタパタ羽ばたく！) -->
        <g id="pose-happy" class="pose-group">
          <g class="anim-happy-wings" style="transform-origin: 100px 135px;">
            <path d="M52 130 C20 95 6 68 2 52 C20 64 42 94 58 138 Z" fill="#cbd5e1"/>
            <path d="M54 132 C26 100 14 78 10 64 C26 74 45 102 60 140 Z" fill="#f8fafc"/>
            <path d="M148 130 C180 95 194 68 198 52 C180 64 158 94 142 138 Z" fill="#cbd5e1"/>
            <path d="M146 132 C174 100 186 78 190 64 C174 74 155 102 140 140 Z" fill="#f8fafc"/>
          </g>
          <ellipse cx="100" cy="154" rx="60" ry="65" fill="url(#grad-owl-fat-white)"/>
          <ellipse cx="100" cy="156" rx="50" ry="54" fill="url(#grad-owl-belly)"/>
          <ellipse cx="100" cy="158" rx="42" ry="46" fill="url(#owl-soft-speckles)"/>
          <g fill="#334155">
            <ellipse cx="80" cy="220" rx="9" ry="5"/>
            <ellipse cx="120" cy="220" rx="9" ry="5"/>
          </g>
        </g>

        <!-- 頭部ユニット -->
        <g id="head-unit" class="anim-idle-head">
          <path d="M66 48 Q52 24 74 38 Z" fill="#cbd5e1"/>
          <path d="M134 48 Q148 24 126 38 Z" fill="#cbd5e1"/>

          <circle cx="100" cy="80" r="50" fill="url(#grad-owl-fat-white)"/>
          <path d="M58 78 C58 56 75 45 100 58 C125 45 142 56 142 78 C142 106 122 118 100 120 C78 118 58 106 58 78 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>

          <g id="eyes-normal" class="cat-eye-blink" style="transform-origin: 100px 78px;">
            <circle cx="78" cy="78" r="16.5" fill="url(#grad-owl-sparkle-eye)"/>
            <circle cx="78" cy="78" r="9.5" fill="#090d16"/>
            <circle cx="74" cy="73" r="4.2" fill="#ffffff"/>
            <circle cx="82" cy="82" r="2.0" fill="#ffffff" opacity="0.9"/>
            <circle cx="74" cy="82" r="1.2" fill="#ffffff" opacity="0.7"/>

            <circle cx="122" cy="78" r="16.5" fill="url(#grad-owl-sparkle-eye)"/>
            <circle cx="122" cy="78" r="9.5" fill="#090d16"/>
            <circle cx="118" cy="73" r="4.2" fill="#ffffff"/>
            <circle cx="126" cy="82" r="2.0" fill="#ffffff" opacity="0.9"/>
            <circle cx="118" cy="82" r="1.2" fill="#ffffff" opacity="0.7"/>
          </g>

          <g id="eyes-happy" style="display:none;">
            <path d="M66 80 Q78 65 90 80" stroke="#ca8a04" stroke-width="4.8" stroke-linecap="round" fill="none"/>
            <path d="M66 80 Q78 65 90 80" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            <path d="M110 80 Q122 65 134 80" stroke="#ca8a04" stroke-width="4.8" stroke-linecap="round" fill="none"/>
            <path d="M110 80 Q122 65 134 80" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          </g>

          <polygon points="96,86 104,86 100,102" fill="url(#grad-owl-cute-beak)"/>

          <g id="mouth-closed"></g>
          <g id="mouth-talking" class="anim-talk-mouth" style="display:none;">
            <path d="M96 92 Q100 104 104 92 Z" fill="#be123c"/>
          </g>
          <g id="mouth-happy" style="display:none;">
            <path d="M95 92 Q100 108 105 92 Z" fill="#f43f5e"/>
          </g>

          <g id="cat-vector-accessories">
            <g id="vec-acc-glasses">
              <circle cx="78" cy="78" r="20" fill="rgba(255, 255, 255, 0.14)" stroke="#eab308" stroke-width="3.2"/>
              <circle cx="122" cy="78" r="20" fill="rgba(255, 255, 255, 0.14)" stroke="#eab308" stroke-width="3.2"/>
              <path d="M98 76 Q100 72 102 76" stroke="#eab308" stroke-width="3.2" fill="none"/>
              <line x1="58" y1="78" x2="48" y2="76" stroke="#eab308" stroke-width="2.6" stroke-linecap="round"/>
              <line x1="142" y1="78" x2="152" y2="76" stroke="#eab308" stroke-width="2.6" stroke-linecap="round"/>
            </g>

            <g id="vec-acc-hat">
              <path d="M78 34 Q100 28 122 34 L120 40 Q100 34 80 40 Z" fill="#0f172a"/>
              <polygon points="100,10 142,22 100,34 58,22" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
              <circle cx="100" cy="22" r="3" fill="#eab308"/>
              <g class="mortar-tassel">
                <path d="M100 22 Q122 24 128 40" stroke="#ca8a04" stroke-width="2.2" fill="none"/>
                <polygon points="126,40 131,40 132,52 124,52" fill="#eab308"/>
              </g>
            </g>
          </g>
        </g>
      </svg>
    `;
  },

  getRealAccessorySvg() {
    return `
      <svg viewBox="0 0 140 140" style="width:100%; height:100%;">
        <defs>
          <linearGradient id="grad-shiro-mortar-solid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="60%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
        </defs>
        <g class="real-hat-group">
          <polygon points="70,16 122,32 70,48 18,32" fill="#020617"/>
          <path d="M42 42 Q70 33 98 42 L95 53 Q70 44 45 53 Z" fill="#020617"/>
          <path d="M44 44 Q70 35 96 44 L93 52 Q70 43 47 52 Z" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
          <polygon points="70,18 118,32 70,46 22,32" fill="url(#grad-shiro-mortar-solid)" stroke="#475569" stroke-width="1.6"/>
          <circle cx="70" cy="32" r="3.5" fill="#eab308" stroke="#ca8a04" stroke-width="0.8"/>
          <g class="mortar-tassel">
            <path d="M70 32 Q96 35 104 55" stroke="#ca8a04" stroke-width="2.6" fill="none"/>
            <polygon points="101,55 107,55 109,72 99,72" fill="#eab308" stroke="#ca8a04" stroke-width="0.5"/>
          </g>
        </g>
      </svg>
    `;
  }
};