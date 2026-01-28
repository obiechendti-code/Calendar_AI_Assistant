/**
 * 工具庫：文字解析器 (Text Parser)
 * Utils: Calendar Parser
 * * 職責:
 * 1. 拆解行事曆標題 (Regex Parsing)
 * 2. 移除 HTML 標籤 (Sanitization)
 * 3. 整合分類器邏輯 (Integration with Classifier)
 *
 * 相依: Utils_Classifier.gs
 */

/**
 * 解析標題結構
 * 支援格式：
 * 1. 標準：@地點 [專案] 任務 (例如: @809 [中小微] 討論)
 * 2. 緊連：@地點_[專案] 任務 (例如: @809_[中小微] 討論)
 * 3. 倒裝：任務 [專案] (例如: 討論 [中小微])
 * * @param {string} title - 行程原始標題
 * @returns {Object} { location, attendee, project, task }
 */
function parseEventTitle(title) {
  // Regex 解析邏輯：
  // 1. (?:@(.+?))?  -> Group 1 (Location): @開頭，非貪婪匹配，整個群組可選
  // 2. \s* -> 允許 0~多個空白 (解決緊連問題)
  // 3. \[([^\]]+)\] -> Group 2 (Tag): 抓取 [] 內的內容
  // 4. \s*(.*)      -> Group 3 (Task): 剩餘文字
  const regexStandard = /^(?:@(.+?))?\s*\[([^\]]+)\]\s*(.*)/;
  
  // 備用結構：任務 [專案]
  const regexSuffix = /^(.*?)\s*\[([^\]]+)\]$/;

  let locationRaw = null;
  let projectTag = null;
  let taskRaw = title;

  const matchStandard = title.match(regexStandard);
  const matchSuffix = title.match(regexSuffix);

  if (matchStandard) {
    locationRaw = matchStandard[1]; 
    projectTag = matchStandard[2];
    taskRaw = matchStandard[3] || "無標題任務";
  } else if (matchSuffix) {
    taskRaw = matchSuffix[1];
    projectTag = matchSuffix[2];
  }

  // --- 資料清洗: Location ---
  let location = null;
  let attendee = null;

  if (locationRaw) {
    let prefixPart = locationRaw.trim();
    // 移除末端可能殘留的底線 (針對 @809_[xxx] 案例)
    while (prefixPart.endsWith('_')) {
      prefixPart = prefixPart.slice(0, -1);
    }
    const parts = prefixPart.split('_');
    location = parts[0].trim();
    attendee = parts.length > 1 ? parts[1].trim() : null;
  }

  // --- 資料清洗: Project (呼叫 Classifier) ---
  // 傳入 Tag 與 Task Title 進行雙重判斷
  const standardizedProject = classifyProject(projectTag, taskRaw);

  return {
    location: location,
    attendee: attendee,
    project: standardizedProject, 
    task: taskRaw.trim()
  };
}

/**
 * 輔助：移除 HTML 標籤
 * 用途：清洗 Calendar Description 中的 HTML 碼
 * @param {string} htmlDescription 
 * @returns {string} 純文字描述
 */
function cleanDescription(htmlDescription) {
  if (!htmlDescription) return "";
  return htmlDescription.replace(/<[^>]+>/g, '').trim();
}