# CLASP 開發者部署指南 (Developer Guide)
**Project Status:** Stable (v3.4) | **Maintainer:** Obie Chen | Updated: Mar.11.2026

本指南專為熟悉 Git 工作流與 Command Line 的開發者設計。透過 Google 官方的 `clasp` (Command Line Apps Script Projects) 工具，您可以將 Google Apps Script (GAS) 專案與本機端的 IDE (如 VS Code) 綁定，並導入嚴謹的版本控制 (Version Control)。

## ⚠️ 核心資安守則 (Quality-gated)

在開始前，請務必了解本專案的資安架構：

- **絕對禁止**將真實的 API Key (如 Gemini API Key) 或 Calendar ID 直接寫死在程式碼 (`.js` / `.gs`) 中。
- 所有的機密憑證必須透過 `Utils_Setup.gs` 寫入 GAS 雲端的 **Script Properties** 中。
- 在本機端開發時，`Utils_Setup.gs` 內的常數值必須保持為空字串 `""`。

## 1. 環境準備 (Prerequisites)

1. **安裝 Node.js**：請確保您的電腦已安裝 [Node.js](https://nodejs.org/) (建議 LTS 版本)。
2. **啟用 Apps Script API**：
    - 前往 [Google Apps Script 儀表板設定](https://script.google.com/home/usersettings)
    - 將 **Google Apps Script API** 切換為「開啟 (On)」。

## 2. 工具安裝與授權 (Installation & Login)

開啟終端機 (Terminal)，全域安裝 clasp：

```
npm install -g @google/clasp
```

完成後，執行登入指令。這會開啟瀏覽器，請選擇您的 Google 帳號並授權：

```
clasp login
```

## 3. 專案同步 (Project Synchronization)

### 情況 A：首次拉取雲端專案至本機

若您已經在 Google Drive 建立好 GAS 專案，請先取得該專案的 `Script ID` (位於 GAS 編輯器網址列 `d/` 與 `/edit` 之間的字串)。

在您的本機資料夾中執行：

```
clasp clone <您的_Script_ID>
```

### 情況 B：日常開發同步

- **從雲端同步至本機 (Pull)**：當在 GAS 網頁版有修改時，拉回本機。
    
    ```
    clasp pull
    ```
    
- **從本機推送到雲端 (Push)**：在本機 VS Code 修改完畢後，覆蓋雲端代碼。
    
    ```
    clasp push
    ```
    

## 4. 關鍵設定檔說明 (Configuration Files)

使用 CLASP 時，專案根目錄會產生兩個極度重要的隱藏檔：

### `.clasp.json` (專案指南針)

紀錄了雲端專案的 ID 與本機根目錄。

- **⚠️ 嚴重警告**：此檔案**絕對不可**被提交至 GitHub。若外洩，他人可能直接覆蓋您的雲端專案。
- **防呆措施**：請確保專案根目錄的 `.gitignore` 檔案內包含 `.clasp.json`。

### `.claspignore` (推送過濾器)

類似 `.gitignore`，用來告訴 clasp 在執行 `clasp push` 時，哪些檔案**不要**推送到 Google 雲端 (例如 `node_modules/` 或 `README.md`)。
建議的 `.claspignore` 內容：

```
**/**
!src/**/*.js
!src/**/*.html
!appsscript.json
```

*(這表示只推送 src 資料夾下的程式碼與 GAS 設定檔)*

## 5. 建議的協作工作流 (Recommended Workflow)

我們採用 **"Local-first, Git-backed"** 的決策流程：

1. **Pull**: 確保本機是最新的 (`clasp pull`)。
2. **Check**: 檢查 `Utils_Setup.js`，確認沒有不小心將本機測試用的 API Key 存入。
3. **Commit**: 將異動提交至本機 Git (`git add .`, `git commit -m "..."`)。
4. **Push to GitHub**: 備份至遠端版本庫 (`git push`)。
5. **Deploy to GAS**: 推送至 Google 雲端正式服役 (`clasp push`)。