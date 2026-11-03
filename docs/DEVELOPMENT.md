# 開發與維運文件

## 系統概觀

本專案是無框架的 HTML、CSS 與 JavaScript 網站。`dist/` 可直接由靜態伺服器提供，不需要安裝套件或執行編譯。

正式架構包含三個部分：

1. GitHub 儲存原始碼，`main` 分支是正式版本。
2. GitHub Pages 提供公開網站與管理後台。
3. Supabase 提供管理員登入、內容資料庫與圖片儲存。

正式網站載入時，`dist/live-content.js` 會讀取 Supabase 的已發布內容。讀取成功就更新頁面正文與導覽；讀取失敗則保留 GitHub Pages 上最近一次部署的靜態內容。

## 原始碼與備份

| 用途 | 位置 |
| --- | --- |
| 本機工作與備份資料夾 | `/Users/kaipeitseng/Desktop/元捷官方網站（本地程式碼）` |
| GitHub repository | `lijie5868-create/yuanjie-official-website` |
| 正式分支 | `main` |
| 正式網址 | `https://lijie5867.com/` |
| Supabase production project ref | `cbibiadnvthklhgbgxhq` |

每次正式修改完成後，應確認本地與 GitHub 的 Git commit 相同：

```sh
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

重要版本另建立日期化備份分支；完整備份與還原方式見 [`BACKUP-RESTORE.md`](BACKUP-RESTORE.md)。

```sh
python3 scripts/backup_public_supabase.py
python3 scripts/audit_local_backup.py
```

## 主要程式

| 檔案 | 用途 |
| --- | --- |
| `dist/*.html` | 正式頁面的靜態模板與備援內容 |
| `dist/style.css` | 全站版面與 RWD 樣式 |
| `dist/live-content.js` | 即時讀取已發布頁面與導覽 |
| `dist/admin/index.html` | 後台畫面結構 |
| `dist/admin/admin.js` | 登入、頁面、草稿、發布與導覽管理 |
| `dist/admin/image-editor.js` | 圖片上傳、裁切、縮放與插入 |
| `dist/admin/config.js` | 瀏覽器可用的 Supabase URL 與 publishable key |
| `scripts/build_from_supabase.py` | 部署時把已發布內容寫入靜態 HTML |
| `scripts/export_cms_seed.py` | 從靜態頁面重新產生內容 seed migration |
| `scripts/backup_public_supabase.py` | 匯出公開 CMS 與 Storage 內容 |
| `scripts/audit_local_backup.py` | 盤點本地圖片與文字並驗證資產引用 |

`dist/admin/config.js` 只能放 Supabase publishable key。不得把 secret key 或 service role key 放入網站、GitHub 或前端程式。

## Supabase 資料

| 資料表或儲存空間 | 用途 | 公開權限 |
| --- | --- | --- |
| `cms_pages` | 頁面草稿 | 僅授權管理員 |
| `published_pages` | 已發布頁面 | 訪客唯讀、管理員可發布 |
| `cms_navigation` | 導覽草稿 | 僅授權管理員 |
| `published_navigation` | 已發布導覽 | 訪客唯讀、管理員可發布 |
| `cms_posts`、`published_posts` | 預留文章資料 | 目前後台尚未提供文章管理畫面 |
| Storage `site-media` | 後台上傳的網站圖片 | 公開讀取、授權管理員寫入 |

所有公開 schema 資料表均啟用 Row Level Security。相關定義位於 `supabase/migrations/`。

管理員允許名單同時存在於兩處：

- `dist/admin/admin.js` 的前端允許名單
- Supabase migration 中的 RLS 與 Storage policy

新增或移除管理員時，兩處必須一起修改並部署。只改前端不能取得資料庫權限，只改資料庫則登入畫面仍會拒絕。

目前授權管理員：

- `lijie5868@gmail.com`
- `ru8ru8u8@gmail.com`
- `lazyunclek@gmail.com`

## 草稿與發布流程

```text
後台編輯
  → 儲存草稿到 cms_* 表
  → 發布到 published_* 表
  → 訪客重新整理後由 live-content.js 立即讀取
  → GitHub Actions 每 5 分鐘更新靜態備援與搜尋引擎版本
```

「儲存草稿」不會改變正式網站。「發布」會先儲存草稿，再更新已發布資料。

## 圖片處理

後台接受 JPG、PNG 與 WebP。圖片在瀏覽器內使用 Canvas 裁切，輸出為品質 0.88 的 WebP，輸出寬度最多 2,000px，之後上傳至 `site-media`。

可選比例為原圖、1:1、4:3、16:9；頁面顯示寬度可設定為 25% 至 100%。圖片替代文字會寫入 `alt`，供無障礙與搜尋引擎使用。

目前圖片上傳採唯一檔名，不會覆蓋舊檔。替換頁面圖片後，舊圖片仍保留在 Storage；日後若要清理，需先確認沒有其他頁面引用。

## 本機預覽

在專案根目錄執行：

```sh
python3 -m http.server 8765 --directory dist
```

開啟 <http://127.0.0.1:8765/>。不要直接以 `file://` 開啟 HTML，否則模組、相對路徑與跨來源圖片行為可能不同。

版面修改至少檢查：

- 桌面寬度約 1440px
- 平板斷點 800px
- 手機寬度 390px
- 窄手機寬度 320px
- 頁面沒有水平捲軸
- 導覽、燈箱、FAQ 搜尋與後台編輯仍可使用

## 部署

推送到 `main` 後，`.github/workflows/deploy-pages.yml` 會：

1. 取出 repository。
2. 使用 repository variables 連線 Supabase。
3. 執行 `scripts/build_from_supabase.py` 取得已發布內容。
4. 上傳 `dist/` 並部署至 GitHub Pages。

GitHub repository 必須設定：

- Variable `SUPABASE_URL`
- Variable `SUPABASE_PUBLISHABLE_KEY`
- Pages source 使用 GitHub Actions

部署會在推送 `main`、手動執行 workflow，以及每 5 分鐘排程時啟動。相同部署群組會取消尚未完成的舊執行，避免內容順序錯亂。

## 正式修改檢查清單

1. 確認 `git status`，不要覆蓋不相關的修改。
2. 修改現有版型與內容來源。
3. 執行 `git diff --check`。
4. 本機預覽並檢查桌面與手機版。
5. Commit 並推送 `main`。
6. 確認 GitHub Actions 成功。
7. 以帶版本參數的網址重新整理正式頁面，例如 `?rev=<commit>`。
8. 確認本地與 GitHub 的 commit 一致。
9. 更新 Supabase 與本地資產備份，建立重要版本的日期化備份分支。
10. 在 `CHANGELOG.md` 記錄使用者可見的功能與重要維運修改。

## 常見問題

### 後台發布後正式網站沒有更新

先重新整理正式頁面，再檢查瀏覽器 Console 是否無法讀取 `published_pages` 或 `published_navigation`。確認 Supabase Data API grants、RLS policy 與 GitHub repository variables 都存在。

### 正式網站可以更新，但搜尋結果仍是舊內容

訪客畫面會立即讀取 Supabase；搜尋引擎使用的靜態 HTML 由 GitHub Actions 更新。先確認最近一次排程部署成功，再等待搜尋引擎重新索引。

### 管理員能登入但看不到資料

檢查 Email 是否同時存在於前端允許名單與 Supabase RLS policy，並重新登入以取得新的 JWT。

### 圖片上傳失敗

確認檔案是 JPG、PNG 或 WebP，大小未超過 Storage bucket 限制，且使用者 Email 符合 Storage policy。
