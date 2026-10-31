# 元捷建設官方網站

這是元捷建設股份有限公司官方網站的原始碼，內容沿用現有正式網站版本。

網站靜態檔案位於 `dist/`，推送至 `main` 分支後會透過 GitHub Actions 自動部署到 GitHub Pages。

內容後台位於 `/admin/`，採 Supabase Auth、草稿／發布分離與資料列安全規則。發布內容後，GitHub Actions 最多約 5 分鐘會重新產生並部署靜態頁面，保留搜尋引擎可讀性與既有版型。

資料庫版本位於 `supabase/migrations/`。若既有靜態頁面有正式修改，可執行 `python3 scripts/export_cms_seed.py` 重新產生初始內容 migration。
