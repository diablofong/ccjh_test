# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概要

屏縣公正國中第三次段考線上練習網站。純靜態 HTML/CSS/JS，部署於 GitHub Pages，無任何建置步驟。

- **線上網址：** https://diablofong.github.io/ccjh_test/
- **部署方式：** `git push` 後 GitHub Pages 自動更新（約 1–2 分鐘生效）

## 檔案結構與職責

```
index.html        首頁：讀取 EXAMS 物件動態渲染題卷卡片
exam.html         作答頁：URL 參數 ?exam=KEY 決定載入哪份題卷
js/questions.js   題庫資料（EXAMS 全域物件）
js/exam.js        作答邏輯（渲染、計分、容錯比對）
css/style.css     全站樣式
```

## 題庫資料格式（questions.js）

`EXAMS` 物件，每科一個 key，結構如下：

```js
EXAMS[key] = {
  title: '題卷標題',
  totalScore: 100,           // 滿分（≠ 題數時表示每題不止 1 分）
  type: 'fill',
  instructions: '作答說明',
  questions: [
    { id: 1, q: "題目文字", a: "<UTF-8 Base64>", s: 1, hint: "佔位提示" }
  ]
}
```

- `a`：答案以 UTF-8 Base64 編碼，解碼：`new TextDecoder().decode(Uint8Array.from(atob(b64), c=>c.charCodeAt(0)))`
- `s`：該題配分（健康教育每題 2 分，其餘均為 1 分）
- `totalScore`：等於所有 `s` 加總

**目前六科 key：** `chinese_zhuyin`、`chinese_zhushi`、`geography`、`civics`、`history`、`health`

## 核心渲染邏輯（exam.js）

題目渲染時，根據解碼後的答案自動判斷題型：

- **注音答案**（含 ㄅ–ㄩ）→ 隨機抽 3 個干擾選項，渲染為選擇按鈕（`mc-btn`）；選取後值寫入 `input[type=hidden]`
- **其他答案**（國字、○×、A/B/C/D）→ 渲染為 `input.q-input[type=text]`

題目順序每次載入用 Fisher-Yates 隨機洗牌（`shuffle()`），確保每次作答順序不同。

計分時對每題加總 `q.s`（而非固定 +1），支援不同配分題卷。

## 答案容錯規則（normalize 函數）

比對前統一正規化：
- 數字「一」→ 注音 ㄧ
- O/o/○ → ○；X/x/× → ×
- 全形 Ａ/ａ → A（其餘 B/C/D 同理）
- 多答案以「、」分隔，任一命中即算對

## 新增科目流程

1. 在 `js/questions.js` 的 `EXAMS` 物件新增一個 key，依格式填入題目
2. 在 `index.html` 的 `META` 物件新增對應的 badge 樣式、科目名稱、說明文字
3. `git add js/questions.js index.html && git push`

## 注意事項

- 答案**不可明文儲存**，必須先 UTF-8 Base64 編碼再寫入 `a` 欄位
- 題目生成腳本 `gen_questions.py` 存於 scratchpad（非 repo 內），執行：`uv run python gen_questions.py`
- `totalScore` 必須等於所有 `q.s` 加總，否則計分百分比會錯
