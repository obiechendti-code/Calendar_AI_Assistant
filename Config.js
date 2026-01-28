/**
 * 全域設定檔 (Configuration)
 * * 性質: 公開/邏輯設定 (Public Logic Configuration)
 * * 注意: 敏感資訊 (IDs, Keys) 已移至 Script Properties，請勿在此直接貼上。
 */

const scriptProps = PropertiesService.getScriptProperties();

// 輔助：安全讀取 JSON 字串 (用於讀取額外收件人清單)
function getSafeJson(key) {
  const raw = scriptProps.getProperty(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[Config] 解析 ${key} 失敗，回傳空陣列。`, e);
    return [];
  }
}

const CONFIG = {
  // --- [機密區] 從環境變數讀取 (Environment Variables) ---
  CALENDAR_ID:        scriptProps.getProperty("CALENDAR_ID"),
  ROOT_FOLDER_ID:     scriptProps.getProperty("ROOT_FOLDER_ID"),
  ANALYSIS_FOLDER_ID: scriptProps.getProperty("ANALYSIS_FOLDER_ID"),
  COMPANY_EMAIL:      scriptProps.getProperty("COMPANY_EMAIL"),
  
  // 額外收件人 (從 JSON 字串還原為陣列)
  ADDITIONAL_RECIPIENTS: getSafeJson("TEAM_EMAILS"),

  // API Keys
  NOTION_API_KEY:     scriptProps.getProperty("NOTION_API_KEY"),
  NOTION_DATABASE_ID: scriptProps.getProperty("NOTION_DATABASE_ID"),

  // --- [邏輯區] 通用設定 (General Settings) ---
  // 這裡的資訊不敏感，可以保留在程式碼中方便調整
  
  // 1. 策略設定
  RETENTION_DAYS: 14,             // 檔案保留天數
  GEMINI_MODEL: "gemini-2.0-flash-lite", // AI 模型版本
  
  // 2. 排程規則
  ACTIVE_DAYS: [1, 2, 3, 4, 5],   // 寄送工作日 (週一~週五)
  SKIP_KEYWORDS: ["Off", "休假", "Leave", "Holiday"], // 勿擾關鍵字
  
  // 3. 寄信規則
  SEND_TO_MYSELF: false,           // 是否寄給執行者 (Gmail)

  // 4. 功能開關
  ENABLE_NOTION_SYNC: true,       // 是否啟用 Notion

  // 5. 格式設定
  DATE_FORMAT_FOLDER: "yyyyMMdd",
  DATE_FORMAT_DOC: "HHmm"
};