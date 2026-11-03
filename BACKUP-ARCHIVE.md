# 2026-11-03 GitHub 完整備份封存

完整備份分支：`codex/backup-complete-2026-11-03`

此分支已直接保存可讀、可還原的完整專案，不需要下載或重新組合分割壓縮檔。內容包括：

- 網站程式碼與 68 個本地圖片
- Supabase 公開 CMS JSON 快照
- `AGENTS.md` 與開發文件
- 備份、稽核與還原腳本
- 本地檔案與資產引用清單

## 還原方式

```bash
git clone --branch codex/backup-complete-2026-11-03 --single-branch \
  https://github.com/lijie5868-create/yuanjie-official-website.git
```

還原後請依照 `docs/BACKUP-RESTORE.md` 執行檢查。此備份不含 Supabase 密碼、登入工作階段、Auth 使用者資料或其他秘密金鑰。
