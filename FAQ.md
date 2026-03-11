# 常見問題與故障排除 (FAQ & Troubleshooting)
**Project Status:** Stable (v3.4) | **Maintainer:** Obie Chen | Updated: Mar.11.2026

本文件彙整了 **GAS行事曆每日秘書** 在安裝、設定與日常使用中可能遇到的問題與解決方案。

## 📋 目錄

1. [費用與帳戶機制 (Billing & Account)](#1-費用與帳戶機制-billing--account)
    - 包含：是否免費、綁卡差異、額度不足錯誤 (429/Limit 0)
2. [安裝與執行障礙 (Installation & Execution)](#2-安裝與執行障礙-installation--execution)
    - 包含：設定檔無效、紅色授權警告、API 連線錯誤 (404/503)
3. [功能與排程邏輯 (Functionality & Scheduling)](#3-功能與排程邏輯-functionality--scheduling)
    - 包含：沒收到信、休假誤寄、週末沒信
4. [內容品質與輸出 (Content Quality & Output)](#4-內容品質與輸出-content-quality--output)
    - 包含：分類錯誤、語氣調整、CSV 亂碼

## 1. 費用與帳戶機制 (Billing & Account)

### Q1. 使用此工具需要付費嗎？需要綁定信用卡 (Billing) 嗎？

**A:** **預設不需要。** 本工具使用 Google AI Studio 的 **免費層級 (Free of Charge)**。

- **預設狀態 (Free Tier)：** 只要未在 Google Cloud Platform 綁定信用卡，您的 API Key 就限制在免費額度內，**絕對不會**發生意外扣款。適合個人或小型團隊。
- **綁定信用卡 (Tier 1)：** 若您選擇綁卡，帳戶將升級為 Tier 1 (Pay-as-you-go)。此時速率限制 (Rate Limits) 會大幅解鎖，但超過免費額度後會自動計費。

**額度差異比較表 (以 Flash 模型為例)：**

| 指標 | 免費層級 (Free) | 付費層級 (Tier 1) |
| --- | --- | --- |
| **RPM (每分鐘請求數)** | 15 RPM | **4,000 RPM** |
| **TPM (每分鐘 Token 數)** | 100 萬 TPM | **400 萬 TPM** |
| **RPD (每日請求上限)** | 1,500 RPD | **無上限** (依量計費) |
| **資料隱私** | 輸入資料可能用於優化 | **輸入資料不會被用於訓練** |

### Q2. 免費版有使用限制嗎？(RPD / RPM / TPM 是什麼？)

**A:** 有，這些是 API 的速率限制指標。對於本工具「每日匯報」的用途來說，免費額度已非常寬裕。

以下是名詞解釋與比較：

1. **RPM (Requests Per Minute - 每分鐘請求數)**
    - **定義：** 一分鐘內向 AI 發送指令的頻率。
    - **限制：** 免費版限制 15 RPM。
    - **現況：** 本工具執行一次只發送 1 次請求，遠低於限制，非常安全。
2. **TPM (Tokens Per Minute - 每分鐘處理字數)**
    - **定義：** 一分鐘內 AI 處理的資料量（包含您傳給它的行程資料 + 它回應的摘要內容）。
    - **小知識：** 「Token」是 AI 計算文字的單位，**1 個 Token 約等於 0.5~0.7 個中文字**。
    - **限制：** 免費版限制 100 萬 TPM（約 50-70 萬中文字）。
    - **現況：** 除非您的單日行程內容多達數十萬字（相當於好幾本書），否則不可能超標。
3. **RPD (Requests Per Day - 每日請求上限)**
    - **定義：** 一整天內可以使用的總次數。
    - **限制：** 免費版限制 1,500 RPD。
    - **現況：** 本工具每天早上只執行 **1 次**，距離上限非常遙遠。

### Q3. 執行時出現 `Error 429: Resource Exhausted` 或 `Limit: 0`？

**A:** 這通常不是指您的免費額度用完了，而是指您**選到了需要付費的模型** (即該模型對免費帳戶的配額 Limit 為 0)。

- **原因：** 您在 `Config.gs` 中設定的模型版本（例如某些 Pro 版或 Preview 版）不在您目前帳號等級 (Free Tier) 的支援範圍內。
- **解決方案：**
    1. 將 `Config.gs` 中的模型切換回標準免費版 `gemini-2.0-flash-lite`。
    2. 執行 `Utils_Debug.gs` 中的 `debugModelList()`，該工具會列出您帳號實際可用的模型清單，避免選錯。

## 2. 安裝與執行障礙 (Installation & Execution)

### Q1. 執行 `runFirstTimeSetup` 後，為什麼程式碼裡的 ID 還是原本的「請填入...」？

**A:** 這是正常的資安設計。`Utils_Setup.gs` 是將資料寫入 Google Apps Script 的後台 **「保險箱」 (Script Properties)**，不會修改程式碼表面的文字。

- **驗證：** 只要執行紀錄顯示 `[Setup] 已儲存變數...` 即代表成功。
- **動作：** 設定成功後，請手動刪除 `Utils_Setup.gs` 中的真實資訊。這樣即使您截圖分享程式碼，也不會洩漏個人隱私。

### Q2. 第一次執行時出現紅色警告「Google 尚未驗證這個應用程式」？

**A:** 這是標準資安機制，因為腳本是您私人建立的。

- **解決步驟：** 點擊視窗左下角的 **「進階 (Advanced)」** -> 點擊最下方的連結 **「前往...... (不安全)」** -> 點擊 **「允許」**。

### Q3. 我修改了 `Config.gs`，但 ID 或 Key 好像沒有更新？

**A:** `Config.gs` 中的 `ACTIVE_DAYS` 等邏輯設定會立即生效；但涉及 **ID 或 Key** 的變更，必須回到 `Utils_Setup.gs` 填寫新值並再次執行 `runFirstTimeSetup` 才能更新到後台。

### Q4. 執行時出現 `Error 404: Not Found`？

**A:** 代表模型名稱錯誤或該模型未對您的 API Key 開放。請確認 `Config.gs` 設定為 `gemini-2.0-flash-lite`。

### Q5. 執行時出現 `Error 503: Service Unavailable`？

**A:** Google 伺服器暫時過載。程式內建重試機制，通常下一次自動執行就會恢復。若持續發生，請考慮更換模型版本。

## 3. 功能與排程邏輯 (Functionality & Scheduling)

### Q1. 執行紀錄顯示「Email 已交付」，但我沒收到信？

**A:**

1. **檢查垃圾信箱 (Spam)：** 自動化郵件容易被誤判。
2. **公司信箱擋信：** 檢查公司 IT 防火牆是否攔截。
3. **檢查設定：** 執行 `Utils_Debug.gs` 中的 `debugConfigSafety()`，確認系統解析出的收件人地址是否正確。

### Q2. 為什麼週六、週日沒有收到信？

**A:** 系統預設僅在 **工作日 (週一至週五)** 運作。

- **調整：** 若需週末運作，請至 `Config.gs` 修改 `ACTIVE_DAYS` 陣列（0=週日, 6=週六）。

### Q3. 我今天有請假 (Off)，為什麼還是收到信？

**A:** 休假模式 (Off-day Mode) 的觸發條件比較嚴格，需同時滿足：

1. 必須是 Google 日曆上的 **全天行程 (All-day Event)** (請務必勾選「全天」核取方塊，而非手動設定時間)。
2. 標題必須包含關鍵字（預設為 `Off`, `休假`, `Leave`）。

## 4. 內容品質與輸出 (Content Quality & Output)

### Q1. 我的行程標題有寫 `[Edge]`，但專案欄位還是顯示「其他」？

**A:**

1. **檢查關鍵字：** 確認 `Utils_TaskClassifier.gs` 中的 `TAG_MAP` 有定義該關鍵字。
2. **測試解析：** 執行 `Utils_Debug.gs` 中的 `debugCalendarParser()`，測試您的標題格式是否被 Regex 支援。

### Q2. AI 寫的摘要語氣太生硬，可以改嗎？

**A:** 可以。請開啟 `Prompt.gs`，直接修改 `PROMPT_DAILY_BRIEF` 變數內的中文敘述（System Instructions），例如加入「請使用活潑的語氣」。

### Q3. CSV 分析檔用 Excel 打開是亂碼？

**A:** 這是 Excel 編碼問題。雖然程式已加入 BOM 簽名，若仍有亂碼，請改用 Excel 的 **「資料」->「從文字/CSV 匯入」** 功能，並選擇 `UTF-8` 編碼。