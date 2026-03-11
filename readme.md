# Gemini AI 每日工作匯報助手 (Gemini AI Daily Assistant)

**Project Status:** Stable (v3.4) | **Maintainer:** Obie Chen | Updated: Mar.11.2026

這是一個基於 Google Apps Script (GAS) 構建的自動化工作流系統。它扮演「AI 專案秘書」的角色，透過整合 Google Calendar 與 Google Gemini (Generative AI) 模型，將每日流水帳式的行程，轉化為具備 **優先級判斷 (Prioritization)** 與 **決策建議 (Actionable Insights)** 的結構化匯報。

### 適用對象 (Target Audience)

本專案特別適用於身處多工環境的 **資深專案經理 (Senior Project Managers)**、**產品負責人 (Product Owners)** 或 **團隊領導者 (Team Leads)**。這類角色通常同時管理多個跨職能專案（如技術開發、政府標案、行銷活動），且行程緊湊，需要極高效率的資訊過濾與決策輔助。

### 使用情境 (Usage Scenarios)

- **晨間決策 (Morning Briefing)**：在通勤或開啟電腦前，透過一封結構化的 Email 快速掌握今日戰場，無需逐一查看零散的日曆行程。
- **會議準備 (Meeting Prep)**：AI 自動標註關鍵會議（如「策略規劃」、「高層匯報」），並提示相關準備工作，避免遺漏。
- **專案追蹤 (Project Tracking)**：透過自動分類標籤（如 `[專案A]`、`[行政]`），釐清時間資源分配，協助進行週報或月報的回顧分析。
- **休假勿擾 (Vacation Mode)**：系統自動偵測休假行程並暫停運作，確保工作與生活的界線。

## ✨ 核心功能 (Key Features)

### 1. 智慧摘要與排序 (Intelligence)

不只是列出每日行程，而是由 AI 進行邏輯重組：

- **今日概覽**：一句話總結當日的忙碌程度與核心任務。
- **優先級排序**：自動識別關鍵會議（如涉及產品發布、預算審查、高層匯報），並置頂顯示。
- **準備建議**：針對重要行程，主動提示需準備的文件或回顧上次結論。

### 2. 自動化專案歸類 (Auto-Classification)

內建關鍵字分類器，自動將行程標題映射至標準專案名稱：

- **泛用專案 (例如：產品開發)**：識別關鍵字如 `Product`, `App`, `網站`, `上線`。
- **泛用專案 (例如：行銷活動)**：識別關鍵字如 `Marketing`, `廣告`, `社群`。
- **行政類**：識別 `報帳`, `休假`, `週會` 等行政庶務。

### 3. 智慧守門員機制 (Smart Gatekeeping)

- **休假模式 (Off-day Mode)**：若偵測到當日有「全天」且標題含 `Off`, `休假`, `Leave` 的行程，系統將自動暫停運作，落實 Work-life balance。
- **工作日排程**：預設僅在週一至週五運作（可透過 Config 調整）。

### 4. 多管道交付 (Multi-channel Delivery)

- **Email**：發送排版精美的郵件至指定信箱，內建強制斷行防呆機制，確保各類信箱客戶端 (如 Outlook/Gmail) 均能完美呈現純文字的視覺層級。
- **Notion (選用)**：支援將每日匯報同步至 Notion Database，建立長期專案日誌。

### 5. 高可用性與容錯機制 (Resilience & Reliability) - *v3.4 新增*

- **全域錯誤攔截 (Global Exception Handling)**：當 API 連線超時或解析失敗時，系統會自動攔截錯誤，避免腳本崩潰。
- **管理員警報 (Admin Alert)**：發生嚴重異常時，系統會主動寄送包含 Stack Trace 的錯誤報告給維護者，實現 Evidence-driven 的系統監控。
- **動態靜態分離 (Separation of Concerns)**：將固定招呼語與系統 metadata 抽離至交付層 (Delivery Layer)，最大化節省 AI Token 消耗並提升生成穩定度。

## 💻 系統需求 (Requirements)

在部署此專案前，請確認您具備以下環境與權限：

### 必要條件 (Mandatory)

1. **Google 帳號**：一般的 Gmail 帳號或 Google Workspace 企業帳號皆可。
2. **Google Apps Script 權限**：需允許指令碼讀取您的 Google Calendar 與發送 Gmail。
    - **驗證方式**：首次手動執行 `sendDailyBriefing` 函式時，系統會自動彈出授權視窗，請依照螢幕指示完成授權。
3. **Google Gemini API Key**：
    - 需至 [Google AI Studio](https://www.google.com/search?q=https://aistudio.google.com/) 申請免費的金鑰。
    - 模型需求：支援 `gemini-2.0-flash-lite`, `gemini-2.5-flash-lite` 或以上版本。

### 選用條件 (Optional)

- **Notion Integration**：若需同步至 Notion，需準備 Notion Integration Token 與 Database ID。

## 🏗 系統架構 (Architecture)

本專案採用 **Structure-first** 的分層架構設計，確保高可維護性與資安合規：

| **層級 (Layer)** | **模組名稱** | **職責說明** |
| --- | --- | --- |
| **Workflow** | `Workflow_DailyBrief` | **核心流程**。串接 Config、資料獲取、AI 推論。負責靜態內容注入 (Content Injection) 與異常攔截 (Resilience)。 |
| **Config** | `Config` / `Prompt` | **邏輯設定**。管理排程規則與純化後的 AI 人設 (System Instructions)，最小化 Token 消耗。 |
| **Utils** | `CalendarParser` | **資料清洗**。處理 Regex 解析與標題標準化。 |
| **Utils** | `TaskClassifier` | **分類邏輯**。維護專案關鍵字映射表 (Mapping Table)。 |
| **Security** | `Utils_Setup` | **機密管理**。透過內建 Script Properties 儲存 ID 與 Key，確保程式碼本身不含敏感資料。 |

## 🚀 如何開始 (Getting Started)

本專案提供兩種部署方式，請依您的技術背景選擇：

### 方式 A：一般使用者 (零程式基礎)

👉 **請參閱：[Gemini AI 每日工作匯報助手：完全安裝手冊 (manual.md)](manual.md)**
該手冊包含詳細的圖文步驟，引導您透過「複製貼上」完成部署。

### 方式 B：開發者與協作 (CLI 部署)

👉 **請參閱：[CLASP 開發者部署指南 (CLASP_Developer_Guide.md)]()**
如果您熟悉 Command Line 與 Git，建議使用 CLASP 進行版控與部署。

## ❓ 常見問題 (FAQ)

遇到安裝問題或執行錯誤嗎？
👉 **請參閱：[常見問題與故障排除 (FAQ.md)](FAQ.md)**

涵蓋內容：

- ID 設定無效怎麼辦？
- 出現紅色警告畫面如何處理？
- 為什麼沒收到信？
- 如何調整 AI 摘要語氣？

## 🛡 資安與隱私宣告

- **資料流向**：您的行事曆資料僅會在 Google 雲端環境內運行，並傳送至 Google Gemini API 進行處理。
- **資料留存**：本程式不會在任何第三方伺服器儲存您的資料。
- **代碼安全**：所有的 API Key 與 ID 均儲存於 Google Apps Script 的「指令碼屬性 (Script Properties)」中，即使分享程式碼檔案，也不會洩漏您的個人憑證。

## 🤝 貢獻與維護

歡迎針對分類器的關鍵字 (`Utils_TaskClassifier.gs`) 或 AI Prompt (`Prompt.gs`) 提出優化建議。

- **Report Bugs**: 請直接聯繫專案維護者。
- **調整系統設定 (Update Config)**: 系統的運作邏輯已集中抽離至 `Config.gs`，您可在此自由調整以下核心行為，無須修改主程式碼：
    - **AI 模型切換**：變更使用的 Gemini 模型版本（預設 `gemini-2.5-flash-lite`。因 Token 上限及費用考量，不建議使用 Pro/高階模型）。
    - **排程與休假規則**：設定每週運作日 (預設避開週末)，以及觸發休假模式的排除關鍵字 (如 `Off`, `休假`)。
    - **寄送與收件名單**：管理收件人清單、是否副本給公司信箱。
    - **功能開關**：自由啟用或關閉 Notion 同步功能。(目前預設關閉)
    - **檔案歸檔策略**：設定 Drive 舊檔案的自動保留天數。(預設 14 天)