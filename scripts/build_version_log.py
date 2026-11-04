#!/usr/bin/env python3
"""Build the admin-facing engineering version log from public Git history."""

from __future__ import annotations

import json
import pathlib
import subprocess


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "admin" / "version-log.json"

COMMIT_TRANSLATIONS = {
    "0d96998": "建立網站專案，匯入首頁與第一批建案圖片素材",
    "a50b053": "擴充公司理念、問與答及建案頁面內容",
    "9a9c8ba": "建立菁英團隊頁面並補齊團隊與企業價值圖片",
    "0545934": "調整團隊頁面版面與共用樣式",
    "5e6f320": "匯入歷年建案資料與大量建案圖片",
    "e45698c": "新增九太建設品牌介紹與相關圖片內容",
    "ae34055": "補上聯絡方式與 LINE 線上諮詢入口",
    "0b64406": "新增和平東路建案施工紀錄",
    "049b0bc": "新增泰安建案施工歷程與都市更新內容",
    "c769be1": "補齊合作團隊、人物、建案圖片與網站中文字型",
    "d117409": "統整各頁標題、人物照片與響應式顯示",
    "c43f320": "調整全站中文字型與頁面視覺一致性",
    "b6eadbd": "更新全站共用資源版本，確保瀏覽器取得最新內容",
    "bf687c9": "加強手機版與不同螢幕尺寸的版面樣式",
}

SUMMARY_TRANSLATIONS = {
    "Configure GitHub Pages deployment": "建立 GitHub Pages 自動部署流程",
    "Add Supabase-powered website CMS": "建立 Supabase 網站後台，加入草稿與發布功能",
    "Hide CMS editor until authenticated": "加強後台登入保護，未驗證前不顯示編輯器",
    "Refresh CMS stylesheet cache": "更新後台樣式版本，避免瀏覽器顯示舊畫面",
    "Add second CMS administrator": "新增第二位網站後台管理員",
    "Improve responsive site and CMS layouts": "改善網站與後台在手機、平板上的操作版面",
    "feat: add structured navigation management": "建立導覽選單管理，可編輯名稱、副標、顯示與順序",
    "fix: defer dashboard loading after auth": "修正登入後後台資料載入時機",
    "chore: refresh admin script cache": "更新後台程式版本，確保使用者載入最新功能",
    "feat: edit images and show published content immediately": "加入圖片裁切縮放，並讓發布內容立即顯示",
    "refine home statistics layout": "優化首頁統計資訊的版面呈現",
    "docs: add development and admin guides": "建立網站開發文件與後台操作手冊",
    "docs: add ChatGPT project guidance and source index": "補充專案維護指引與原始資料索引",
    "backup: archive Supabase content and recovery docs": "備份後台內容資料並建立復原說明",
    "backup: add recovery agent and project index": "新增復原工具與專案檔案索引",
    "docs: add split archive recovery instructions": "補充大型備份分卷的還原步驟",
    "backup: add complete archive part 3": "完成網站完整備份的第三分卷",
    "docs: document smaller backup archive chunks": "記錄小型備份分卷的使用方式",
    "backup: add complete archive chunk 1": "建立完整網站備份的第一分卷",
    "docs: point restore guide to complete backup branch": "更新還原手冊，指向完整備份版本",
    "backup: include all local project images": "將所有本機建案圖片納入備份",
    "chore: normalize backup image permissions": "統一備份圖片的檔案權限",
    "feat: add lazyunclek admin access": "新增後台管理員帳號權限",
    "fix: prevent project headers from covering content": "修正建案頁標題遮住內容的顯示問題",
    "fix: unify page styles and scope project header behavior": "統一全站頁面樣式與建案標題行為",
    "fix: refresh shared stylesheet cache across all pages": "更新全站共用樣式版本，排除舊快取",
    "fix: align Xinguang project image layout": "調整新光建案圖片的排列與對齊",
    "chore: refresh published content backup": "更新正式網站內容備份",
    "docs: add new computer and GPT account handoff guide": "建立更換電腦與帳號時的網站交接手冊",
    "docs: require remote sync check before edits": "加入修改前先確認遠端同步的安全流程",
    "chore: move internal docs and backups to private repository": "將內部文件與備份移至私人資料庫保護",
    "chore: stop tracking local asset manifest publicly": "停止公開內部素材清單，降低資料暴露",
    "ui: make admin page groups collapsible": "後台頁面清單加入收合功能，減少畫面混亂",
    "ui: add resizable admin page sidebar": "加入可拖曳調整寬度的後台左右分隔桿",
    "ui: add drag sorting for navigation": "導覽選單加入滑鼠拖曳排序",
    "feat: add admin engineering log": "建立工程日誌，記錄網站版本與管理員操作",
    "ui: split engineering log and add bilingual history": "拆分工程日誌，加入月份篩選與中英雙語建置歷程",
    "fix: keep website history on deployed main branch": "網站更新只保留正式主線版本，排除未部署的備份分支",
    "feat: add administrator directory": "後台新增管理員名單頁面，顯示目前授權帳號",
    "ui: compact admin navigation header": "縮短後台頂部區域，讓操作面板更快出現在畫面中",
    "ui: reduce admin brand bar height": "縮小後台品牌列文字、按鈕與上下留白",
    "ui: compact public website header": "縮小正式網站頁首、Logo、公司文字與導覽選單高度",
    "ui: redesign homepage featured projects": "重整首頁精選建案，整合圖片、案名、摘要與入口",
    "ui: refine homepage team section": "重整首頁團隊介紹，平衡照片、文字與下方合作內容",
    "ui: align project index cards": "統一建案列表圖片比例，調整為清楚的三欄作品集版面",
    "ui: tighten team page rhythm": "縮緊團隊頁人物資料與合作名單間距，改善文字閱讀節奏",
    "feat: add project location filters": "新增建案縣市與行政區標籤，可快速篩選進行個案",
    "ui: compact urban project heading": "縮短進行個案頁首與篩選器間距，減少首屏空白",
    "ui: compact inner page headings": "統一縮短全站內頁標題區與首段內容間距",
    "ui: add subtle image hover zoom": "為可點擊建案與照片加入輕微滑入縮放效果",
    "ui: organize philosophy longform": "整理公司理念長文版面並加入章節索引，保留完整原文",
    "ui: redesign core values cards": "以原創建築線條插圖呈現四個核心理念，保留全部文字",
}


def translate_summary(short_commit: str, summary: str) -> str:
    return COMMIT_TRANSLATIONS.get(
        short_commit,
        SUMMARY_TRANSLATIONS.get(summary, summary),
    )


def main():
    raw = subprocess.check_output(
        [
            "git",
            "log",
            "main",
            "--date=iso-strict",
            "--pretty=format:%H%x1f%h%x1f%cI%x1f%s%x1e",
        ],
        cwd=ROOT,
        text=True,
    )
    versions = []
    for record in raw.strip("\x1e\n").split("\x1e"):
        if not record.strip():
            continue
        commit, short_commit, committed_at, summary = record.strip().split("\x1f", 3)
        versions.append(
            {
                "commit": commit,
                "short_commit": short_commit,
                "committed_at": committed_at,
                "summary": summary,
                "summary_zh": translate_summary(short_commit, summary),
            }
        )
    OUTPUT.write_text(
        json.dumps(versions, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(versions)} website versions to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
