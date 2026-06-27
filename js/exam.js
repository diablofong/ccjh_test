/* exam.js — 考試邏輯 */

// ── 解碼 UTF-8 Base64 答案 ──
function decodeAnswer(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ── Fisher-Yates 洗牌（回傳副本，不修改原陣列）──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 判斷是否為注音答案 ──
function isZhuyin(str) {
  return /[ㄅ-ㄩ]/.test(str);
}

// ── 選擇題：點選按鈕 ──
function selectMC(btn, qId, val) {
  const container = btn.closest('.mc-options');
  container.querySelectorAll('.mc-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('input-' + qId).value = val;
  // 觸發進度更新（直接讀全域 exam）
  if (window._currentExam) updateProgress(window._currentExam);
}

// ── 答案正規化（比對前統一處理）──
function normalize(s) {
  return s
    .trim()
    .replace(/\s+/g, '')               // 移除空白
    .replace(/一/g, 'ㄧ')             // 數字「一」→ 注音ㄧ（容錯）
    .replace(/[，,]/g, '、')           // 統一頓號
    // 是非題容錯：O/o/○ → ○；X/x/× → ×
    .replace(/^[Oo]$/, '○')
    .replace(/^[Xx×✗]$/, '×')
    // 選擇題容錯：全形 → 半形大寫
    .replace(/^[Ａａ]$/, 'A')
    .replace(/^[Ｂｂ]$/, 'B')
    .replace(/^[Ｃｃ]$/, 'C')
    .replace(/^[Ｄｄ]$/, 'D')
    .toUpperCase();
}

// ── 比對答案（支援多答案「、」分隔）──
function checkAnswer(userInput, correctB64) {
  const correct = decodeAnswer(correctB64);
  const userNorm = normalize(userInput);
  const correctNorm = normalize(correct);
  if (userNorm === correctNorm) return true;
  // 若答案含「、」，任一分支命中即算對
  if (correctNorm.includes('、')) {
    const parts = correctNorm.split('、');
    if (parts.some(p => userNorm === p.trim())) return true;
  }
  return false;
}

// ── 初始化考試 ──
function initExam() {
  const params = new URLSearchParams(location.search);
  const key = params.get('exam');
  if (!key || !EXAMS[key]) {
    document.body.innerHTML = '<p style="padding:2rem;color:red">找不到題卷，請回首頁重選。</p>';
    return;
  }
  const exam = EXAMS[key];
  window._currentExam = exam;
  document.title = exam.title + ' — 屏縣公正國中';
  document.getElementById('exam-title').textContent = exam.title;
  document.getElementById('exam-title-main').textContent = exam.title;
  document.getElementById('exam-instructions').textContent = exam.instructions;

  renderQuestions(exam);

  document.getElementById('btn-submit').addEventListener('click', () => submitExam(exam));
  document.getElementById('btn-retry').addEventListener('click', () => location.reload());
}

// ── 渲染題目 ──
function renderQuestions(exam) {
  const list = document.getElementById('questions-list');
  list.innerHTML = '';

  // 收集所有注音答案作為干擾選項候選池
  const zhuyinPool = [];
  exam.questions.forEach(q => {
    const ans = decodeAnswer(q.a);
    if (isZhuyin(ans) && !zhuyinPool.includes(ans)) zhuyinPool.push(ans);
  });

  // 隨機排列題目（副本，不動原陣列）
  const ordered = shuffle(exam.questions);

  ordered.forEach((q) => {
    const item = document.createElement('div');
    item.className = 'question-item';
    item.id = `qi-${q.id}`;

    // 填空題：標示 「___」
    let qHtml = q.q
      .replace(/「___」/g, '<span style="color:var(--blue);font-weight:600">「　　　」</span>');
    // 多行題目（健康教育選擇題含 \n）
    qHtml = qHtml.replace(/\n/g, '<br>');

    const correctAns = decodeAnswer(q.a);

    if (isZhuyin(correctAns)) {
      // 注音答案 → 選擇按鈕
      const distractors = shuffle(zhuyinPool.filter(a => a !== correctAns)).slice(0, 3);
      const options = shuffle([correctAns, ...distractors]);
      const labels = ['A', 'B', 'C', 'D'];
      const btnHtml = options.map((opt, i) =>
        `<button class="mc-btn" onclick="selectMC(this, ${q.id}, '${opt.replace(/'/g, "\\'")}')">` +
        `${labels[i]}. ${opt}</button>`
      ).join('');

      item.innerHTML = `
        <div class="q-num">${q.id}.</div>
        <div class="q-body">
          <div class="q-text">${qHtml}</div>
          <input type="hidden" id="input-${q.id}" value="">
          <div class="mc-options">${btnHtml}</div>
          <div class="q-result" id="result-${q.id}"></div>
        </div>`;
    } else {
      // 一般填空題
      const placeholder = q.hint || '填入答案';
      item.innerHTML = `
        <div class="q-num">${q.id}.</div>
        <div class="q-body">
          <div class="q-text">${qHtml}</div>
          <input class="q-input" type="text" id="input-${q.id}"
                 placeholder="${placeholder}" autocomplete="off"
                 aria-label="第 ${q.id} 題答案">
          <div class="q-result" id="result-${q.id}"></div>
        </div>`;
    }
    list.appendChild(item);
  });

  updateProgress(exam);
  // 即時更新進度（文字輸入框）
  list.querySelectorAll('.q-input').forEach(inp => {
    inp.addEventListener('input', () => updateProgress(exam));
  });
}

// ── 進度條 ──
function updateProgress(exam) {
  const answered = exam.questions.filter(
    q => document.getElementById(`input-${q.id}`)?.value.trim()
  ).length;
  const total = exam.questions.length;
  const pct = Math.round(answered / total * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent =
    `已作答 ${answered} / ${total} 題`;
}

// ── 提交評分 ──
function submitExam(exam) {
  let correct = 0, wrong = 0, score = 0;

  exam.questions.forEach(q => {
    const input = document.getElementById(`input-${q.id}`);
    const resultEl = document.getElementById(`result-${q.id}`);
    const item = document.getElementById(`qi-${q.id}`);
    const userVal = input.value;
    const isOk = checkAnswer(userVal, q.a);
    const correctText = decodeAnswer(q.a);

    input.disabled = true;
    // 注音選擇題：禁用按鈕
    document.getElementById(`qi-${q.id}`)
      ?.querySelectorAll('.mc-btn')
      .forEach(b => { b.disabled = true; });

    if (isOk) {
      correct++;
      score += (q.s || 1);
      item.classList.add('correct');
      resultEl.innerHTML = `<span class="ok-label">✓ 正確</span>`;
    } else {
      wrong++;
      item.classList.add('wrong');
      const userDisplay = userVal.trim() || '（未作答）';
      resultEl.innerHTML =
        `<span class="user-ans">✗ 你的答案：${userDisplay}</span>` +
        `　<span class="correct-ans">正確答案：${correctText}</span>`;
    }
    resultEl.classList.add('visible');
  });

  // 顯示成績面板
  const total = exam.totalScore || exam.questions.length;
  const pct = Math.round(score / total * 100);

  const panel = document.getElementById('score-panel');
  panel.querySelector('.score-big').textContent = score;
  panel.querySelector('.score-total').textContent = `/ ${total} 分`;
  const pctEl = panel.querySelector('.score-pct');
  pctEl.textContent = `得分率 ${pct}%`;
  pctEl.className = 'score-pct ' + (pct >= 60 ? 'pass' : 'fail');
  panel.querySelector('.correct-count').textContent = `✓ 答對 ${correct} 題`;
  panel.querySelector('.wrong-count').textContent = `✗ 答錯 ${wrong} 題`;
  panel.classList.add('visible');

  document.getElementById('btn-submit').style.display = 'none';
  document.getElementById('btn-retry').style.display = 'inline-block';

  // 捲動到成績區
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('DOMContentLoaded', initExam);
