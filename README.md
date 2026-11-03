# 元捷建設官方網站

元捷建設股份有限公司官方網站與內容管理後台。本專案沿用既有網站版型，以 GitHub Pages 提供正式網站，並以 Supabase 管理登入、草稿、發布內容與圖片。

## 網址

- 正式網站：<https://lijie5867.com/>
- 管理後台：<https://lijie5867.com/admin/>
- GitHub：<https://github.com/lijie5868-create/yuanjie-official-website>

## 主要功能

- 30 個正式網站頁面與響應式桌面、平板、手機排版
- Email 登入連結管理員驗證
- 頁面標題、搜尋摘要與正文視覺編輯
- 草稿與正式發布分離
- 全站導覽名稱、副標、順序及顯示狀態管理
- JPG、PNG、WebP 圖片上傳、裁切、縮放、顯示寬度與替代文字設定
- 發布後重新整理正式網站即可看到最新內容
- GitHub Actions 定期產生搜尋引擎可讀的靜態備援頁面
- Supabase 無法連線時保留最近一次部署的網站內容

## 文件與備份

完整開發文件、修改日誌、公開 CMS 資料備份與跨電腦接手手冊已移至私人 repository [`yuanjie-official-website-backup`](https://github.com/lijie5868-create/yuanjie-official-website-backup)。需由有權限的 GitHub 帳號登入後閱讀。網站程式與正式部署仍在本公開 repository；兩個 repository 分別保存 Git 紀錄。

公開資料核對：[專案地區資料核對](district-verification.md)。既有公開 Git 歷史仍可能包含搬移前的文件與備份。

## 專案目錄

```text
dist/                  正式網站、後台與前端資源
scripts/               Supabase 內容匯出與靜態頁面產生工具
supabase/migrations/   資料庫、權限、Storage 與初始內容版本
.github/workflows/     GitHub Pages 自動部署流程
```
