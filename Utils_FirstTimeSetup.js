/**
 * 工具庫：環境變數設定 (Environment Setup)
 * Utils: Setup
 * * 用途: 
 * 將敏感資料 (Secrets) 寫入 Script Properties (後台保險箱)。
 * * * 使用說明 (Instruction):
 * 1. 在下方 `SECRETS` 物件中填入您的真實 ID 與 Key。
 * 2. 執行 `runFirstTimeSetup` 函式。
 * 3. 確認 Log 顯示「設定完成」。
 * 4. [重要] 執行後，請將下方的真實資料刪除 (回復為空字串)，再分享程式碼。
 */

function runFirstTimeSetup() {
  // === [機密區] 請在此填入您的真實資訊 ===
  const SECRETS = {
    "CALENDAR_ID":        "請填入_日曆ID",
    "ROOT_FOLDER_ID":     "請填入_歸檔資料夾ID",
    "ANALYSIS_FOLDER_ID": "請填入_分析資料夾ID",
    
    // 個人與公司信箱
    "COMPANY_EMAIL":      "your.name@yourcompany.com",
    
    // 團隊額外收件人 (請使用 JSON 格式字串，例如 '["a@b.com", "c@d.com"]' )
    // 若無可留空
    "TEAM_EMAILS":        '[]', 
    
    // API Keys
    "GEMINI_API_KEY":     "請填入_Gemini_Key",
    //"NOTION_API_KEY":     "", // 若無可留空
    //"NOTION_DATABASE_ID": ""  // 若無可留空
  };
  // ======================================

  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 寫入後台
  // 過濾掉空值或未填寫的欄位，避免覆蓋既有設定
  for (const [key, value] of Object.entries(SECRETS)) {
    if (value && value.trim() !== "" && !value.includes("請填入")) {
      scriptProperties.setProperty(key, value.trim());
      console.log(`[Setup] 已儲存變數: ${key}`);
    }
  }

  console.log("---------------------------------------------------");
  console.log("✅ 環境變數設定完成！");
  console.log("您現在可以安全地清空此檔案中的機密資訊，程式仍可正常運作。");
  console.log("---------------------------------------------------");
}

/**
 * [檢測用] 查看目前已儲存的屬性鍵名 (不顯示值，確保安全)
 */
function checkStoredProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const keys = Object.keys(props);
  console.log("目前後台已儲存的變數 Key:", keys);
}

/**
 * [危險] 清除所有設定 (慎用)
 */
function deleteAllProperties() {
  // PropertiesService.getScriptProperties().deleteAllProperties();
  // console.log("已清除所有設定。");
}