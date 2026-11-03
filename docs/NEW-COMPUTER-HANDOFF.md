# 換電腦與換 GPT 帳號接手

本文件用於在另一台電腦、另一個 GPT 帳號繼續維護同一個網站。正式程式與文件以 GitHub `main` 分支為準；目前電腦上的聊天紀錄、登入狀態與未提交檔案不會隨 Git 同步。

## 先確認可用的帳號

1. 用有權限的 GitHub 帳號登入 [網站 repository](https://github.com/lijie5868-create/yuanjie-official-website)。若改用另一個 GitHub 帳號，先由 `lijie5868-create` 授予該帳號 repository 的存取權；若 repository 是公開的，讀取程式碼可不登入，但推送仍須有寫入權限。
2. 若要管理網站後台或 Supabase，另行登入 [正式網站後台](https://lijie5867.com/admin/) 與 [Supabase 專案](https://supabase.com/dashboard/project/cbibiadnvthklhgbgxhq)。GPT 帳號、GitHub 帳號與網站後台管理員是不同權限；換 GPT 帳號不會自動取得它們。
3. 在新電腦安裝 Git。使用 GitHub 網頁下載 ZIP 可取得目前檔案，但沒有完整 Git 歷史與同步功能；要持續維護請使用 clone。

## 在新電腦取回完整 Git 紀錄

在選定的工作資料夾執行：

```sh
git clone https://github.com/lijie5868-create/yuanjie-official-website.git
cd yuanjie-official-website
git status --short --branch
git log -1 --oneline
git remote -v
```

確認目前分支是 `main`、工作目錄沒有意外修改，且 `origin` 指向上述 repository。`git clone` 會取得版本歷史、網站檔案、圖片、開發文件和已提交的公開備份；不會取得舊電腦未提交或被 Git 忽略的檔案。若舊電腦仍可使用，搬移前應先檢查 `git status`，把需要保存的修改提交並推送，私密資料則用合適的安全方式另行移轉。

日後每次開始修改前，在專案資料夾執行 `git pull --ff-only` 並檢查 `git status --short`。若有未提交修改或無法快轉，先釐清差異，不要強制覆蓋。

## 在新的 GPT 帳號交接

1. 新建一個用來維護元捷網站的 Project，將 [`docs/CHATGPT-PROJECT.md`](CHATGPT-PROJECT.md) 的「Project 指示」完整貼入設定，並附上本 repository 連結。若新環境沒有 Project 功能，將同一段指示貼在新聊天開頭。
2. 讓新的 Agent 開啟 clone 後的專案資料夾，先閱讀 `AGENTS.md`、`README.md`、`docs/DEVELOPMENT.md`、`docs/ADMIN-GUIDE.md`、`docs/BACKUP-RESTORE.md`、本文件及 `CHANGELOG.md`，再核對 `git status`、`origin/main` 和正式網站。
3. 舊 GPT 帳號的聊天、Project 上傳副本、個人記憶與已連接的外部服務不會自動轉移。需要延續但沒有寫入 repository 的決定，先整理成不含密鑰的文件並提交；新帳號若需操作 GitHub 或 Supabase，要在新帳號或新電腦重新連線並確認權限。

可直接貼給新 Agent 的第一則訊息：

> 我要繼續維護元捷建設官方網站。請使用 https://github.com/lijie5868-create/yuanjie-official-website 的 `main` 分支，先閱讀 `AGENTS.md`、`README.md`、`docs/NEW-COMPUTER-HANDOFF.md`、`docs/DEVELOPMENT.md`、`docs/BACKUP-RESTORE.md` 與 `CHANGELOG.md`，確認本機 Git 狀態與正式網站，再依我這次的需求工作。請保留既有未提交修改，不要從舊聊天推定目前狀態。

## 接手後的檢查

- `dist/`、`dist/assets/`、`.github/workflows/deploy-pages.yml` 與 `supabase/migrations/` 都存在。
- 可開啟 [正式網站](https://lijie5867.com/)；需要編輯內容時，可用授權管理員信箱登入後台。
- 若要部署，確認 GitHub 有 repository 寫入權限，且 Actions 與 Pages 設定仍有效；部署流程見 [`docs/DEVELOPMENT.md`](DEVELOPMENT.md#部署)。
- 若要操作 Supabase，先核對 project ref 是 `cbibiadnvthklhgbgxhq`。公開備份不是資料庫私密資料、登入者、所有草稿或密鑰的完整備份；還原範圍見 [`docs/BACKUP-RESTORE.md`](BACKUP-RESTORE.md)。

不要把密碼、存取權杖、service role 或 secret key 貼進聊天、Project 指示或 GitHub。換 GPT 帳號只影響協作環境，不需要因此重建網站或改動正式網域。
