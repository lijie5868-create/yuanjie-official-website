# 元捷官方網站 Agent 工作規則

## 真實來源

- 正式網址：`https://lijie5867.com/`
- GitHub repository：`lijie5868-create/yuanjie-official-website`
- Supabase production project：`yuanjie-official-website-prod`（ref：`cbibiadnvthklhgbgxhq`）
- `main` 是正式部署分支；GitHub Actions 將 `dist/` 部署到 GitHub Pages。
- Supabase 的已發布資料是線上內容來源，`dist/` 是連線失敗時的靜態備援。

## 開始修改前

1. 閱讀 `README.md`、`docs/DEVELOPMENT.md`、`docs/ADMIN-GUIDE.md`、`docs/BACKUP-RESTORE.md`、`docs/NEW-COMPUTER-HANDOFF.md` 與 `CHANGELOG.md`。
2. 執行 `git status --short`，保留使用者尚未提交的修改。
3. 需要修改 Supabase 前，先核對 production project ref，避免操作其他專案。
4. 不得把 service role、secret key、密碼或 access token 寫入 repository。

## 修改與驗證

- 網站靜態輸出位於 `dist/`；不要只修改來源而漏掉正式部署檔案。
- 圖片放在 `dist/assets/`，並保持 HTML/CSS 的相對路徑可用。
- 發布前執行：
  - `python3 scripts/backup_public_supabase.py`
  - `python3 scripts/audit_local_backup.py`
  - `git diff --check`
- 檢查首頁、主要內頁、手機版與 `/admin/`。
- Supabase schema 變更必須有 `supabase/migrations/` migration；Edge Function 若未來建立，原始碼必須放進 `supabase/functions/<slug>/`。

## 發布與備份

- 正式部署由 `.github/workflows/deploy-pages.yml` 執行。
- 每次重要發布建立日期化 tag 或 `codex/backup-YYYY-MM-DD` 快照分支。
- `backups/supabase-public/` 保存可公開讀取的 CMS 內容；`backups/local-files-manifest.json` 保存本地圖片與文字檔案的 SHA-256 清單。
- 還原流程以 `docs/BACKUP-RESTORE.md` 為準。
- 換電腦或換 GPT 帳號的接手流程以 `docs/NEW-COMPUTER-HANDOFF.md` 為準；新 Agent 必須從 repository 與線上服務重新核對現況，不能假設能讀取舊帳號的聊天、Project 設定或外部連線。
