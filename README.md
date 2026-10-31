# 元捷建設官方網站

這是元捷建設股份有限公司官方網站的原始碼，內容沿用現有正式網站版本。

網站靜態檔案位於 `dist/`，推送至 `main` 分支後會透過 GitHub Actions 自動部署到 GitHub Pages。

內容後台位於 `/admin/`，採 Supabase Auth、草稿／發布分離與資料列安全規則。後台可上傳、裁切及調整圖片顯示大小。發布後，訪客重新整理頁面會從 Supabase 取得最新正式內容；連線失敗時保留最近一次部署的靜態頁面。GitHub Actions 每 5 分鐘重新產生靜態頁面，供搜尋引擎讀取。

資料庫版本位於 `supabase/migrations/`。若既有靜態頁面有正式修改，可執行 `python3 scripts/export_cms_seed.py` 重新產生初始內容 migration。
