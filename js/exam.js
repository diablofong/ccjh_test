/* exam.js — 考試邏輯 */

// ── 解碼 UTF-8 Base64 答案 ──
function decodeAnswer(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ── 答案正規化（比對前統一處理）──
function normalize(s) {
  return s
    .trim()
    .replace(/\s+/g, '')               // 移除空白
    .replace(/一/g, 'ㄧ')         // 數字「一」→ 注音ㄧ（容錯）
    .replace(/[，,]/g, '、')           // 統一頓號
    .toLowerCase();
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
  const total = exam.questions.length;
  list.innerHTML = '';

  exam.questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'question-item';
    item.id = `qi-${q.id}`;

    const qText = q.q.replace(/「___」/g,
      '<span style="color:var(--blue);font-weight:600">「　　　」</span>');

    item.innerHTML = `
      <div class="q-num">${q.id}.</div>
      <div class="q-body">
        <div class="q-text">${qText}</div>
        <input class="q-input" type="text" id="input-${q.id}"
               placeholder="填入答案" autocomplete="off"
               aria-label="第 ${q.id} 題答案">
        <div class="q-result" id="result-${q.id}"></div>
      </div>`;
    list.appendChild(item);
  });

  updateProgress(exam);
  // 即時更新進度
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
  let correct = 0, wrong = 0;

  exam.questions.forEach(q => {
    const input = document.getElementById(`input-${q.id}`);
    const resultEl = document.getElementById(`result-${q.id}`);
    const item = document.getElementById(`qi-${q.id}`);
    const userVal = input.value;
    const isOk = checkAnswer(userVal, q.a);
    const correctText = decodeAnswer(q.a);

    input.disabled = true;

    if (isOk) {
      correct++;
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
  const score = correct;
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
