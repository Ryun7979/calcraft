// 聖域（入力の正確さ）の自動チェック。マシマシモードのプレイ画面で、ブラウザのコンソール（または自動操作ツール）から実行する。
//   await window.__calcraftAutoplay({ wrongEvery: 4, bufferEvery: 3 })
// - 問題を画面から読んで正しい答えを入力する（wrongEvery 問ごとにわざとまちがえる）
// - bufferEvery 問ごとに、正解・不正解の表示中に次の答えの「1」を先に打ち、次の問題の入力欄に残るか確かめる
// - 50ms ごとに入力欄の中心の要素を調べ、演出が入力欄をふさいでいないか確かめる
// 結果: { answered, expectCorrect, judgedCorrect, bufferChecks, bufferFails, blockedSamples, samples, ok }
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const typeInto = (el, text) => {
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const enter = (el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  const readQuestion = () => {
    const q = document.querySelector('[data-testid=hype-question]');
    if (!q) return null;
    const [a, op, b] = [...q.querySelectorAll('span')].map((s) => s.textContent.trim());
    const x = Number(a), y = Number(b);
    // 同じ式が続けて出ることがあるので、文字ではなく要素（問題ごとに作り直される）で見分ける
    if (op === '+') return { key: q, ans: x + y };
    if (op === '-') return { key: q, ans: x - y };
    if (op === '×') return { key: q, ans: x * y };
    return { key: q, ans: Math.floor(x / y), rem: x % y };
  };

  window.__calcraftAutoplay = async ({ wrongEvery = 0, bufferEvery = 0, timeoutMs = 120000 } = {}) => {
    const res = { answered: 0, expectCorrect: 0, judgedCorrect: 0, bufferChecks: 0, bufferFails: 0, blockedSamples: 0, samples: 0, log: [] };
    const watch = setInterval(() => {
      const el = document.querySelector('[data-testid=hype-answer]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      res.samples++;
      if (hit !== el) res.blockedSamples++;
    }, 50);
    const t0 = Date.now();
    let lastKey = null;
    let buffered = null;
    try {
      while (Date.now() - t0 < timeoutMs) {
        if (document.body.textContent.includes('もういちど！（Enter）')) break;
        const input = document.querySelector('[data-testid=hype-answer]');
        const q = readQuestion();
        if (!input || !q || input.readOnly || q.key === lastKey) {
          await sleep(30);
          continue;
        }
        // 先に打った数字が残っているか
        if (buffered !== null) {
          res.bufferChecks++;
          if (input.value !== buffered) {
            res.bufferFails++;
            res.log.push(`buffer: expected "${buffered}" got "${input.value}"`);
          }
          buffered = null;
        }
        lastKey = q.key;
        const n = res.answered + 1;
        const wrong = wrongEvery > 0 && n % wrongEvery === 0;
        const ans = wrong ? q.ans + 1 : q.ans;
        typeInto(input, String(ans));
        await sleep(20);
        const rem = document.querySelector('[data-testid=hype-remainder]');
        if (rem) {
          enter(input);
          typeInto(rem, String(q.rem));
          await sleep(20);
          enter(rem);
        } else {
          enter(input);
        }
        await sleep(60);
        // 受け付けられた（正解・不正解の表示中で読み取り専用になった）ものだけ数える。
        // チャレンジの時間切れと同時に押した答えは数えない
        if (!input.readOnly) continue;
        res.answered++;
        if (!wrong) res.expectCorrect++;
        if (bufferEvery > 0 && n % bufferEvery === 0 && input.readOnly) {
          // 表示中に「1」を打つ（入力欄にフォーカスがある状態の keydown）
          input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
          buffered = '1';
        }
      }
      // 結果画面の「○ ばっちり！」の数（＝判定が正解だった数）
      await sleep(300);
      res.judgedCorrect = (document.body.textContent.match(/○ ばっちり！/g) || []).length;
    } finally {
      clearInterval(watch);
    }
    res.ok = res.bufferFails === 0 && res.blockedSamples === 0 && res.judgedCorrect === res.expectCorrect;
    return res;
  };
})();
