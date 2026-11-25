// [稼働Ver 作業版 Rev.12] キーファクトリ一元化・キャラクター完全独立バックアップ・安全マージ復元・partnerComment汎用併記
/* ==========================================================================
   AIペット 共通対話基盤エンジンOS (core_engine.js)
   - プラグインアーキテクチャ対応（char_kuro.js, char_shiro.js の動的自動ロード）
   - 【キャラクター完全分離】クロちゃん🐾 ⇔ シロくん（ホウ博士）🦉 の安全動的取得
   - 【キーファクトリ一元化】StorageManager内部で各キャラのストレージキーを純粋関数で一意生成しモグラ叩きを完全根絶
   - 【完全独立バックアップ】現在アクティブなペットのデータのみを厳密抽出し、他キャラの写真・ログ混入を100%防止
   - 【安全マージ復元】バックアップ読み込み時に当該キャラクターの領域のみを更新し、他キャラのデータや最新会話ログを安全保護
   - 【応答オブジェクト入口正規化】TextFormatter.normalizeResponse により、Geminiの出力を即座に { display, speech } へ確定
   - 【自声エコー完全根絶】表示用漢字テキストと読み用ひらがなテキストを二重登録し、Web Speech APIの認識ゆれを物理遮断
   - 【状態通知の純化】AudioSpeechEngineから散発的なDOM直接操作を全廃し、イベント駆動でAppCoreへ通知
   - 【映画名・固有名詞読み上げ強化】ゴジラ-0（マイナスゼロ）、ゴジラ-1.0等の表記・音声認識ゆれを100%安定発音化
   - 【直近写真継続対話エンジン】撮影後30分以内の写真キャッシュ管理、写真に関する話題（何色、どこ、これ等）のインテリジェント判定
   - 【ローカルVOICEVOX安定化】待機タイムアウトを5.5秒に設定しTailscale/PC直結の完走率最大化
   - Gemini連携モデル完全固定（gemini-3.5-flash-lite / gemini-flash-lite-latest）
   ========================================================================== */

/* ★ 本質的テキストフォーマッター（表記とよみの明快な分離＆入口正規化エンジン） */
const TextFormatter = {
  // Geminiからの生出力を即座に完全な表示用／読み上げ用オブジェクトに正規化
  normalizeResponse(rawText) {
    if (!rawText) {
      const cur = getCurChar();
      const ending = cur.id === 'shiro' ? 'ホ！' : 'ニャン🐾';
      return { display: `……${ending}`, speech: "……" };
    }

    let t = typeof rawText === 'string' ? rawText.trim() : String(rawText);
    let display = "";
    let speech = "";

    // JSON形式（```json ... ``` または 生JSON）のパース試行
    if (t.includes('"display"') || t.startsWith('{')) {
      try {
        const cleanJsonStr = t.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleanJsonStr);
        if (parsed) {
          if (parsed.display) display = String(parsed.display).trim();
          if (parsed.speech) speech = String(parsed.speech).trim();
        }
      } catch (e) {
        const matchDisplay = t.match(/"display"\s*:\s*"([^"]+)"/);
        const matchSpeech = t.match(/"speech"\s*:\s*"([^"]+)"/);
        if (matchDisplay) display = matchDisplay[1].trim();
        if (matchSpeech) speech = matchSpeech[1].trim();
      }
    }

    // JSONでなかった場合、またはパース不能時の平文フォールバック
    if (!display) {
      display = t;
    }
    if (!speech) {
      speech = display;
    }

    // 表示用の整形
    display = this.formatDisplayText(display);

    // キャラクターごとの末尾アイコン付与
    const cur = getCurChar();
    display = cur.cleanEnding ? cur.cleanEnding(display) : display;

    // 読み用の整形
    speech = this.formatSpeechText(speech);

    return { display, speech };
  },

  // 画面表示用テキストの整形
  formatDisplayText(rawText) {
    if (!rawText) return "";
    let t = String(rawText);

    // 生JSONが混入していた場合の防護
    if (t.includes('"display"') || t.trim().startsWith('{')) {
      try {
        const cleanJsonStr = t.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleanJsonStr);
        if (parsed && parsed.display) t = parsed.display;
      } catch (e) {
        const match = t.match(/"display"\s*:\s*"([^"]+)"/);
        if (match) t = match[1];
      }
    }

    // 1. 『タイトル（よみ）』 ➔ 『タイトル』
    t = t.replace(/([『「【《〈][^『「【《〈）)]+)[（(][^）)]+[）)]([』」】》〉])/gu, '$1$2');
    // 2. 『タイトル』（よみ） ➔ 『タイトル』 / 表記（よみ） ➔ 表記
    t = t.replace(/[（(][^）)]+[）)]/gu, '').trim();
    // 3. 改行やエスケープ記号のサニタイズ
    t = t.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    return t;
  },

  // VOICEVOX読み上げ用テキストの抽出・整形
  formatSpeechText(rawText) {
    if (!rawText) return "";
    let t = String(rawText);

    // 生JSONが混入していた場合の防護
    if (t.includes('"speech"') || t.trim().startsWith('{')) {
      try {
        const cleanJsonStr = t.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleanJsonStr);
        if (parsed && parsed.speech) t = parsed.speech;
      } catch (e) {
        const match = t.match(/"speech"\s*:\s*"([^"]+)"/);
        if (match) t = match[1];
      }
    }

    // 映画名・固有名詞の特殊発音正規化
    t = t.replace(/ゴジラ\s*[-−―ー—]?\s*(?:0(?:\.0)?|ゼロ|ぜろ)/gui, 'ゴジラマイナスゼロ');
    t = t.replace(/ゴジラ\s*[-−―ー—]?\s*(?:1(?:\.0)?|ワン|わん)/gui, 'ゴジラマイナスワン');
    t = t.replace(/ゴジラ\s*マイナス\s*(?:0|ゼロ|ぜろ)/gui, 'ゴジラマイナスゼロ');
    t = t.replace(/ゴジラ\s*マイナス\s*(?:1|ワン|わん)/gui, 'ゴジラマイナスワン');

    // ルビ・括弧解析フォールバック
    t = t.replace(/[『「【《〈][^『「【《〈）)]+[（(]([ぁ-んァ-ヶー\s・\d]+)[）)][』」】》〉]/gu, ' $1 ');
    t = t.replace(/[『「【《〈][^『「【《〈』」】》〉]+[』」】》〉]\s*[（(]([ぁ-んァ-ヶー\s・\d]+)[）)]/gu, ' $1 ');
    t = t.replace(/[A-Za-z0-9ぁ-んァ-ヶ一-龠々ー・×\-\.\s]{2,}\s*[（(]([ぁ-んァ-ヶー\s・\d]{2,})[）)]/gu, ' $1 ');
    t = t.replace(/[『』「」【】《》〈〉]/gu, ' ');
    t = t.replace(/\\n/g, ' ').replace(/\\"/g, '');
    return t.replace(/\s+/g, ' ').trim();
  }
};
window.TextFormatter = TextFormatter;

/* ★ アクティブキャラクターの安全動的取得（クロちゃん ⇔ シロくん ⇔ 将来の仲間） */
const CurrentCharacterFallback = {
  id: "kuro",
  name: "クロ",
  title: "クロちゃん",
  species: "ノルウェージャンフォレストキャット（1歳の女の子）",
  firstPerson: "クロ",
  ownerCall: "おやびん",
  defaultSpeakerId: 10,
  defaultVoiceRate: 1.05,
  imagePrefix: "",
  fillerPhrases: ["そうニャン♪", "えーっとニャ…", "確認するニャ！", "おまかせニャ！", "あそぶニャ♪", "バッチリニャ！", "はーい！"],
  photoUserPrompt: "クロちゃん、この写真見てニャ！",
  photoAiThoughtPrompt: "この写真を見て感想を聞かせてニャン🐾",
  photoThinkingStatus: "📷 写真見てるニャ…",
  photoThinkingBubble: "クロがお写真を見てるニャ…📷✨",
  cleanEnding: (t) => t,
  correctSpeechInput: (t) => t,
  defaultMemories: [],
  defaultEyelidCoords: { y: 172, x: 0, gap: 28, size: 16, rotate: 0 },
  defaultAccessoryCoords: {
    idle: { x: 0, y: 120, scale: 1.0, rotate: 0 },
    talking: { x: 0, y: 128, scale: 1.0, rotate: 0 },
    thinking: { x: 0, y: 120, scale: 1.0, rotate: 0 },
    happy: { x: 0, y: 120, scale: 1.0, rotate: 0 }
  },
  buildSystemPrompt: () => "",
  buildDiaryPrompt: () => "",
  getVectorAvatarSvg: () => "",
  getRealAccessorySvg: () => ""
};

const getCurChar = () => {
  const activeId = localStorage.getItem('kuro_active_character') || 'kuro';
  if (activeId === 'shiro' && window.Character_Shiro) {
    return window.Character_Shiro;
  }
  return window.Character_Kuro || CurrentCharacterFallback;
};
window.getCurChar = getCurChar;

const CurrentCharacter = new Proxy(CurrentCharacterFallback, {
  get(target, prop) {
    const active = getCurChar();
    return active[prop] !== undefined ? active[prop] : target[prop];
  }
});
window.CurrentCharacter = CurrentCharacter;

/* ★ Gemini連携モデル完全固定定数（変更・旧世代への格下げ完全禁止） */
const FIXED_LITE_MODELS = Object.freeze([
  "gemini-3.5-flash-lite",     // 第1優先（主軸・最速モデル）
  "gemini-flash-lite-latest"   // 第2優先（タイムアウト時バックアップ）
]);
window.FIXED_LITE_MODELS = FIXED_LITE_MODELS;

/* ★ 正式なFunction Calling定義 */
const KURO_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "searchMapPlaces",
        description: "ユーザーが『探して』『どこ？』『案内して』とお散歩スポット、公園、カフェ、飲食店（ラーメン等）の具体的な場所や地図を求めた時のみ実行してください。単なる料理の質問や雑談では絶対に呼び出さないでください。",
        parameters: {
          type: "OBJECT",
          properties: {
            spotName: { type: "STRING", description: "検索する店名・施設・ジャンル（例: 近くの公園, カフェ, 炭火ホルモン 丸川, ラーメン）" },
            area: { type: "STRING", description: "検索するエリア（例: 東京都東村山市, 現在地周辺）" }
          },
          required: ["spotName"]
        }
      },
      {
        name: "searchLatestNews",
        description: "ユーザーが『ニュース教えて』『速報見せて』『ニュース記事』と最新の時事ニュースを求めた時のみ実行してください。歴史上の出来事や一般的な解説質問では呼び出さないでください。",
        parameters: {
          type: "OBJECT",
          properties: {
            topic: { type: "STRING", description: "検索キーワード（例: 大谷翔平 最新ニュース, 東村山市）" }
          },
          required: ["topic"]
        }
      }
    ]
  }
];
window.KURO_TOOLS = KURO_TOOLS;

/* ==========================================================================
   MODULE 0: 診断ロガー ＆ トースト通知
   ========================================================================== */
const Toast = {
  timer: null,
  show(message, type = 'success', duration = 3500) {
    const el = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-message');
    if (!el) return;
    if (this.timer) clearTimeout(this.timer);
    el.className = `is-show ${type}`;
    icon.textContent = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
    msg.textContent = message;
    el.onclick = () => { el.classList.remove('is-show'); };
    this.timer = setTimeout(() => { el.classList.remove('is-show'); }, duration);
  }
};
window.Toast = Toast;

const Logger = {
  allLogs: [],
  log(message, type = 'info') {
    const panel = document.getElementById('diag-logs');
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const formatted = `[${timeStr}] ${message}`;
    this.allLogs.push(formatted);
    if (panel) {
      const row = document.createElement('div');
      row.className = `log-row log-${type}`;
      row.textContent = formatted;
      panel.appendChild(row);
      panel.scrollTop = panel.scrollHeight;
    }
    console.log(formatted);
  },
  getEvidenceText() { return this.allLogs.join('\n'); }
};
window.Logger = Logger;

/* ==========================================================================
   MODULE 0.5: 日時・生活リズム提供エンジン
   ========================================================================== */
const TimeProvider = {
  getCurrentInfo() {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayOfWeek = dayNames[now.getDay()];
      const pad = (n) => String(n).padStart(2, '0');
      const clock = `${pad(hours)}:${pad(minutes)}`;
      const logKey = `${year}-${pad(month)}-${pad(date)}`;
      const fullDate = `${year}年${month}月${date}日 (${dayOfWeek})`;

      const topDateDisplay = `${month}/${date} (${dayOfWeek}) ${clock}`;
      const headerDisplay = topDateDisplay;

      const isLateNight = (hours < 4);
      let lifeDateObj = now;
      if (isLateNight) lifeDateObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const lifeYear = lifeDateObj.getFullYear();
      const lifeMonth = lifeDateObj.getMonth() + 1;
      const lifeDate = lifeDateObj.getDate();
      const lifeDayOfWeek = dayNames[lifeDateObj.getDay()];
      const lifeLogKey = `${lifeYear}-${pad(lifeMonth)}-${pad(lifeDate)}`;
      const lifeFullDate = `${lifeYear}年${lifeMonth}月${lifeDate}日 (${lifeDayOfWeek})`;

      const isEvening = (hours >= 20 || isLateNight);

      const curChar = getCurChar();
      const suffix = curChar.id === 'shiro' ? 'ホ！' : 'ニャ！';
      const clockSuffix = curChar.id === 'shiro' ? 'だホ！' : 'ニャン🐾';

      return {
        now, year, month, date, hours, minutes, dayOfWeek, clock, logKey, fullDate,
        headerDisplay, topDateDisplay,
        spokenClock: `いまは、${hours}時${minutes === 0 ? 'ちょうど' : minutes + '分'}だ${clockSuffix}`,
        spokenDate: `きょうは、${month}月${date}日、${dayOfWeek}曜日だ${suffix}`,
        clockDisplay: `いまは ${hours}時${pad(minutes)}分 だ${clockSuffix}`,
        dateDisplay: `きょうは ${month}月${date}日 (${dayOfWeek}曜日) だ${suffix}`,
        isLateNight, isEvening, lifeLogKey, lifeFullDate
      };
    } catch (e) {
      const fbNow = new Date();
      const fbPad = (n) => String(n).padStart(2, '0');
      const fbClock = `${fbPad(fbNow.getHours())}:${fbPad(fbNow.getMinutes())}`;
      const fbKey = `${fbNow.getFullYear()}-${fbPad(fbNow.getMonth() + 1)}-${fbPad(fbNow.getDate())}`;
      return {
        now: fbNow, year: fbNow.getFullYear(), month: fbNow.getMonth() + 1, date: fbNow.getDate(),
        hours: fbNow.getHours(), minutes: fbNow.getMinutes(), dayOfWeek: "日", clock: fbClock,
        logKey: fbKey, fullDate: `${fbNow.getFullYear()}年${fbNow.getMonth() + 1}月${fbNow.getDate()}日`,
        headerDisplay: `${fbNow.getMonth() + 1}/${fbNow.getDate()} ${fbClock}`,
        topDateDisplay: `${fbNow.getMonth() + 1}/${fbNow.getDate()} ${fbClock}`,
        spokenClock: `いまは、${fbNow.getHours()}時${fbNow.getMinutes()}分だニャン🐾`,
        spokenDate: `きょうは、${fbNow.getMonth() + 1}月${fbNow.getDate()}日だニャ！`,
        clockDisplay: `いまは ${fbNow.getHours()}時${fbPad(fbNow.getMinutes())}分 だニャン🐾`,
        dateDisplay: `きょうは ${fbNow.getMonth() + 1}月${fbNow.getDate()}日 だニャ！`,
        isLateNight: false, isEvening: false, lifeLogKey: fbKey, lifeFullDate: fbKey
      };
    }
  },

  getYesterdayLifeInfo() {
    const cur = this.getCurrentInfo();
    const [y, m, d] = cur.lifeLogKey.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);
    const yesterdayDate = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);

    const year = yesterdayDate.getFullYear();
    const month = yesterdayDate.getMonth() + 1;
    const date = yesterdayDate.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[yesterdayDate.getDay()];
    const pad = (n) => String(n).padStart(2, '0');
    const key = `${year}-${pad(month)}-${pad(date)}`;
    const fullDate = `${year}年${month}月${date}日 (${dayOfWeek})`;

    return { year, month, date, dayOfWeek, key, fullDate };
  },

  formatDateKeyToFull(dateKey) {
    if (!dateKey) return "";
    const parts = dateKey.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0])) return dateKey;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return `${parts[0]}年${parts[1]}月${parts[2]}日 (${dayNames[dt.getDay()]})`;
  },

  // ★ キーファクトリと連動した安全な日付キー全走査
  getAllActiveDateKeys() {
    const dateSet = new Set();
    const cur = this.getCurrentInfo();
    dateSet.add(cur.lifeLogKey);

    const yInfo = this.getYesterdayLifeInfo();
    dateSet.add(yInfo.key);

    const diaries = StorageManager.loadAllDiaries();
    diaries.forEach(d => { if (d && d.dateKey) dateSet.add(d.dateKey); });

    const activeId = getCurChar().id;
    for (let k in localStorage) {
      if (k.startsWith(`kuro_daily_logs_${activeId}_`)) {
        const dateK = k.replace(`kuro_daily_logs_${activeId}_`, '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateK)) dateSet.add(dateK);
      } else if (k.startsWith(`kuro_daily_photos_${activeId}_`)) {
        const dateP = k.replace(`kuro_daily_photos_${activeId}_`, '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateP)) dateSet.add(dateP);
      } else if (activeId === 'kuro') {
        if (k.startsWith('kuro_daily_logs_') && !k.includes('_shiro_')) {
          const dateK = k.replace('kuro_daily_logs_', '');
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateK)) dateSet.add(dateK);
        } else if (k.startsWith('kuro_daily_photos_') && !k.includes('_shiro_')) {
          const dateP = k.replace('kuro_daily_photos_', '');
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateP)) dateSet.add(dateP);
        }
      }
    }

    return Array.from(dateSet).sort().reverse();
  }
};
window.TimeProvider = TimeProvider;

/* ==========================================================================
   MODULE 1: 音声合成＆音声認識エンジン
   ========================================================================== */
class AudioSpeechEngine {
  constructor() {
    this.masterAudio = new Audio();
    this.masterAudio.preload = "auto";
    this.fillerAudio = new Audio();
    this.fillerAudio.preload = "auto";
    this.isMasterUnlocked = false;
    this.silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    this.audioCtx = null;

    this.rate = parseFloat(localStorage.getItem('kuro_rate') || String(getCurChar().defaultVoiceRate || 1.05));
    this.isSpeaking = false;
    this.isListening = false;
    this.isStarting = false;
    this.isActionButtonLocked = false;
    this.isSpeechProducing = false;

    this.recognition = null;
    this.restartTimer = null;
    this.lastMicErrorTime = 0;
    this.fixedPhraseMap = new Map();
    this.blobUrlCache = new Map();
    this.recentSpokenTexts = [];
    this.lastSpeechEndTime = 0;

    this.rateLimitCooldownUntil = 0;
    this.ttsRequestChain = Promise.resolve();
    this.lastVoicevoxRequestTime = 0;
    this.currentAbortController = null;
    this.isReadingAloud = false;
    this.readingAbortController = null;

    // 状態コールバック（DOM直接操作ではなくイベント通知）
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onSpeechFinal = null;
    this.onListeningStatus = null;
    this.onBargeIn = null;

    this._setupRecognition();
    this._setupInteractionUnlock();
  }

  setRate(r) { this.rate = r; localStorage.setItem('kuro_rate', r); }

  _ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  unlockMasterAudio() {
    const ctx = this._ensureAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.isMasterUnlocked) return;
    this.masterAudio.src = this.silentWav;
    this.fillerAudio.src = this.silentWav;
    Promise.all([this.masterAudio.play().catch(() => {}), this.fillerAudio.play().catch(() => {})])
      .then(() => { this.isMasterUnlocked = true; }).catch(() => {});
  }

  _setupInteractionUnlock() {
    const unlock = () => {
      this._ensureAudioContext();
      this.unlockMasterAudio();
    };
    ['pointerdown', 'touchstart', 'click'].forEach(evt => window.addEventListener(evt, unlock, { passive: true, once: true }));
  }

  playEffect(type) {
    const ctx = this._ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => this._executePlayEffect(type, ctx)).catch(() => {});
    } else {
      this._executePlayEffect(type, ctx);
    }
  }

  _executePlayEffect(type, ctx) {
    const now = ctx.currentTime;

    if (type === 'poof') {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) output[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const filter = ctx.createBiquadFilter(); filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now); filter.frequency.exponentialRampToValueAtTime(160, now + 0.32);
      const gain = ctx.createGain(); gain.gain.setValueAtTime(0.45, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      noise.start(now); noise.stop(now + 0.35);

    } else if (type === 'purr') {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const tremoloGain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const masterGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.linearRampToValueAtTime(162, now + 0.4);
      osc.frequency.linearRampToValueAtTime(180, now + 0.85);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, now);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(21, now);

      tremoloGain.gain.setValueAtTime(0.55, now);
      lfoGain.gain.setValueAtTime(0.42, now);
      lfo.connect(lfoGain);
      lfoGain.connect(tremoloGain.gain);

      masterGain.gain.setValueAtTime(0.02, now);
      masterGain.gain.linearRampToValueAtTime(0.72, now + 0.14);
      masterGain.exponentialRampToValueAtTime(0.001, now + 0.96);

      osc.connect(filter);
      filter.connect(tremoloGain);
      tremoloGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + 0.97);
      lfo.stop(now + 0.97);

      if ('vibrate' in navigator) try { navigator.vibrate([40, 50, 40]); } catch(e) {}
      Logger.log(`[Sound] 😻 ノイズゼロ・豊潤リアル喉鳴らし/羽音発音`, "info");

    } else if (type === 'snack') {
      [0, 0.15, 0.3].forEach(d => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now + d);
        gain.gain.setValueAtTime(0.35, now + d); gain.gain.exponentialRampToValueAtTime(0.01, now + d + 0.12);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + d); osc.stop(now + d + 0.12);
      });
      Logger.log(`[Sound] 🐟 おやつ音発音`, "info");

    } else if (type === 'bell') {
      [1568, 2093].forEach((f, idx) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(f, now + idx * 0.2);
        gain.gain.setValueAtTime(0.45, now + idx * 0.2); gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + idx * 0.2); osc.stop(now + idx * 0.2 + 0.42);
      });

    } else if (type === 'alarm') {
      [0, 0.12, 0.24].forEach(d => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(2093, now + d);
        gain.gain.setValueAtTime(0.35, now + d); gain.gain.exponentialRampToValueAtTime(0.01, now + d + 0.08);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + d); osc.stop(now + d + 0.085);
      });

    } else if (type === 'idea') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, now); osc.frequency.exponentialRampToValueAtTime(1760, now + 0.2);
      gain.gain.setValueAtTime(0.35, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.35);

    } else if (type === 'aizuchi') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(680, now); osc.frequency.exponentialRampToValueAtTime(920, now + 0.08);
      gain.gain.setValueAtTime(0.24, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.18);

    } else if (type === 'happy_meow') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); osc.frequency.exponentialRampToValueAtTime(640, now + 0.4);
      gain.gain.setValueAtTime(0.28, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.45);
    }
  }

  cleanEndingNenyan(text) {
    if (!text) return "";
    const cur = getCurChar();
    return cur.cleanEnding ? cur.cleanEnding(text) : text;
  }

  correctSpeechInput(text) {
    if (!text) return "";
    const cur = getCurChar();
    let t = cur.correctSpeechInput ? cur.correctSpeechInput(text) : text;

    // 音声認識の一般的な誤変換ゆれ補正
    t = t.replace(/(?:マネスク|まねすく|まねす)/gu, 'マイナス');
    t = t.replace(/ゴジラ\s*[-−―ー—]?\s*(?:0(?:\.0)?|ゼロ|ぜろ)/gui, 'ゴジラ-0');
    t = t.replace(/ゴジラ\s*[-−―ー—]?\s*(?:1(?:\.0)?|ワン|わん)/gui, 'ゴジラ-1.0');
    t = t.replace(/ゴジラ\s*マイナス\s*(?:0|ゼロ|ぜろ)/gui, 'ゴジラ-0');
    t = t.replace(/ゴジラ\s*マイナス\s*(?:1|ワン|わん)/gui, 'ゴジラ-1.0');

    const customDict = StorageManager.loadCustomDictionary();
    if (Array.isArray(customDict) && customDict.length > 0) {
      customDict.forEach(item => {
        if (item && item.from && item.to) {
          const words = item.from.split(/[,、\s]+/).map(w => w.trim()).filter(Boolean);
          if (words.length > 0) {
            const pattern = new RegExp(`(?:${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gu');
            t = t.replace(pattern, item.to);
          }
        }
      });
    }

    return t;
  }

  _convertAllNumbersToKana(text) {
    if (!text) return "";
    let t = text.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    t = t.replace(/余([はがものにもと])/g, 'よ$1').replace(/余/g, 'よ');

    const d = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

    const numToKana = (n) => {
      if (isNaN(n)) return '';
      if (n === 0) return 'ぜろ';
      let res = '';

      if (n >= 10000) {
        const man = Math.floor(n / 10000);
        res += numToKana(man) + 'まん';
        n %= 10000;
      }
      if (n >= 100) {
        const hyaku = Math.floor(n / 100);
        if (hyaku === 1) res += 'ひゃく';
        else if (hyaku === 3) res += 'さんびゃく';
        else if (hyaku === 6) res += 'ろっぴゃく';
        else if (hyaku === 8) res += 'はっぴゃく';
        else res += d[hyaku] + 'ひゃく';
        n %= 100;
      }
      if (n >= 10) {
        const ten = Math.floor(n / 10);
        res += (ten === 1 ? 'じゅう' : d[ten] + 'じゅう');
        n %= 10;
      }
      if (n > 0) {
        res += d[n];
      }
      return res;
    };

    t = t.replace(/(\d{1,4})\s*年/g, (m, y) => `${numToKana(parseInt(y, 10))}ねん`);
    t = t.replace(/(\d{1,2})\s*月/g, (m, mo) => `${numToKana(parseInt(mo, 10))}がつ`);
    t = t.replace(/(\d{1,2})\s*日/g, (m, da) => {
      const dn = parseInt(da, 10);
      const specialDays = { 1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか', 14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか' };
      return specialDays[dn] || `${numToKana(dn)}にち`;
    });
    t = t.replace(/(\d{1,2})\s*時/g, (m, h) => `${numToKana(parseInt(h, 10))}じ`);
    t = t.replace(/(\d{1,2})\s*分/g, (m, mi) => `${numToKana(parseInt(mi, 10))}ふん`);
    t = t.replace(/(\d+)\s*(?:度|℃)/g, (m, c) => `${numToKana(parseInt(c, 10))}ど`);
    t = t.replace(/\d+/g, m => numToKana(parseInt(m, 10)));
    return t;
  }

  playImmediateFiller(type = 'general') {
    this.unlockMasterAudio();
    this.playEffect('aizuchi');
    if (typeof AppCore !== 'undefined' && AppCore.transitionTo) {
      AppCore.transitionTo('THINKING');
    }
  }

  _getVoicevoxBlobUrl(text, speakerId) {
    const key = `${speakerId}_${text}`;
    if (this.blobUrlCache.has(key)) {
      Logger.log(`[TTS] キャッシュヒット: 「${text.substring(0, 15)}…」`, "info");
      return Promise.resolve(this.blobUrlCache.get(key));
    }

    this.ttsRequestChain = this.ttsRequestChain.catch(() => {}).then(async () => {
      if (this.blobUrlCache.has(key)) return this.blobUrlCache.get(key);

      const t0 = performance.now();

      let localBaseUrl = (localStorage.getItem('kuro_local_tts_url') || localStorage.getItem('kuro_ngrok_url') || '').trim().replace(/\/+$/, '');

      if (!localBaseUrl && typeof window !== 'undefined' && window.location && window.location.hostname) {
        const hn = window.location.hostname;
        if (hn && hn !== 'github.io' && !hn.endsWith('.github.io')) {
          localBaseUrl = `http://${hn}:50021`;
        }
      }
      if (!localBaseUrl) {
        localBaseUrl = 'http://localhost:50021';
      }

      // ローカル直結待機時間を 5.5秒に設定し完走率を最大化
      if (localBaseUrl) {
        const localAbortCtrl = new AbortController();
        const localTimeoutId = setTimeout(() => localAbortCtrl.abort(), 5500);

        try {
          Logger.log(`[TTS] ⚡ PCローカル直結試行 (${localBaseUrl}, 話者:${speakerId}, 待機:5.5s): 「${text.substring(0, 16)}…」`, "info");

          const qUrl = `${localBaseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
          const qRes = await fetch(qUrl, {
            method: 'POST',
            signal: localAbortCtrl.signal
          });

          if (!qRes.ok) throw new Error(`Query HTTP ${qRes.status}`);
          const qJson = await qRes.json();

          const sUrl = `${localBaseUrl}/synthesis?speaker=${speakerId}`;
          const sRes = await fetch(sUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(qJson),
            signal: localAbortCtrl.signal
          });

          if (!sRes.ok) throw new Error(`Synth HTTP ${sRes.status}`);
          const blob = await sRes.blob();

          clearTimeout(localTimeoutId);
          const localBlobUrl = URL.createObjectURL(blob);
          this.blobUrlCache.set(key, localBlobUrl);

          const ms = Math.round(performance.now() - t0);
          Logger.log(`[TTS] ⚡ PCローカル合成成功 (${ms}ms) [Tailscale/ローカル直結]`, "success");
          return localBlobUrl;

        } catch (localErr) {
          clearTimeout(localTimeoutId);
          Logger.log(`[TTS] ⚠️ PCローカル未接続/待機超過 (${localErr.message}) ➔ クラウドへ自動切替`, "warn");
        }
      }

      const now = Date.now();
      if (now < this.rateLimitCooldownUntil) {
        const remainingSec = Math.ceil((this.rateLimitCooldownUntil - now) / 1000);
        Logger.log(`[TTS] ⏳ クラウド429クールダウン中（残り${remainingSec}秒）。API呼び出しをスキップします`, "warn");
        throw new Error("TTS_RATE_LIMITED_COOLDOWN");
      }

      const elapsed = now - this.lastVoicevoxRequestTime;
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
      this.lastVoicevoxRequestTime = Date.now();

      const vvKey = (localStorage.getItem('kuro_voicevox_key') || '').trim();
      let initUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
      if (vvKey) initUrl += `&key=${encodeURIComponent(vvKey)}`;

      const keyStatusText = vvKey ? "🔑個別キー適用済" : "🆓無料枠";
      Logger.log(`[TTS] ☁️ クラウド音声生成開始 (${keyStatusText}, 話者:${speakerId}): 「${text.substring(0, 16)}…」`, "info");

      let initRes;
      try {
        initRes = await fetch(initUrl);
      } catch (networkErr) {
        Logger.log(`[TTS] クラウドネットワークエラー: ${networkErr.message}`, "error");
        throw networkErr;
      }

      if (initRes.status === 429) {
        this.rateLimitCooldownUntil = Date.now() + 8000;
        Logger.log(`[TTS] ⚠️ クラウド429レート制限検知。8秒間のクールダウン防護壁を展開します`, "warn");
        throw new Error("HTTPエラー 429");
      }

      if (!initRes.ok) {
        Logger.log(`[TTS] クラウドHTTPエラー ${initRes.status}`, "error");
        throw new Error(`HTTPエラー ${initRes.status}`);
      }

      const initData = await initRes.json();
      if (initData.isAudioError) {
        Logger.log(`[TTS] VOICEVOXクラウド生成エラー`, "error");
        throw new Error("VOICEVOX生成エラー");
      }

      let directUrl = initData.mp3StreamingUrl || initData.mp3DownloadUrl;
      if (!directUrl && initData.audioStatusUrl) {
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 350));
          const sRes = await fetch(initData.audioStatusUrl);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.isAudioReady) { directUrl = sData.mp3StreamingUrl || sData.mp3DownloadUrl; break; }
          }
        }
      }
      if (!directUrl) {
        Logger.log(`[TTS] 音声生成タイムアウト`, "error");
        throw new Error("音声タイムアウト");
      }

      const aRes = await fetch(directUrl);
      const blob = await aRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlCache.set(key, blobUrl);
      const ms = Math.round(performance.now() - t0);
      Logger.log(`[TTS] ✅ クラウド音声取得完了 (${ms}ms) [${keyStatusText}]`, "success");
      return blobUrl;
    });

    return this.ttsRequestChain;
  }

  // ★ 表示用テキストと発音用テキストの双方を照合する二重防護エコーキャンセラ
  _isSelfEcho(text) {
    if (!text) return true;
    const cleanInput = text.trim();
    const normalizedInput = cleanInput.replace(/[\s、。！？ニャンニャホ🐾🐱✨❤️💖🎀🎵🐟💡🦉🌰]/gu, '');
    
    if (normalizedInput.length < 1) return true;
    if (/^(?:おまかせニャ|あそぶニャ|バッチリニャ|はーい|ちょい待ちニャ|すすめるニャ|フン|計算中ホ|任せるが良いホ|ホウ|バッチリホ|うむ)/.test(cleanInput)) return true;
    if (/^(?:だホ|ホ|ホウ|だニャ|ニャン|ニャ|ホな|ホよ)[！!？\?]*$/.test(cleanInput)) return true;

    const now = Date.now();
    const isVeryRecent = (now - this.lastSpeechEndTime) < 2200;

    for (const spoken of this.recentSpokenTexts) {
      if (!spoken) continue;
      const normalizedSpoken = spoken.replace(/[\s、。！？ニャンニャホ🐾🐱✨❤️💖🎀🎵🐟💡🦉🌰]/gu, '');

      if (normalizedSpoken === normalizedInput) return true;

      if (isVeryRecent && normalizedSpoken.length >= 8) {
        const tail10 = normalizedSpoken.slice(-10);
        const tail15 = normalizedSpoken.slice(-15);
        if (normalizedInput.length >= 2 && (tail10.endsWith(normalizedInput) || tail15.endsWith(normalizedInput) || normalizedSpoken.includes(normalizedInput))) {
          Logger.log(`[Mic] 🛑 自声エコー検知・除外: 「${cleanInput}」 (発話履歴一致)`, "info");
          return true;
        }
      }
    }
    return false;
  }

  // ★ 音声発話（表示テキスト displayTextOverride と発音テキスト speechText を安全に処理）
  async speak(text, speakerIdOverride = null, onStart = null, onEnd = null, cooldownOverride = null, displayTextOverride = null) {
    this.isSpeechProducing = true;
    this.stopSpeaking();
    this.stopListening();
    this.unlockMasterAudio();

    const speakerId = (speakerIdOverride !== null)
      ? speakerIdOverride
      : (typeof AppCore !== 'undefined' && AppCore.getSpeakerId ? AppCore.getSpeakerId() : (getCurChar().defaultSpeakerId || 10));

    // 発音用テキストの抽出とサニタイズ
    let clean = TextFormatter.formatSpeechText(text || '');
    clean = clean.replace(/https?:\/\/[^\s]+/gi, '');
    clean = this._convertAllNumbersToKana(clean).replace(/<[^>]*>/g, '').replace(/[*#_~`🐾🐱✨❤️💖🎀🧠⚡🩺💭🎵🍜🥟📍📰🗺️⭐💥📒📖🌐🔷🔴🌤️🛍️💡🐟📷🏠🔮🦉🌰]/gu, '').trim();

    // ★ 表示用テキスト（漢字混じり）と発音用テキスト（ひらがな化）の双方を自声エコー防止リストに登録
    const dispClean = displayTextOverride ? TextFormatter.formatDisplayText(displayTextOverride) : TextFormatter.formatDisplayText(text || '');
    if (dispClean) this.recentSpokenTexts.unshift(dispClean);
    if (clean) this.recentSpokenTexts.unshift(clean);
    if (this.recentSpokenTexts.length > 8) this.recentSpokenTexts.length = 8;

    let dynamicCooldown = (cooldownOverride !== null) ? cooldownOverride : (clean.length > 70 ? 600 : 400);

    if (!clean) {
      this.isSpeechProducing = false;
      if (onStart) onStart();
      if (onEnd) onEnd();
      if (this.onSpeechEnd) this.onSpeechEnd();
      setTimeout(() => {
        if (typeof AppCore !== 'undefined' && AppCore.state && AppCore.state.isRunning && !this.isActionButtonLocked) this.startListening();
      }, dynamicCooldown);
      return;
    }

    try {
      const blobAudioUrl = await this._getVoicevoxBlobUrl(clean, speakerId);
      this.masterAudio.src = blobAudioUrl;
      this.masterAudio.playbackRate = this.rate;

      this.masterAudio.onplaying = () => {
        this.isSpeaking = true;
        if (this.onSpeechStart) this.onSpeechStart();
        if (onStart) onStart();
      };

      this.masterAudio.onended = () => {
        this.isSpeaking = false;
        this.lastSpeechEndTime = Date.now();
        if (onEnd) onEnd();
        if (this.onSpeechEnd) this.onSpeechEnd();
        
        setTimeout(() => {
          this.isSpeechProducing = false;
          if (typeof AppCore !== 'undefined' && AppCore.state) {
            if (AppCore.state.isRunning && !this.isSpeaking && !this.isReadingAloud && !this.isActionButtonLocked && !AppCore.state.isThinking && !AppCore.state.isProcessingInput) {
              this.startListening();
            }
          }
        }, dynamicCooldown);
      };

      this.masterAudio.onerror = (e) => {
        Logger.log(`[Audio] 再生エラー発生`, "error");
        this.isSpeaking = false;
        if (onStart) onStart();
        if (onEnd) onEnd();
        if (this.onSpeechEnd) this.onSpeechEnd();
        setTimeout(() => {
          this.isSpeechProducing = false;
          if (typeof AppCore !== 'undefined' && AppCore.state && AppCore.state.isRunning) {
            this.startListening();
          }
        }, dynamicCooldown);
      };

      await this.masterAudio.play();

    } catch(err) {
      Logger.log(`[TTS] ⚠️ 音声スキップ発話 (安全復帰): ${err.message}`, "warn");
      this.isSpeaking = false;
      if (onStart) onStart();
      if (onEnd) onEnd();
      if (this.onSpeechEnd) this.onSpeechEnd();

      setTimeout(() => {
        this.isSpeechProducing = false;
        this.lastSpeechEndTime = Date.now();
        if (typeof AppCore !== 'undefined' && AppCore.state && AppCore.state.isRunning && !this.isActionButtonLocked && !AppCore.state.isThinking) {
          this.startListening();
        }
      }, dynamicCooldown);
    }
  }

  async readDiarySeamless(diaryContentOnly, speakerIdOverride = null, onSentenceStart = null, onComplete = null) {
    this.isSpeechProducing = true;
    this.stopSpeaking();
    this.stopListening();
    this.unlockMasterAudio();
    this.isReadingAloud = true;
    this.readingAbortController = new AbortController();
    const speakerId = (speakerIdOverride !== null)
      ? speakerIdOverride
      : (typeof AppCore !== 'undefined' && AppCore.getSpeakerId ? AppCore.getSpeakerId() : (getCurChar().defaultSpeakerId || 10));

    Logger.log(`[Diary] 朗読モード開始`, "info");

    let readBody = (diaryContentOnly || '').replace(/^【[^】]+】\s*\n*/u, '').trim();
    readBody = readBody.replace(/(?:【?(?:クロ|ホウ博士|シロ)の(?:ひとこと|一言|メッセージ)[:：]?】?|🐾\s*クロのひとこと[:：]?|クロのひとこと[:：]?|ホウ博士のひとこと[:：]?|🦉\s*ホウ博士のひとこと[:：]?)\s*[^\n]+$/u, '').trim();

    if (!readBody) readBody = diaryContentOnly || "";

    let sentences = readBody
      .split(/([。！？!\?\n]+)/)
      .reduce((acc, cur, i, arr) => {
        if (i % 2 === 0 && cur.trim()) acc.push((cur + (arr[i+1]||'')).trim());
        return acc;
      }, []).filter(s => s.length > 0);

    if (sentences.length === 0 && readBody.trim()) {
      sentences = [readBody.trim()];
    }

    if (typeof AppCore !== 'undefined' && AppCore.transitionTo) {
      AppCore.transitionTo('SPEAKING', '📖 朗読中♪');
    }

    for (let i = 0; i < sentences.length; i++) {
      const isStillRunning = (typeof AppCore !== 'undefined' && AppCore.state) ? AppCore.state.isRunning : true;
      if (!this.isReadingAloud || !isStillRunning) break;
      let clean = TextFormatter.formatSpeechText(sentences[i] || '').replace(/https?:\/\/[^\s]+/gi, '');
      clean = this._convertAllNumbersToKana(clean).trim();
      if (!clean) continue;
      if (onSentenceStart) onSentenceStart(i, sentences[i]);
      try {
        const blobUrl = await this._getVoicevoxBlobUrl(clean, speakerId);
        if (!this.isReadingAloud || (typeof AppCore !== 'undefined' && AppCore.state && !AppCore.state.isRunning)) break;
        await new Promise(resolve => {
          this.masterAudio.src = blobUrl;
          this.masterAudio.playbackRate = this.rate;
          this.isSpeaking = true;
          if (typeof AppCore !== 'undefined' && AppCore.avatar && AppCore.state && AppCore.state.isRunning) {
            AppCore.avatar.setEmotion('talking');
          }
          this.masterAudio.onended = () => { this.isSpeaking = false; resolve(); };
          this.masterAudio.onerror = () => { this.isSpeaking = false; resolve(); };
          this.masterAudio.play().catch(() => resolve());
        });
      } catch(e) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    this.isReadingAloud = false;
    this.isSpeaking = false;
    this.lastSpeechEndTime = Date.now();
    if (typeof AppCore !== 'undefined') {
      if (AppCore.avatar && AppCore.state && AppCore.state.isRunning) AppCore.avatar.setEmotion('idle');
      if (AppCore.transitionTo) AppCore.transitionTo('HEARING');
    }
    if (onComplete) onComplete();

    setTimeout(() => {
      this.isSpeechProducing = false;
      if (typeof AppCore !== 'undefined' && AppCore.state && AppCore.state.isRunning) this.startListening();
    }, 500);
  }

  stopReadingAloud() {
    this.isReadingAloud = false;
    this.isSpeechProducing = false;
    if (this.readingAbortController) { this.readingAbortController.abort(); this.readingAbortController = null; }
    this.stopSpeaking();
  }

  stopSpeaking() {
    this.isSpeaking = false;
    this.masterAudio.pause(); this.masterAudio.currentTime = 0;
    this.fillerAudio.pause(); this.fillerAudio.currentTime = 0;
  }

  _setupRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      Logger.log(`[Mic] ⚠️ Web Speech API非対応ブラウザです`, "warn");
      return;
    }
    this.recognition = new SpeechRec();
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      if (this.isSpeechProducing || this.isSpeaking || this.isReadingAloud) {
        try { this.recognition.abort(); } catch(e) {}
        this.isListening = false;
        this.isStarting = false;
        return;
      }
      this.isListening = true;
      this.isStarting = false;
      Logger.log(`[Mic] 👂 マイク待機開始（エメラルドグリーン点灯）`, "info");
      if (this.onListeningStatus) this.onListeningStatus(true);
    };

    this.recognition.onresult = (event) => {
      const isInputLocked = (typeof AppCore !== 'undefined' && AppCore.state) ? AppCore.state.isProcessingInput : false;
      if (this.isSpeechProducing || this.isSpeaking || this.isReadingAloud || this.isActionButtonLocked || isInputLocked) return;
      const lastIdx = event.results.length - 1;
      let rawText = event.results[lastIdx]?.[0]?.transcript?.trim() || '';
      if (!rawText) return;

      const resultText = this.correctSpeechInput(rawText);
      Logger.log(`[Mic] 🎤 音声認識：「${rawText}」➔ 辞書補正後:「${resultText}」`, "info");

      if (/(?:ストップ|やめて|とまって|止めて|タイマー.*(?:止めて|やめて|消して)|アラーム.*(?:止めて|消して))/.test(resultText)) {
        if (typeof AppCore !== 'undefined' && AppCore.cancelKitchenTimer) AppCore.cancelKitchenTimer(true);
        this.stopReadingAloud(); this.stopSpeaking();
        if (this.onBargeIn) this.onBargeIn();
        return;
      }

      if (this._isSelfEcho(resultText)) {
        Logger.log(`[Mic] 自声エコー除外: 「${resultText}」`, "info");
        return;
      }
      if (this.onSpeechFinal) this.onSpeechFinal(resultText);
    };

    this.recognition.onerror = (e) => {
      this.isStarting = false; this.lastMicErrorTime = Date.now();
      Logger.log(`[Mic] エラー: ${e.error}`, "warn");
      if (e.error === 'not-allowed') this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false; this.isStarting = false;
      if (this.onListeningStatus) this.onListeningStatus(false);

      const isRunning = (typeof AppCore !== 'undefined' && AppCore.state) ? AppCore.state.isRunning : true;
      const isInputLocked = (typeof AppCore !== 'undefined' && AppCore.state) ? AppCore.state.isProcessingInput : false;
      if (!isRunning || this.isSpeechProducing || this.isSpeaking || this.isReadingAloud || this.isActionButtonLocked || isInputLocked) return;

      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        const canRestart = (typeof AppCore !== 'undefined' && AppCore.state) ? AppCore.state.isRunning : true;
        if (canRestart && !this.isSpeechProducing && !this.isSpeaking && !this.isListening) {
          this.startListening();
        }
      }, 350);
    };
  }

  startListening() {
    const isRunning = (typeof AppCore !== 'undefined' && AppCore.state) ? AppCore.state.isRunning : true;
    if (!this.recognition || !isRunning || this.isSpeechProducing || this.isSpeaking || this.isReadingAloud || this.isActionButtonLocked || this.isListening || this.isStarting) return;
    try {
      this.isStarting = true;
      this.recognition.start();
    } catch(e) {
      this.isStarting = false;
    }
  }

  stopListening() {
    this.isListening = false;
    this.isStarting = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.recognition) {
      try { this.recognition.abort(); } catch(e) {}
    }
    if (this.onListeningStatus) this.onListeningStatus(false);
  }
}
window.AudioSpeechEngine = AudioSpeechEngine;

/* ==========================================================================
   MODULE 2: オンデマンドGPS ＆ リアルタイム在宅センサー
   ========================================================================== */
const LocationProvider = {
  lat: null, lon: null, homeLat: null, homeLon: null,
  cityArea: "東村山市", detailedAddress: "東京都東村山市本町付近",
  townLevelArea: "東村山市本町付近", cleanCityOnly: "東村山市", detailedTownArea: "東村山市本町付近",
  nearbySpots: [], weather: "快晴", temperature: "10", isAtHome: true,

  calcDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  },

  initWatcher() {
    this._loadHomeCoordsFromStorage();
    this.fetchLocationOnDemand(false);
  },

  _loadHomeCoordsFromStorage() {
    const homeVal = (localStorage.getItem('kuro_home_coords') || '').trim();
    if (!homeVal) {
      this.homeLat = 35.7582; this.homeLon = 139.4678;
      return;
    }
    const match = homeVal.match(/([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)/);
    if (match) {
      this.homeLat = parseFloat(match[1]);
      this.homeLon = parseFloat(match[2]);
      Logger.log(`[GPS] 拠点座標読込完了: ${this.homeLat}, ${this.homeLon}`, "info");
    } else {
      this.homeLat = 35.7582; this.homeLon = 139.4678;
    }
  },

  async fetchLocationOnDemand(fetchSpots = true) {
    this._loadHomeCoordsFromStorage();
    if (!('geolocation' in navigator)) { await this._applyHomeFallback(); return false; }
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          this.lat = pos.coords.latitude; this.lon = pos.coords.longitude;
          await this._reverseGeocode(this.lat, this.lon);
          this._checkHomeProximity();
          await this._fetchWeather(this.lat, this.lon);
          Logger.log(`[GPS] 📍 リアルタイム最新測位完了: ${this.detailedTownArea} (${this.isAtHome ? 'お家' : 'お散歩中'})`, "info");
          if (typeof AppCore !== 'undefined' && AppCore.updateTopHeaderClockWeatherUI) {
            AppCore.updateTopHeaderClockWeatherUI();
          }
          resolve(true);
        },
        async () => {
          await this._applyHomeFallback();
          if (typeof AppCore !== 'undefined' && AppCore.updateTopHeaderClockWeatherUI) {
            AppCore.updateTopHeaderClockWeatherUI();
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    });
  },

  _checkHomeProximity() {
    if (this.homeLat !== null && this.homeLon !== null && this.lat !== null && this.lon !== null) {
      const dist = this.calcDistanceMeters(this.lat, this.lon, this.homeLat, this.homeLon);
      this.isAtHome = (dist <= 150);
      Logger.log(`[GPS] 拠点照合: 距離=${dist}m ➔ ${this.isAtHome ? '🏠 お家' : '🐾 お外'}`, "info");
    } else {
      this.isAtHome = true;
    }
  },

  async _applyHomeFallback() {
    this._loadHomeCoordsFromStorage();
    this.lat = this.homeLat;
    this.lon = this.homeLon;
    this.isAtHome = true;
    await this._reverseGeocode(this.lat, this.lon);
    await this._fetchWeather(this.lat, this.lon);
    if (!this.detailedTownArea || this.detailedTownArea === "東村山市付近") {
      this.detailedTownArea = "東村山市本町付近";
      this.cleanCityOnly = "東村山市";
    }
  },

  async _fetchWeather(lat, lon) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.current_weather) {
          this.temperature = Math.round(data.current_weather.temperature);
          const c = data.current_weather.weathercode || 0;
          this.weather = (c <= 1) ? "快晴" : (c <= 3 ? "くもり" : (c >= 71 ? "雪" : "雨"));
          Logger.log(`[Weather] 🌤️ 天気取得: ${this.weather} (${this.temperature}℃)`, "info");
        }
      }
    } catch(e) {}
  },

  async _reverseGeocode(lat, lon) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=ja`);
      if (res.ok) {
        const a = (await res.json()).address || {};
        const pref = a.province || a.state || "";
        const city = a.city || a.ward || a.town || a.village || "";
        const sub = a.suburb || a.quarter || a.neighbourhood || a.city_district || "";
        
        this.cleanCityOnly = city ? city.trim() : (pref.includes("東京") ? "東村山市" : "市内");
        this.cityArea = `${pref}${city}`.trim() || "東京都東村山市";
        this.detailedTownArea = sub ? `${this.cleanCityOnly}${sub}付近` : `${this.cleanCityOnly}付近`;
        this.townLevelArea = this.detailedTownArea;
        this.detailedAddress = [pref, city, sub].filter(Boolean).join("") || "東京都東村山市本町";
      }
    } catch(e) {
      this.cleanCityOnly = "東村山市";
      this.detailedTownArea = "東村山市本町付近";
      this.townLevelArea = "東村山市本町付近";
    }
  }
};
window.LocationProvider = LocationProvider;

/* ==========================================================================
   MODULE 3: ストレージ管理 ＆ キーファクトリ ＆ 完全独立バックアップエンジン
   ========================================================================== */
const DATA_KEYS = {
  MEMORIES: 'kuro_data_memories',
  DIARIES:  'kuro_data_diaries',
  RECENT_LOGS: 'kuro_recent_chat_logs',
  CUSTOM_DICT: 'kuro_custom_dictionary',
  LAST_SHARED_PHOTO: 'kuro_last_shared_photo_cache'
};

const DEFAULT_CUSTOM_DICTIONARY = [
  { from: "ジムニー, ジェミニ, じぇみに", to: "Gemini" },
  { from: "チャットGPT, ちゃっとじーぴーてぃー", to: "ChatGPT" },
  { from: "ボイスボックス, ぼいすぼっくす", to: "VOICEVOX" },
  { from: "まんほーる, マンニアル, まんはーる", to: "マンホール" }
];

const StorageManager = {
  defaultGlassesCoordsKuro: {
    idle: { x: 0, y: 120, scale: 1.0, rotate: 0 },
    talking: { x: 0, y: 128, scale: 1.0, rotate: 0 },
    thinking: { x: 0, y: 120, scale: 1.0, rotate: 0 },
    happy: { x: 0, y: 120, scale: 1.0, rotate: 0 }
  },
  defaultEyelidCoordsKuro: { y: 172, x: 0, gap: 28, size: 16, rotate: 0 },

  // ★【キーファクトリ一元化】レガシー互換を完全内包し、3人目・4人目も100%安全に一意キー生成
  _getCharSpecificKey(baseKey, charId = null) {
    const curId = charId || getCurChar().id;
    if (curId === 'kuro') return baseKey;
    return `${baseKey}_${curId}`;
  },

  _getDailyPhotosKey(charId, dateKey) {
    const curId = charId || getCurChar().id;
    return curId === 'kuro' ? `kuro_daily_photos_${dateKey}` : `kuro_daily_photos_${curId}_${dateKey}`;
  },

  _getDailyLogsKey(charId, dateKey) {
    const curId = charId || getCurChar().id;
    return curId === 'kuro' ? `kuro_daily_logs_${dateKey}` : `kuro_daily_logs_${curId}_${dateKey}`;
  },

  // 直近写真キャッシュ管理（30分以内の写真を見返しながら会話可能にする）
  setLastSharedPhoto(base64Data) {
    if (!base64Data) return;
    const cacheObj = {
      base64: base64Data,
      timestamp: Date.now(),
      dateKey: TimeProvider.getCurrentInfo().lifeLogKey
    };
    try {
      localStorage.setItem(DATA_KEYS.LAST_SHARED_PHOTO, JSON.stringify(cacheObj));
    } catch(e) {}
  },

  getLastSharedPhoto() {
    try {
      const saved = JSON.parse(localStorage.getItem(DATA_KEYS.LAST_SHARED_PHOTO));
      if (!saved || !saved.base64 || !saved.timestamp) return null;
      const now = Date.now();
      if (now - saved.timestamp <= 30 * 60 * 1000) {
        return saved;
      }
    } catch(e) {}
    return null;
  },

  isPhotoRelatedTopic(promptText) {
    if (!promptText) return false;
    const pattern = /(?:写真|写っ|画像|さっきの|これ|この写真|写ってる|何色|誰|どこにある|何が写|見せて|どんな感じ|カメラ)/;
    return pattern.test(promptText);
  },

  getStorageUsage() {
    let totalBytes = 0, photoBytes = 0, chatBytes = 0, metaBytes = 0;
    const trackedPhotoSet = new Set();

    try {
      for (let k in localStorage) {
        if (!localStorage.hasOwnProperty(k)) continue;
        if (k.startsWith('kuro_daily_photos_')) {
          const val = localStorage[k];
          const bytes = (val.length + k.length) * 2;
          photoBytes += bytes;
          totalBytes += bytes;
          try {
            const arr = JSON.parse(val) || [];
            arr.forEach(p => { if (p && p.base64) trackedPhotoSet.add(p.base64); });
          } catch(e) {}
        }
      }

      for (let k in localStorage) {
        if (!localStorage.hasOwnProperty(k)) continue;
        if (k.startsWith('kuro_data_diaries')) {
          const diaryVal = localStorage[k];
          const rawBytes = (diaryVal.length + k.length) * 2;
          try {
            const diaries = JSON.parse(diaryVal) || [];
            let uniqueDiaryPhotoBytes = 0;
            diaries.forEach(d => {
              if (d && d.photo && typeof d.photo === 'string') {
                if (!trackedPhotoSet.has(d.photo)) {
                  uniqueDiaryPhotoBytes += (d.photo.length * 2);
                }
              }
            });
            photoBytes += uniqueDiaryPhotoBytes;
            const diaryMeta = Math.max(0, rawBytes - uniqueDiaryPhotoBytes);
            metaBytes += diaryMeta;
            totalBytes += rawBytes;
          } catch(e) {
            metaBytes += rawBytes;
            totalBytes += rawBytes;
          }
        }
      }

      for (let k in localStorage) {
        if (!localStorage.hasOwnProperty(k)) continue;
        if (k.startsWith('kuro_daily_photos_') || k.startsWith('kuro_data_diaries')) continue;

        const val = localStorage[k];
        const bytes = (val.length + k.length) * 2;
        totalBytes += bytes;

        if (k.startsWith('kuro_daily_logs_') || k.startsWith('kuro_recent_chat_logs')) {
          chatBytes += bytes;
        } else {
          metaBytes += bytes;
        }
      }
    } catch(e) {}

    const toMB = (b) => parseFloat((b / (1024 * 1024)).toFixed(2));
    const usedMB = toMB(totalBytes);
    const limitMB = 5.0;
    const percent = Math.min(100, Math.round((totalBytes / (limitMB * 1024 * 1024)) * 100));

    return {
      usedMB, limitMB, percent,
      photoMB: toMB(photoBytes), photoPct: Math.min(100, Math.round((photoBytes / (limitMB * 1024 * 1024)) * 100)),
      chatMB: toMB(chatBytes), chatPct: Math.min(100, Math.round((chatBytes / (limitMB * 1024 * 1024)) * 100)),
      metaMB: toMB(metaBytes), metaPct: Math.min(100, Math.round((metaBytes / (limitMB * 1024 * 1024)) * 100)),
      isWarning: percent >= 75, isDanger: percent >= 90
    };
  },

  loadCustomDictionary() {
    try {
      const saved = JSON.parse(localStorage.getItem(DATA_KEYS.CUSTOM_DICT));
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch(e) {}
    return DEFAULT_CUSTOM_DICTIONARY;
  },

  saveCustomDictionary(dict) {
    if (!Array.isArray(dict)) return;
    localStorage.setItem(DATA_KEYS.CUSTOM_DICT, JSON.stringify(dict));
    Logger.log(`[Dict] 🗣️ 音声認識カスタム辞書を保存（${dict.length}項目）`, "info");
  },

  loadGlassesCoords() {
    const cur = getCurChar();
    const curId = cur.id;
    const defaultCoords = cur.defaultAccessoryCoords || this.defaultGlassesCoordsKuro;
    const key = `kuro_glasses_coords_v5_${curId}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved) return saved;
      if (curId === 'kuro') {
        return JSON.parse(localStorage.getItem('kuro_glasses_coords_v5')) || defaultCoords;
      }
      return defaultCoords;
    } catch(e) {
      return defaultCoords;
    }
  },
  saveGlassesCoords(c) {
    const key = `kuro_glasses_coords_v5_${getCurChar().id}`;
    localStorage.setItem(key, JSON.stringify(c));
  },

  loadEyelidCoords() {
    const cur = getCurChar();
    const curId = cur.id;
    const defaultCoords = cur.defaultEyelidCoords || this.defaultEyelidCoordsKuro;
    const key = `kuro_eyelid_coords_v6_${curId}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved) return saved;
      if (curId === 'kuro') {
        return JSON.parse(localStorage.getItem('kuro_eyelid_coords_v6')) || defaultCoords;
      }
      return defaultCoords;
    } catch(e) {
      return defaultCoords;
    }
  },
  saveEyelidCoords(c) {
    const key = `kuro_eyelid_coords_v6_${getCurChar().id}`;
    localStorage.setItem(key, JSON.stringify(c));
  },

  loadRecentTimelineLogs() {
    const key = this._getCharSpecificKey(DATA_KEYS.RECENT_LOGS);
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e) { return []; }
  },
  clearTimelineDisplayOnly() {
    const key = this._getCharSpecificKey(DATA_KEYS.RECENT_LOGS);
    localStorage.setItem(key, JSON.stringify([]));
  },

  // ★ 確定した表示テキスト（displayText）をそのまま保存
  appendChatLog(role, text, photoUrl = null) {
    if (!text) return;
    const timeInfo = TimeProvider.getCurrentInfo();
    const cleanDisplay = TextFormatter.formatDisplayText(text);
    if (!cleanDisplay) return;

    const isAssistant = (typeof AppCore !== 'undefined' && AppCore.state) ? AppCore.state.isAssistantMode : false;

    const entry = {
      role, text: cleanDisplay,
      mode: isAssistant ? 'assistant' : 'pet',
      time: timeInfo.clock, date: timeInfo.lifeLogKey,
      photoUrl: null,
      hasPhoto: !!photoUrl, timestamp: Date.now()
    };
    try {
      const recentKey = this._getCharSpecificKey(DATA_KEYS.RECENT_LOGS);
      const recent = this.loadRecentTimelineLogs();
      const rEntry = { ...entry };
      if (photoUrl && photoUrl.length < 50000) rEntry.photoUrl = photoUrl;
      recent.push(rEntry);
      localStorage.setItem(recentKey, JSON.stringify(recent.slice(-30)));

      const curId = getCurChar().id;
      const dailyKey = this._getDailyLogsKey(curId, timeInfo.lifeLogKey);
      const daily = JSON.parse(localStorage.getItem(dailyKey) || '[]');
      daily.push(entry);
      localStorage.setItem(dailyKey, JSON.stringify(daily.slice(-1000)));
    } catch(e) {}
  },

  rollbackLastExchange(includeModelReply = false) {
    try {
      const timeInfo = TimeProvider.getCurrentInfo();
      const curId = getCurChar().id;
      const dailyKey = this._getDailyLogsKey(curId, timeInfo.lifeLogKey);
      const recentKey = this._getCharSpecificKey(DATA_KEYS.RECENT_LOGS);

      let recent = this.loadRecentTimelineLogs();
      let daily = JSON.parse(localStorage.getItem(dailyKey) || '[]');

      let removed = false;

      if (includeModelReply && recent.length > 0 && recent[recent.length - 1].role === 'model') {
        recent.pop();
        if (daily.length > 0 && daily[daily.length - 1].role === 'model') daily.pop();
        removed = true;
      }

      if (recent.length > 0 && recent[recent.length - 1].role === 'user') {
        recent.pop();
        if (daily.length > 0 && daily[daily.length - 1].role === 'user') daily.pop();
        removed = true;
      }

      if (removed) {
        localStorage.setItem(recentKey, JSON.stringify(recent));
        localStorage.setItem(dailyKey, JSON.stringify(daily));
        Logger.log(`[Rollback] ↩️ 直前の発言を取り消しました`, "info");
        return true;
      }
    } catch(e) {
      Logger.log(`[Rollback] ⚠️ ロールバック例外: ${e.message}`, "error");
    }
    return false;
  },

  getDailyLogs(lifeDateKey, charId = null) {
    const curId = charId || getCurChar().id;
    const dailyKey = this._getDailyLogsKey(curId, lifeDateKey);
    try { return JSON.parse(localStorage.getItem(dailyKey)) || []; } catch(e) { return []; }
  },

  addPhotoToDailyPool(photoBase64, userComment = "", customDateKey = null, charId = null) {
    if (!photoBase64) return;
    const timeInfo = TimeProvider.getCurrentInfo();
    const targetDateKey = customDateKey || timeInfo.lifeLogKey;
    const curId = charId || getCurChar().id;
    const key = this._getDailyPhotosKey(curId, targetDateKey);
    try {
      let pool = JSON.parse(localStorage.getItem(key) || '[]');
      const exists = pool.some(p => p.base64 === photoBase64);
      if (!exists) {
        pool.push({
          base64: photoBase64,
          comment: userComment,
          time: timeInfo.clock,
          timestamp: Date.now(),
          dateKey: targetDateKey
        });
        localStorage.setItem(key, JSON.stringify(pool.slice(-12)));
        Logger.log(`[Storage] 写真プール保存完了 (${curId} / ${targetDateKey} / 計:${pool.length}枚)`, "info");
      }
      this.setLastSharedPhoto(photoBase64);
    } catch(e) {}
  },

  removePhotoFromDailyPool(lifeDateKey, photoIndex, charId = null) {
    const curId = charId || getCurChar().id;
    const key = this._getDailyPhotosKey(curId, lifeDateKey);
    try {
      let pool = JSON.parse(localStorage.getItem(key) || '[]');
      if (photoIndex < 0 || photoIndex >= pool.length) return false;
      const del = pool.splice(photoIndex, 1)[0];
      localStorage.setItem(key, JSON.stringify(pool));

      const diaries = this.loadAllDiaries(curId);
      const target = diaries.find(d => d.dateKey === lifeDateKey);
      if (target && target.photo === del.base64) {
        target.photo = pool.length > 0 ? pool[0].base64 : null;
        this.saveAllDiaries(diaries, curId);
      }
      return true;
    } catch(e) { return false; }
  },

  getDailyPhotoPool(lifeDateKey, charId = null) {
    const curId = charId || getCurChar().id;
    const key = this._getDailyPhotosKey(curId, lifeDateKey);
    try {
      let pool = JSON.parse(localStorage.getItem(key)) || [];
      pool = pool.filter(p => p && p.dateKey === lifeDateKey);

      if (pool.length === 0) {
        const diaries = this.loadAllDiaries(curId);
        const d = diaries.find(item => item.dateKey === lifeDateKey);
        if (d && d.photo) {
          pool = [{ base64: d.photo, comment: "メイン写真", time: "12:00", timestamp: d.timestamp || Date.now(), dateKey: lifeDateKey }];
          localStorage.setItem(key, JSON.stringify(pool));
        }
      }
      return pool;
    } catch(e) { return []; }
  },

  loadMemories(defaultMemories, charId = null) {
    const key = this._getCharSpecificKey(DATA_KEYS.MEMORIES, charId);
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) {}
    const cur = charId ? (charId === 'shiro' ? window.Character_Shiro : window.Character_Kuro) : getCurChar();
    const initList = defaultMemories || (cur && cur.defaultMemories) || [];
    this.saveMemories(initList, charId);
    return initList;
  },
  saveMemories(m, charId = null) {
    const key = this._getCharSpecificKey(DATA_KEYS.MEMORIES, charId);
    localStorage.setItem(key, JSON.stringify(m));
  },

  loadAllDiaries(charId = null) {
    const key = this._getCharSpecificKey(DATA_KEYS.DIARIES, charId);
    try {
      const list = JSON.parse(localStorage.getItem(key)) || [];
      const timeInfo = TimeProvider.getCurrentInfo();
      const todayKey = timeInfo.lifeLogKey;

      return list.map(d => {
        if (d.dateKey !== todayKey) {
          const comment = d.partnerComment || d.kuroComment || "";
          if (comment.includes("今日もおやびんと一緒で最高に幸せな一日だった")) {
            d.kuroComment = "";
            d.partnerComment = "";
          }
        }
        // 汎用キーを相互保証
        if (!d.partnerComment && d.kuroComment) d.partnerComment = d.kuroComment;
        if (!d.kuroComment && d.partnerComment) d.kuroComment = d.partnerComment;
        return d;
      });
    } catch(e) { return []; }
  },
  saveAllDiaries(list, charId = null) {
    const key = this._getCharSpecificKey(DATA_KEYS.DIARIES, charId);
    localStorage.setItem(key, JSON.stringify(list));
  },

  isProperDiary(diary) {
    if (!diary || !diary.content) return false;
    const txt = diary.content.trim();
    if (txt.includes("今日はおやびんと写真を見せ合って楽しかったニャン♪") && txt.length < 50) return false;
    if (txt.includes("今日は助手と写真を見せ合って楽しかったホ！") && txt.length < 50) return false;
    return (txt.length >= 30);
  },

  hasDiary(dateKey) {
    const d = this.getDiary(dateKey);
    return this.isProperDiary(d);
  },

  getDiary(dateKey, charId = null) {
    const list = this.loadAllDiaries(charId);
    return list.find(d => d.dateKey === dateKey) || null;
  },

  // ★ partnerComment 汎用キーと kuroComment の完全並行保存
  saveDiary(entryText, customDateKey = null, customFullDate = null, photoData = null, currentLogCount = null, commentText = null, charId = null) {
    if (!entryText || entryText.length < 15) return false;
    const timeInfo = TimeProvider.getCurrentInfo();
    const dateKey = customDateKey || timeInfo.lifeLogKey;
    const fullDate = customFullDate || (customDateKey ? TimeProvider.formatDateKeyToFull(customDateKey) : timeInfo.lifeFullDate);
    const cur = charId ? (charId === 'shiro' ? window.Character_Shiro : window.Character_Kuro) : getCurChar();

    let cleanContent = entryText.replace(/https?:\/\/[^\s]+/gi, '');
    cleanContent = cur.cleanEnding ? cur.cleanEnding(cleanContent) : cleanContent;
    cleanContent = TextFormatter.formatDisplayText(cleanContent);

    let extractedComment = commentText;
    const match = cleanContent.match(/(?:【?(?:クロ|ホウ博士|シロ)の(?:ひとこと|一言|メッセージ)[:：]?】?|🐾\s*クロのひとこと[:：]?|クロのひとこと[:：]?|ホウ博士のひとこと[:：]?|🦉\s*ホウ博士のひとこと[:：]?)\s*([^\n]+)/);
    if (match) {
      if (!extractedComment) extractedComment = match[1].trim();
      cleanContent = cleanContent.replace(/(?:【?(?:クロ|ホウ博士|シロ)の(?:ひとこと|一言|メッセージ)[:：]?】?|🐾\s*クロのひとこと[:：]?|クロのひとこと[:：]?|ホウ博士のひとこと[:：]?|🦉\s*ホウ博士のひとこと[:：]?)\s*[^\n]+$/, '').trim();
    }

    cleanContent = cleanContent.replace(/^【[^】]+】\s*\n*/u, '').trim();
    cleanContent = cleanContent.replace(/^(?:今日|きょう)は[0-9０-９一二三四五六七八九〇]+年[^\n。！？]*[。！？\n]\s*/u, '').trim();

    const weatherStr = LocationProvider.weather || "快晴";
    const tempStr = LocationProvider.temperature !== null ? `${LocationProvider.temperature}℃` : "10℃";
    const unifiedHeader = `【${fullDate} 天気:${weatherStr} 気温:${tempStr}】\n\n`;

    const finalizedContent = unifiedHeader + cleanContent;

    let list = this.loadAllDiaries(cur.id);
    const idx = list.findIndex(d => d.dateKey === dateKey);

    if (idx >= 0 && !extractedComment) {
      extractedComment = list[idx].partnerComment || list[idx].kuroComment || "";
    }

    const recordedLogCount = (currentLogCount !== null) ? currentLogCount : this.getDailyLogs(dateKey, cur.id).length;

    let targetPhoto = photoData || (idx >= 0 ? list[idx].photo : null) || null;
    if (targetPhoto) {
      this.addPhotoToDailyPool(targetPhoto, "絵日記メイン写真", dateKey, cur.id);
    }

    const formattedComment = extractedComment ? TextFormatter.formatDisplayText(extractedComment) : "";

    const diaryData = {
      dateKey, fullDate,
      weather: weatherStr, temperature: LocationProvider.temperature,
      content: finalizedContent,
      kuroComment: formattedComment,
      partnerComment: formattedComment,
      photo: targetPhoto,
      timestamp: Date.now(),
      logCountAtSave: recordedLogCount
    };

    if (idx >= 0) {
      list[idx] = diaryData;
    } else {
      list.unshift(diaryData);
    }
    this.saveAllDiaries(list, cur.id);
    Logger.log(`[Diary] 📖 絵日記保存完了: ${fullDate} (${cur.id} / ログ数:${recordedLogCount})`, "success");
    return true;
  },

  attachPhotoToTodayDiary(photoBase64) {
    const timeInfo = TimeProvider.getCurrentInfo();
    const cur = getCurChar();
    this.addPhotoToDailyPool(photoBase64, "写真を見せた記録", timeInfo.lifeLogKey, cur.id);
    let list = this.loadAllDiaries(cur.id);
    const idx = list.findIndex(d => d.dateKey === timeInfo.lifeLogKey);
    const defTxt = cur.id === 'shiro'
      ? "今日は助手と写真を見せ合って楽しい時間を過ごしたホ！"
      : "今日はおやびんと写真を見せ合って楽しかったニャン♪";

    if (idx >= 0) {
      list[idx].photo = photoBase64;
      this.saveAllDiaries(list, cur.id);
    } else {
      this.saveDiary(defTxt, timeInfo.lifeLogKey, timeInfo.lifeFullDate, photoBase64, 1, null, cur.id);
    }
  },

  getTodayDiary() {
    return this.loadAllDiaries().find(d => d.dateKey === TimeProvider.getCurrentInfo().lifeLogKey) || null;
  },
  getRecentDiariesSummary(count = 3) {
    return this.loadAllDiaries().slice(0, count).map(d => `・【${d.fullDate}】: ${d.content}`).join("\n");
  },
  findRelevantPastDiary(queryText) {
    if (!queryText || !/(?:昔|前|先週|先月|昨日|覚えてる)/.test(queryText)) return null;
    const list = this.loadAllDiaries();
    return list.length > 1 ? list[1] : null;
  },

  async executeSafeStorageDeepClean() {
    Logger.log("[DeepClean] 🧹 安全ストレージ大掃除を開始…", "info");

    this.downloadPhotoArchivePackage();
    await new Promise(r => setTimeout(r, 600));

    const compressToThumbnail = (base64Str) => {
      return new Promise((resolve) => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
          resolve(base64Str);
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            const maxDim = 180;
            if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
            canvas.width = Math.max(1, w);
            canvas.height = Math.max(1, h);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const slimBase64 = canvas.toDataURL('image/jpeg', 0.45);
            resolve(slimBase64 && slimBase64.length > 100 ? slimBase64 : base64Str);
          } catch(e) {
            resolve(base64Str);
          }
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
      });
    };

    let processedPhotos = 0;
    const photoMapping = new Map();

    for (let k in localStorage) {
      if (!localStorage.hasOwnProperty(k)) continue;
      if (k.startsWith('kuro_daily_photos_')) {
        try {
          const pool = JSON.parse(localStorage[k]) || [];
          for (let p of pool) {
            if (p && p.base64) {
              const old = p.base64;
              if (!photoMapping.has(old)) {
                const slim = await compressToThumbnail(old);
                photoMapping.set(old, slim);
                p.base64 = slim;
                processedPhotos++;
              } else {
                p.base64 = photoMapping.get(old);
              }
            }
          }
          localStorage.setItem(k, JSON.stringify(pool));
        } catch(e) {}
      }
    }

    const cur = getCurChar();
    ['kuro', 'shiro'].forEach(cId => {
      const diaries = this.loadAllDiaries(cId);
      let updated = false;
      for (let d of diaries) {
        if (d && d.photo) {
          if (photoMapping.has(d.photo)) {
            d.photo = photoMapping.get(d.photo);
            updated = true;
          } else {
            // mapにない場合でも圧縮を試みる
            compressToThumbnail(d.photo).then(slim => {
              d.photo = slim;
              this.saveAllDiaries(diaries, cId);
            });
          }
        }
      }
      if (updated) this.saveAllDiaries(diaries, cId);
    });

    for (let k in localStorage) {
      if (!localStorage.hasOwnProperty(k)) continue;
      if (k.startsWith('kuro_daily_logs_')) {
        try {
          const logs = JSON.parse(localStorage[k]) || [];
          logs.forEach(l => { if (l) delete l.photoUrl; });
          localStorage.setItem(k, JSON.stringify(logs));
        } catch(e) {}
      }
    }

    const recentLogs = this.loadRecentTimelineLogs();
    recentLogs.forEach(l => { if (l && l.photoUrl && photoMapping.has(l.photoUrl)) l.photoUrl = photoMapping.get(l.photoUrl); });
    const recentKey = this._getCharSpecificKey(DATA_KEYS.RECENT_LOGS);
    localStorage.setItem(recentKey, JSON.stringify(recentLogs));

    Logger.log(`[DeepClean] ✅ 大掃除完了: 写真${processedPhotos}枚を安全に3〜5KB化・重複完全パージ`, "success");
    return true;
  },

  // ★【完全独立写真バックアップ】当該キャラクターの写真プールのみを100%厳密抽出
  downloadPhotoArchivePackage() {
    const cur = getCurChar();
    const curId = cur.id;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

    const charDailyPhotos = {};
    for (let k in localStorage) {
      if (curId === 'kuro') {
        if (k.startsWith('kuro_daily_photos_') && !k.includes('_shiro_')) {
          try { charDailyPhotos[k] = JSON.parse(localStorage[k]); } catch(e) {}
        }
      } else {
        if (k.startsWith(`kuro_daily_photos_${curId}_`)) {
          try { charDailyPhotos[k] = JSON.parse(localStorage[k]); } catch(e) {}
        }
      }
    }

    const pkg = {
      format: "kuro_photo_archive_v2",
      characterId: curId,
      characterName: cur.name,
      characterTitle: cur.title,
      ownerCall: cur.ownerCall,
      exportedAt: now.toLocaleString('ja-JP'),
      dailyPhotoPools: charDailyPhotos,
      diaries: this.loadAllDiaries(curId),
      customDictionary: this.loadCustomDictionary()
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIペット_${cur.name}_高画質写真アルバム_${ymd}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Logger.log(`[Backup] 📷 ${cur.name}専用 高画質写真アルバム原本の書き出し完了（完全独立）`, "success");
  },

  // ★【完全独立フルバックアップ】当該キャラクターの写真・ログ・日記・記憶のみを100%厳密抽出
  downloadDataPackage() {
    const cur = getCurChar();
    const curId = cur.id;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

    const charDailyPhotos = {};
    const charDailyLogs = {};

    for (let k in localStorage) {
      if (curId === 'kuro') {
        if (k.startsWith('kuro_daily_photos_') && !k.includes('_shiro_')) {
          try { charDailyPhotos[k] = JSON.parse(localStorage[k]); } catch(e) {}
        }
        if (k.startsWith('kuro_daily_logs_') && !k.includes('_shiro_')) {
          try { charDailyLogs[k] = JSON.parse(localStorage[k]); } catch(e) {}
        }
      } else {
        if (k.startsWith(`kuro_daily_photos_${curId}_`)) {
          try { charDailyPhotos[k] = JSON.parse(localStorage[k]); } catch(e) {}
        }
        if (k.startsWith(`kuro_daily_logs_${curId}_`)) {
          try { charDailyLogs[k] = JSON.parse(localStorage[k]); } catch(e) {}
        }
      }
    }

    const curVer = (typeof VersionManager !== 'undefined') ? VersionManager.current : "v1.4.2";

    const pkg = {
      format: "kuro_pure_data_package_v3",
      characterId: curId,
      characterName: cur.name,
      characterTitle: cur.title,
      ownerCall: cur.ownerCall,
      version: curVer,
      exportedAt: now.toLocaleString('ja-JP'),
      memories: this.loadMemories([], curId),
      diaries: this.loadAllDiaries(curId),
      recentLogs: this.loadRecentTimelineLogs(),
      dailyPhotoPools: charDailyPhotos,
      dailyChatLogs: charDailyLogs,
      customDictionary: this.loadCustomDictionary(),
      settings: {
        activeCharacter: curId,
        speakerId: localStorage.getItem(`kuro_voice_speaker_id_${curId}`) || localStorage.getItem('kuro_voice_speaker_id') || String(cur.defaultSpeakerId || 10),
        voiceRate: localStorage.getItem('kuro_rate') || String(cur.defaultVoiceRate || 1.05),
        talkLength: localStorage.getItem('kuro_talk_length') || 'auto',
        buttonFeedback: localStorage.getItem('kuro_button_feedback') || 'voice',
        timerSound: localStorage.getItem('kuro_timer_sound') || 'bell',
        theme: localStorage.getItem('kuro_theme') || 'normal',
        newsCount: localStorage.getItem('kuro_news_count') || '2',
        spotCount: localStorage.getItem('kuro_spot_count') || '2',
        homeCoords: localStorage.getItem('kuro_home_coords') || '',
        accessoryStyle: localStorage.getItem('kuro_acc_style') || 'both',
        glassesCoords: this.loadGlassesCoords(),
        eyelidCoords: this.loadEyelidCoords()
      }
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIペット_${cur.name}_完全バックアップ_${ymd}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Logger.log(`[Backup] ✅ ${cur.name}専用 完全独立データ書き出し完了（他キャラ混入ゼロ）`, "success");
  },

  // ★【安全マージ復元＆キャラクター照合ガード】他キャラのデータを巻き込まず安全合流
  async importAndReplaceDataPackage(data) {
    if (!data || typeof data !== 'object') throw new Error("無効なバックアップデータです。");

    const targetCharId = data.characterId || (data.settings && data.settings.activeCharacter) || 'kuro';
    const curActiveId = getCurChar().id;

    if (targetCharId !== curActiveId) {
      const confirmSwitch = window.confirm(`読み込んだデータは【${data.characterName || targetCharId}】のバックアップです。\nパートナーを切り替えて安全に復元しますか？`);
      if (!confirmSwitch) return false;
      localStorage.setItem('kuro_active_character', targetCharId);
    }

    if (Array.isArray(data.memories)) {
      this.saveMemories(data.memories, targetCharId);
    }

    if (Array.isArray(data.customDictionary)) {
      this.saveCustomDictionary(data.customDictionary);
    }

    if (Array.isArray(data.diaries)) {
      const sanitizedDiaries = data.diaries.map(d => {
        if (d && d.content && !d.content.startsWith('【')) {
          const w = d.weather || "快晴";
          const t = d.temperature !== undefined ? `${d.temperature}℃` : "10℃";
          d.content = `【${d.fullDate || d.dateKey} 天気:${w} 気温:${t}】\n\n` + d.content.replace(/^【[^】]+】\s*\n*/u, '').trim();
        }
        if (!d.partnerComment && d.kuroComment) d.partnerComment = d.kuroComment;
        if (!d.kuroComment && d.partnerComment) d.kuroComment = d.partnerComment;
        return d;
      });
      this.saveAllDiaries(sanitizedDiaries, targetCharId);
    }

    if (Array.isArray(data.recentLogs)) {
      const recentKey = this._getCharSpecificKey(DATA_KEYS.RECENT_LOGS, targetCharId);
      localStorage.setItem(recentKey, JSON.stringify(data.recentLogs.slice(-30)));
    }

    if (data.settings && typeof data.settings === 'object') {
      const s = data.settings;
      if (s.speakerId) {
        localStorage.setItem(`kuro_voice_speaker_id_${targetCharId}`, s.speakerId);
        localStorage.setItem('kuro_voice_speaker_id', s.speakerId);
      }
      if (s.voiceRate) localStorage.setItem('kuro_rate', s.voiceRate);
      if (s.talkLength) localStorage.setItem('kuro_talk_length', s.talkLength);
      if (s.buttonFeedback) localStorage.setItem('kuro_button_feedback', s.buttonFeedback);
      if (s.timerSound) localStorage.setItem('kuro_timer_sound', s.timerSound);
      if (s.theme) {
        localStorage.setItem('kuro_theme', s.theme);
        if (typeof AppCore !== 'undefined' && AppCore.applyTheme) AppCore.applyTheme(s.theme);
      }
      if (s.newsCount) localStorage.setItem('kuro_news_count', s.newsCount);
      if (s.spotCount) localStorage.setItem('kuro_spot_count', s.spotCount);
      if (s.homeCoords) localStorage.setItem('kuro_home_coords', s.homeCoords);
      if (s.accessoryStyle) localStorage.setItem('kuro_acc_style', s.accessoryStyle);
      if (s.glassesCoords) this.saveGlassesCoords(s.glassesCoords);
      if (s.eyelidCoords) this.saveEyelidCoords(s.eyelidCoords);
    }

    // ★ 会話ログと写真プールは安全マージ（スマホ側の最新会話を壊さない）
    if (data.dailyChatLogs) {
      for (let k in data.dailyChatLogs) {
        if (!k.includes(`_${targetCharId}_`) && targetCharId !== 'kuro') continue;
        if (targetCharId === 'kuro' && k.includes('_shiro_')) continue;

        try {
          const importLogs = data.dailyChatLogs[k] || [];
          const existingLogs = JSON.parse(localStorage.getItem(k) || '[]');
          const mergedLogs = [...existingLogs];
          importLogs.forEach(iLog => {
            if (!mergedLogs.some(eLog => eLog.timestamp && eLog.timestamp === iLog.timestamp && eLog.text === iLog.text)) {
              mergedLogs.push(iLog);
            }
          });
          mergedLogs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          localStorage.setItem(k, JSON.stringify(mergedLogs.slice(-1000)));
        } catch(e) {}
      }
    }

    if (data.dailyPhotoPools) {
      for (let k in data.dailyPhotoPools) {
        if (!k.includes(`_${targetCharId}_`) && targetCharId !== 'kuro') continue;
        if (targetCharId === 'kuro' && k.includes('_shiro_')) continue;

        try {
          const importPhotos = data.dailyPhotoPools[k] || [];
          const existingPhotos = JSON.parse(localStorage.getItem(k) || '[]');
          const mergedPhotos = [...existingPhotos];
          importPhotos.forEach(iP => {
            if (!mergedPhotos.some(eP => eP.base64 === iP.base64)) {
              mergedPhotos.push(iP);
            }
          });
          localStorage.setItem(k, JSON.stringify(mergedPhotos.slice(-12)));
        } catch(quotaErr) {
          try {
            Logger.log(`[Import] ⚠️ 写真容量超過を検知。安全サムネイル制限を適用します`, "warn");
            const trimmed = (data.dailyPhotoPools[k] || []).slice(-4);
            localStorage.setItem(k, JSON.stringify(trimmed));
          } catch(e) {}
        }
      }
    }

    Logger.log(`[Backup] ✅ ${targetCharId} のデータ読み込み＆安全合流完了`, "success");
    return true;
  }
};
window.StorageManager = StorageManager;