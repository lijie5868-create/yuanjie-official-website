# ChatGPT Project 設定與資料來源

適用於 ChatGPT Project「元捷官方網站」。此頁保留可貼入 Project 設定的短指示，以及會隨 `main` 分支更新的文件入口。ChatGPT Project 中上傳的檔案是副本，不會隨 GitHub 自動更新。

## Project 指示

```text
這個 Project 用於持續開發與維護「元捷建設官方網站」。優先沿用現有網站、內容和品牌風格；依使用者當次要求調整，過往設計決定不是永久限制。

最新程式與開發文件以 GitHub repository https://github.com/lijie5868-create/yuanjie-official-website 的 main 分支為準。修改前先查看 README.md、docs/DEVELOPMENT.md、docs/ADMIN-GUIDE.md、CHANGELOG.md，並核對正式網站與後台現況；舊聊天或 Project 上傳文件若與最新版本不同，以可驗證的最新版本為準。

正式修改完成時，檢查桌面與手機版、相關後台功能及部署結果，更新相關文件與 CHANGELOG.md，推送 GitHub，並同步桌面「喵老大／元捷官方網站（本地程式碼）」備份。Supabase 僅使用元捷專用專案，勿混用私人 Threads 專案；勿將密鑰放進前端或文件。重大品牌方向、權限或不可逆資料變更先確認；一般實作選擇可自主完成。
```

## 建議的 Project 資料來源

在 Project 資料來源放這份索引的連結即可；需要固定版本供核對時，再上傳相應文件並標示日期或 commit。修改後以 GitHub `main` 為準，不依賴舊副本。

| 用途 | 最新文件 |
| --- | --- |
| 專案總覽與正式網址 | [README](https://github.com/lijie5868-create/yuanjie-official-website/blob/main/README.md) |
| 架構、部署、備份與維運 | [開發與維運文件](https://github.com/lijie5868-create/yuanjie-official-website/blob/main/docs/DEVELOPMENT.md) |
| 後台操作方式 | [後台操作手冊](https://github.com/lijie5868-create/yuanjie-official-website/blob/main/docs/ADMIN-GUIDE.md) |
| 功能與修改歷史 | [修改日誌](https://github.com/lijie5868-create/yuanjie-official-website/blob/main/CHANGELOG.md) |
| 本 Project 設定範本 | [ChatGPT Project 設定](https://github.com/lijie5868-create/yuanjie-official-website/blob/main/docs/CHATGPT-PROJECT.md) |

品牌資料、經核准文案與圖片原始檔可另放 Project 資料來源，但需明確標示版本與來源；不要上傳密碼、私密金鑰或個人 Threads 專案資料。
