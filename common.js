// ====== カード定義（id と固定の「全札前提の決まり字」）======
const CARDS = [
  {id:87, s:"む"},{id:18, s:"す"},{id:57, s:"め"},{id:22, s:"ふ"},{id:70, s:"さ"},{id:81, s:"ほ"},{id:77, s:"せ"},
  {id:74, s:"うか"},{id:65, s:"うら"},{id:23, s:"つき"},{id:13, s:"つく"},{id:40, s:"しの"},{id:37, s:"しら"},{id:100, s:"もも"},{id:66, s:"もろ"},{id:71, s:"ゆう"},{id:46, s:"ゆら"},
  {id:61, s:"いに"},{id:21, s:"いまこ"},{id:63, s:"いまは"},{id:75, s:"ちぎりお"},{id:42, s:"ちぎりき"},{id:17, s:"ちは"},
  {id:33, s:"ひさ"},{id:35, s:"ひとは"},{id:99, s:"ひとも"},{id:50, s:"きみがためお"},{id:15, s:"きみがためは"},{id:91, s:"きり"},
  {id:96, s:"はなさ"},{id:9, s:"はなの"},{id:2, s:"はるす"},{id:67, s:"はるの"},{id:47, s:"やえ"},{id:59, s:"やす"},{id:32, s:"やまが"},{id:28, s:"やまざ"},
  {id:93, s:"よのなかは"},{id:83, s:"よのなかよ"},{id:85, s:"よも"},{id:62, s:"よを"},{id:51, s:"かく"},{id:6, s:"かさ"},{id:98, s:"かぜそ"},{id:48, s:"かぜを"},
  {id:49, s:"みかき"},{id:27, s:"みかの"},{id:90, s:"みせ"},{id:14, s:"みち"},{id:94, s:"みよ"},
  {id:73, s:"たか"},{id:55, s:"たき"},{id:4, s:"たご"},{id:16, s:"たち"},{id:89, s:"たま"},{id:34, s:"たれ"},
  {id:41, s:"こい"},{id:29, s:"こころあ"},{id:68, s:"こころに"},{id:97, s:"こぬ"},{id:24, s:"この"},{id:10, s:"これ"},
  {id:60, s:"おおえ"},{id:95, s:"おおけ"},{id:44, s:"おおこ"},{id:5, s:"おく"},{id:26, s:"おぐ"},{id:72, s:"おと"},{id:82, s:"おも"},
  {id:8, s:"わがい"},{id:92, s:"わがそ"},{id:38, s:"わすら"},{id:54, s:"わすれ"},{id:76, s:"わたのはらこ"},{id:11, s:"わたのはらや"},{id:20, s:"わび"},
  {id:80, s:"ながか"},{id:84, s:"ながら"},{id:53, s:"なげき"},{id:86, s:"なげけ"},{id:36, s:"なつ"},{id:25, s:"なにし"},{id:88, s:"なにわえ"},{id:19, s:"なにわが"},
  {id:43, s:"あい"},{id:79, s:"あきか"},{id:1, s:"あきの"},{id:52, s:"あけ"},{id:39, s:"あさじ"},{id:31, s:"あさぼらけあ"},{id:64, s:"あさぼらけう"},
  {id:3, s:"あし"},{id:12, s:"あまつ"},{id:7, s:"あまの"},{id:56, s:"あらざ"},{id:69, s:"あらし"},{id:30, s:"ありあ"},{id:58, s:"ありま"},{id:78, s:"あわじ"},{id:45, s:"あわれ"}
];

// ====== 文字単位ユーティリティ（UTF-8/16のサロゲート対策に Array.from を使う）======
const toChars = (s) => Array.from(s); // code point 単位
const lcpChars = (a, b) => {
  const ca = toChars(a), cb = toChars(b);
  const n = Math.min(ca.length, cb.length);
  let i = 0;
  while (i < n && ca[i] === cb[i]) i++;
  return i;
};
const prefixChars = (s, k) => {
  const cs = toChars(s);
  if (k > cs.length) k = cs.length;
  return cs.slice(0, k).join("");
};

// ====== 状態 ======
let remaining = [];               // 残り札（Card配列）
let id2s = new Map();             // id -> s
let history = new Map();          // id -> { changedAtRead: boolean, correct: boolean }
let reads = [];                   // シャッフル済みの 1..100
let idx = 0;                      // 現在の出題インデックス
let awaitingNext = false; // 「答える」後に手動で次へ進む待機中かどうか
let nextTimer = null;     // 自動遷移タイマーID
let advanced = false;     // この設問で既に進んだかのガード
let listMode = "initial";

// 共通：次へ進む
const advanceToNext = () => {
  // 追加：二重進行防止
  if (advanced) return;
  advanced = true;

  // 追加：手動進行時は保留中タイマーを無効化
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }    
  if (idx >= reads.length) return;
  
  removeById(currentId());
  idx++;
  inputEl.disabled = false;     // 次の問題で入力可能に戻す
  awaitingNext = false;
  skipBtn.textContent = "スキップ";
  showQuestion();
};

// ====== DOM ======
const qidEl = document.getElementById("qid");
const resultEl = document.getElementById("result");
const progressTextEl = document.getElementById("progressText");
const barEl = document.getElementById("bar");
const remainEl = document.getElementById("remain");
const statusPill = document.getElementById("statusPill");
const formEl = document.getElementById("answerForm");
const inputEl = document.getElementById("answerInput");
const resetBtn = document.getElementById("resetBtn");
const skipBtn = document.getElementById("skipBtn");
const listEl = document.getElementById("list");
const imgEl = document.getElementById("cardImg");
const toggleOrderBtn = document.getElementById("toggleOrderBtn");

const updateToggleLabel = () => {
  if (!toggleOrderBtn) return;
  if (listMode === "initial") {
    //toggleOrderBtn.textContent = "並び替え";
    toggleOrderBtn.title = "読み上げ順に並び替え";
  } else {
    //toggleOrderBtn.textContent = "並び替え";
    toggleOrderBtn.title = "決まり字順に並び替え";
  }
};


// ====== ヘルパ ======
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const expectedPrefix = (s) => {
  let maxL = 0;
  for (const t of remaining) {
    if (t.s === s) continue;
    const l = lcpChars(s, t.s);
    if (l > maxL) maxL = l;
  }
  const need = Math.min(toChars(s).length, maxL + 1);
  return prefixChars(s, need);
};

const removeById = (id) => {
  const k = remaining.findIndex(c => c.id === id);
  if (k >= 0) remaining.splice(k, 1);
};

const currentId = () => reads[idx];
const curS = () => id2s.get(currentId());

const updateProgress = () => {
  progressTextEl.textContent = `${idx} / 100`;
  const pct = (idx / 100) * 100;
  barEl.style.width = `${pct}%`;
  remainEl.textContent = remaining.length.toString();
};


const renderList = () => {
  const remIds = new Set(remaining.map(c => c.id));

  // 並び順のソースを分岐
  let items;
  if (listMode === "initial") {
    // 初期状態：全100枚（既存順）
    items = CARDS.slice();
  } else {
    // 読み上げ順：既読だけ（reads の先頭 idx 件）
    // ※ reads は提示順、idx は既に読み上げ済みの枚数
    const readIds = reads.slice(0, idx);
    items = readIds.map(id => CARDS.find(c => c.id === id)).filter(Boolean);
  }

  const rows = items.map(c => {
    let cls = "", label = "";

    if (remIds.has(c.id)) {
      // 未読：今この瞬間に変化しているか
      const changedNow = (expectedPrefix(c.s) !== c.s);
      cls   = changedNow ? "unread-changed" : "unread-stable";
      label = changedNow ? "未読・変化中" : "未読・不変";
    } else {
      // 既読：出題時の状態＋正誤
      const h = history.get(c.id);
      if (!h) {
        cls = "unread-stable";
        label = "既読・不明";
      } else {
        const part1 = h.changedAtRead ? "changed" : "stable";
        const part2 = h.correct ? "ok" : "ng";
        cls = `read-${part1}-${part2}`;
        label = `${h.changedAtRead ? "変化" : "不変"}・${h.correct ? "正解" : "誤答"}`;
      }
    }

    const idStr = String(c.id).padStart(3, "0");
    return `<div class="list-row ${cls}" title="${label}">
              <span><span class="mono">#${idStr}</span>：${c.s}</span>
              <span class="lab">${label}</span>
            </div>`;
  }).join("");

  listEl.innerHTML = rows;
};



const showQuestion = () => {
  advanced = false;
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  skipBtn.textContent = "スキップ";
  
  if (idx >= reads.length) {
    qidEl.textContent = "終了";
    statusPill.textContent = "完了";
    resultEl.innerHTML = `<span class="ok">お疲れさまでした！</span> 全問終了です。`;
    inputEl.disabled = true;
    if (imgEl) { imgEl.removeAttribute("src"); imgEl.alt = ""; imgEl.style.visibility = "hidden"; }
    updateProgress();
    renderList();
    return;
  }

  const id = String(currentId());
  qidEl.textContent = id;
  statusPill.textContent = "出題中";
  resultEl.textContent = "";
  inputEl.value = "";
  inputEl.focus();
  updateProgress();

  // ▼ 画像切り替え（同階層の id.png を表示）
  if (imgEl) {
    imgEl.style.visibility = "hidden";
    imgEl.onload = () => { imgEl.style.visibility = "visible"; };
    imgEl.onerror = () => {
      imgEl.style.visibility = "visible";
      imgEl.alt = `画像が見つかりません（${id}.png）`;
    };
    imgEl.src = `./cards/${id}.png`;
    imgEl.alt = `札画像 ${id}.png`;
  }
  renderList();
};

// ====== 追加：自動で次へ進むまでの待ち時間（ミリ秒）。0にすると自動で進まない ======
const AUTO_NEXT_MS = 3500;

// submitAnswer（判定を表示→少し待ってから次へ）
const submitAnswer = () => {
  if (idx >= reads.length) return;
  if (inputEl.disabled) return; // 既に判定済みで待機中なら無視

  const s = curS();
  if (!s) {
    resultEl.innerHTML = `<span class="ng">データ不整合</span>：このIDの札が見つかりません`;
    return;
  }

  const expect = expectedPrefix(s);
  const user = inputEl.value.trim();
  const correct = (user === expect);
  const changedAtRead = (expect !== s);
  
  if (correct) {
    resultEl.innerHTML = `<span class="ok">OK</span>`;
    statusPill.textContent = "判定：正解";
  } else {
    resultEl.innerHTML = `<span class="ng">NG</span>：正解は <b class="mono">${expect}</b>`;
    statusPill.textContent = "判定：不正解";
  }
  history.set(currentId(), { changedAtRead, correct });


  // 判定中は入力をロック
  inputEl.disabled = true;

  if (AUTO_NEXT_MS > 0) {
    // 自動で次へ
    nextTimer = setTimeout(advanceToNext, AUTO_NEXT_MS);
  } else {
    // 手動で次へ（ボタン表示だけ変えて待機）
    awaitingNext = true;
    skipBtn.textContent = "次へ";
  }
};

const skipQuestion = () => {
  if (idx >= reads.length) return;
  const s = curS();
  const changedAtRead = (expectedPrefix(s) !== s);
  history.set(currentId(), { changedAtRead, correct: false }); // スキップ＝誤答扱い
  advanceToNext();
};


const resetAll = () => {
  remaining = CARDS.slice();
  id2s = new Map(CARDS.map(c => [c.id, c.s]));
  reads = shuffle(Array.from({length:100}, (_,i)=>i+1));
  idx = 0;

  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  advanced = false;
  awaitingNext = false;
  history.clear();
  
  inputEl.disabled = false;
  statusPill.textContent = "準備完了";
  skipBtn.textContent = "スキップ";
  updateProgress();
  showQuestion();
};


// ====== イベント ======
formEl.addEventListener("submit", (e) => { e.preventDefault(); submitAnswer(); });
resetBtn.addEventListener("click", resetAll);
skipBtn.addEventListener("click", skipQuestion);
toggleOrderBtn.addEventListener("click", () => {
  listMode = (listMode === "initial") ? "read" : "initial";
  updateToggleLabel();
  renderList();
});


// ====== 起動 ======
updateToggleLabel();
renderList();
resetAll();
