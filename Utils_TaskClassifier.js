/**
 * 工具庫：專案分類器 (Project Classifier)
 * Utils: Calander Task Classifier
 * * 職責:
 * 1. 定義 日曆工作項目 的關鍵字映射表 (Mapping Rules)
 * 2. 執行雙重判定邏輯 (Title Priority > Tag Priority)
 */

// --- 設定區域 (Mapping Config) ---

// 1. 標題關鍵字規則 (優先級：最高)
// 若標題包含這些字，直接強制歸類，忽略 [] 標籤
const TITLE_MAP = {
  "研究紀錄簿": "行政類",
  "報帳": "行政類",
  "休假": "行政類",
  "讀書會": "營運類",
  "研究紀錄簿": "營運類",
  "策略會議": "策略規劃"
};

// 2. 標籤關鍵字規則 (優先級：次之)
// 比對 [] 內的文字
const TAG_MAP = {
  // 專案: 2026_中企署_中小微AI
  "中小微": "中小微AI",
  "中小企業": "中小微AI",
  "中企署": "中小微AI",
  "AI準備度": "中小微AI",

  // 專案: 2026_數產署_Edge AI
  "Edge": "Edge AI",
  "Edge AI": "Edge AI",
  "數產署": "Edge AI",
  "邊緣雲": "Edge AI",
  "3D建模": "Edge AI",
  "工具鏈": "Edge AI"
};

// --- 邏輯區域 (Logic) ---

/**
 * 核心分類函式 (不分大小寫)
 * @param {string} tag - 從 [] 解析出的標籤
 * @param {string} taskTitle - 任務標題
 * @returns {string} 標準化專案名稱 (Default: "其他")
 */
function classifyProject(tag, taskTitle) {
  // Rule 1: 檢查標題 (Title Check)
  if (taskTitle) {
    const lowerTitle = taskTitle.toLowerCase();
    for (const [keyword, category] of Object.entries(TITLE_MAP)) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Rule 2: 檢查標籤 (Tag Check)
  if (tag) {
    const cleanTag = tag.trim().toLowerCase();
    for (const [key, projectName] of Object.entries(TAG_MAP)) {
      if (cleanTag.includes(key.toLowerCase())) {
        return projectName;
      }
    }
  }

  // Rule 3: 無匹配 (Fallback)
  return "其他";
}