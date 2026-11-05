# 元捷官方網站 Agent 工作規則

完整維運規則、開發文件和備份位於私人 repository：`lijie5868-create/yuanjie-official-website-backup`。開始工作前先以有權限的帳號取得私人庫，閱讀其中的 `AGENTS.md`、`docs/DEVELOPMENT.md` 和 `docs/NEW-COMPUTER-HANDOFF.md`。

## 真實來源

- 正式網址：`https://lijie5867.com/`
- GitHub repository：`lijie5868-create/yuanjie-official-website`
- Supabase production project：`yuanjie-official-website-prod`（ref：`cbibiadnvthklhgbgxhq`）
- `main` 是正式部署分支；GitHub Actions 將 `dist/` 部署到 GitHub Pages。
- Supabase 的已發布資料是線上內容來源，`dist/` 是連線失敗時的靜態備援。

## 開始修改前

每次開始處理本專案的請求（包含檢查、回答現況與修改）時，自動檢查公開網站與同層私人備份兩庫的 `git status --short --branch`，並對兩庫執行 `git fetch origin`。若位於乾淨的 `main` 且僅落後於 `origin/main`，自動執行 `git pull --ff-only`，不必等待使用者另行要求同步。若有未提交修改、分支分歧或無法快轉，保留現場並向使用者說明；不要強制覆蓋。

1. 閱讀本庫 `README.md` 和私人庫的完整維運文件。
2. 每次在任何電腦開始修改前，先執行 `git status --short --branch` 與 `git fetch origin`，比較本機分支和 `origin/main`；保留使用者尚未提交的修改。
3. 若工作目錄乾淨且本機 `main` 落後於 `origin/main`，先執行 `git pull --ff-only` 再修改。若有未提交修改、分支分歧或無法快轉，先查明並安全處理，不得強制覆蓋或重置使用者資料。
4. 需要修改 Supabase 前，先核對 production project ref，避免操作其他專案。
5. 不得把 service role、secret key、密碼或 access token 寫入 repository。

## 修改與驗證

- 每次修改前端頁面的 HTML、CSS、JavaScript 或由 AI 產生的版型時，同一工作必須檢查 `/admin/` 對應頁面的編輯器與預覽：載入後的結構、文字、圖片及桌面／手機排版應與正式頁面相容。檢查儲存草稿與發布流程是否會把新前端版型覆蓋成舊內容；必要時同步修正後台的載入、預覽或版本衝突保護。未完成這項檢查與修正前，不得宣稱前端修改完成或部署。
- 個案詳情的公開網址統一為 `project-編號.html`，新個案接續最大編號。不得直接移除舊網址；變更個案網址或連結時，同步檢查舊址轉向、首頁與個案列表、`/admin/` 編輯與「查看正式頁面」、`dist/live-content.js`、`dist/project-blocks.js` 和 `scripts/build_from_supabase.py`，並驗證正式部署產生的新舊網址。既有 Supabase `file_name` 可能保留舊值，勿只改靜態 HTML。
- 網站靜態輸出位於 `dist/`；不要只修改來源而漏掉正式部署檔案。
- 圖片放在 `dist/assets/`，並保持 HTML/CSS 的相對路徑可用。
- 發布前執行 `git diff --check`，並按私人庫的維運文件更新備份。
- 檢查首頁、主要內頁、手機版與 `/admin/`。
- Supabase schema 變更必須有 `supabase/migrations/` migration；Edge Function 若未來建立，原始碼必須放進 `supabase/functions/<slug>/`。

## 發布與備份

- 正式部署由 `.github/workflows/deploy-pages.yml` 執行。
- 每次重要發布建立日期化 tag 或 `codex/backup-YYYY-MM-DD` 快照分支。
- 完整文件、`CHANGELOG.md` 與 `backups/` 保存在私人庫；網站程式、圖片和部署流程保存在本公開庫。兩庫需分別提交與推送。
- 換電腦或換 GPT 帳號時依私人庫的 `docs/NEW-COMPUTER-HANDOFF.md` 接手；不能假設舊帳號的聊天、Project 設定或外部連線會轉移。
