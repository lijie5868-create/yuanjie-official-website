# 備份與災難還原

更新日期：2026-11-03

## 備份範圍

本 repository 保存：

- 網站來源、建置腳本與 `dist/` 正式靜態檔案。
- `dist/assets/` 的網站圖片與字型。
- Supabase schema migrations。
- Supabase 公開 CMS 資料 JSON。
- 本地圖片與文字檔案 SHA-256 清單。
- GitHub Pages 部署流程與維運文件。

Supabase production project：

- 名稱：`yuanjie-official-website-prod`
- Project ref：`cbibiadnvthklhgbgxhq`
- CMS：30 個頁面、0 篇貼文、5 組導覽（2026-11-03 核對）。
- `cms_*` 草稿內容與 `published_*` 已發布內容差異為 0（2026-11-03 核對）。
- Storage bucket `site-media` 目前為空。
- Edge Functions 頁面顯示尚未部署第一個 Function，因此 production project 目前沒有 Edge Function 原始碼可下載。

## 建立最新備份

```bash
python3 scripts/backup_public_supabase.py
python3 scripts/audit_local_backup.py
git diff --check
```

輸出：

- `backups/supabase-public/published_pages.json`
- `backups/supabase-public/published_posts.json`
- `backups/supabase-public/published_navigation.json`
- `backups/supabase-public/storage/site-media/`（有檔案時）
- `backups/supabase-public/manifest.json`
- `backups/local-files-manifest.json`

公開備份腳本只使用前端 publishable key，不會備份 Auth 使用者、session、secret、service role 或其他私密資料。

## GitHub 備份策略

Git 本身保存每次 commit 歷史。重要版本另建立 `codex/backup-YYYY-MM-DD` 快照分支，方便非工程人員在 GitHub 直接找到完整狀態。正式部署仍以 `main` 為準。

## 網站還原

1. Clone GitHub repository。
2. 切換到最近的備份分支或 tag。
3. 確認 `dist/`、`dist/assets/` 和 `.github/workflows/deploy-pages.yml` 存在。
4. 在 GitHub repository variables 設定 `SUPABASE_URL` 與 `SUPABASE_PUBLISHABLE_KEY`。
5. 將 GitHub Pages source 設為 GitHub Actions。
6. 在 Pages 設定 Custom domain `lijie5867.com` 並啟用 Enforce HTTPS。
7. 推送到 `main` 或手動執行 Deploy GitHub Pages workflow。

若 Supabase 暫時不可用，`dist/` 仍會提供最近一次部署的靜態內容。

## Supabase 還原

1. 建立或選擇 Supabase project。
2. 按順序套用 `supabase/migrations/`。
3. 將 `published_pages.json`、`published_posts.json` 與 `published_navigation.json` 匯入對應公開表。
4. 同步相同內容到 `cms_pages`、`cms_posts` 與 `cms_navigation`，再補上草稿表的 UUID 與稽核欄位。
5. 若 Storage manifest 有物件，將 `storage/site-media/` 上傳至 `site-media` bucket，並保持相同路徑。
6. 更新 GitHub repository variables 與 `dist/admin/config.js` 的 project URL、publishable key。
7. 登入後台，檢查草稿、發布、圖片上傳與公開頁面。

## Edge Function 規則

production project 在 2026-11-03 沒有 Edge Function。未來若新增，部署前必須把完整原始碼同步到：

```text
supabase/functions/<function-slug>/
```

不得只在 Dashboard 編輯器保存唯一副本。
