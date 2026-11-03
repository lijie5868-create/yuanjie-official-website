# 2026-11-03 GitHub 完整備份封存

備份分支：`codex/backup-2026-11-03`

完整 ZIP 因 GitHub 網頁單檔限制，分成以下七個檔案：

```text
yuanjie-official-website-backup-2026-11-03.zip.chunk-00
yuanjie-official-website-backup-2026-11-03.zip.chunk-01
yuanjie-official-website-backup-2026-11-03.zip.chunk-02
yuanjie-official-website-backup-2026-11-03.zip.chunk-03
yuanjie-official-website-backup-2026-11-03.zip.chunk-04
yuanjie-official-website-backup-2026-11-03.zip.chunk-05
yuanjie-official-website-backup-2026-11-03.zip.chunk-06
```

下載七個檔案後，在同一資料夾執行：

```bash
cat yuanjie-official-website-backup-2026-11-03.zip.chunk-* > yuanjie-official-website-backup-2026-11-03.zip
shasum -a 256 yuanjie-official-website-backup-2026-11-03.zip
unzip -t yuanjie-official-website-backup-2026-11-03.zip
```

正確 SHA-256：

```text
8d3904768adf3eb1c3ff718b3548a9615890f6c5983427989df590dd435ccd40
```

此 ZIP 由本地 commit `77164ea` 建立，包含完整網站程式碼、68 個本地圖片、Supabase 公開 CMS JSON、`AGENTS.md`、開發文件、備份與還原手冊。
