/**
 * 流程控制：日曆行程歸檔 (Google Doc)
 * Workflow: Schedule Archiver
 * * * 職責 (Responsibilities):
 * 1. 執行舊檔案清理 (Cleanup Policy)
 * 2. 計算歸檔區間 (Time Frame: 當日 ~ 下週五)
 * 3. 建立歸檔資料夾結構 (Folder Structure)
 * 4. 抓取行程並格式化為文件內容 (Formatting)
 * 5. 產出 Google Doc 並移動至指定位置 (IO)
 *
 * 相依檔案 (Dependencies):
 * - Config.gs (ROOT_FOLDER_ID, CALENDAR_ID, RETENTION_DAYS)
 * - Utils_Parser.gs (parseEventTitle, cleanDescription)
 * - Utils_DriveManager.gs (executeCleanup, getOrCreateDailyFolder)
 */

function archiveWorkCalendarToDoc() {
  const now = new Date();
  console.log(`[Workflow] 開始執行 Doc 歸檔程序 [${now.toLocaleString()}]`);

  // --- Phase 1: 環境維護 (Maintenance) ---
  try {
    // 依據 Config 設定的保留天數，清除過期資料夾
    executeCleanup(CONFIG.ROOT_FOLDER_ID, CONFIG.RETENTION_DAYS);
  } catch (e) {
    console.warn("[Workflow] 清理過程異常 (非致命錯誤):", e);
  }

  // --- Phase 2: 時間定義 (Time Definition) ---
  // 設定範圍：當天 00:00 ~ 下週五 23:59 (Forward-looking View)
  
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(now);
  // 邏輯：計算距離「下一個週五」還有幾天，並再加上 7 天 (跨一週)
  // 若今天是週一，距離本週五 4 天 + 7 = 11 天後
  const daysUntilNextFriday = ((5 - now.getDay() + 7) % 7) + 7;
  endDate.setDate(now.getDate() + daysUntilNextFriday);
  endDate.setHours(23, 59, 59);

  console.log(`[Workflow] 歸檔區間: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`);

  // --- Phase 3: 空間準備 (Workspace Prep) ---
  
  const dateTag = Utilities.formatDate(now, "GMT+8", CONFIG.DATE_FORMAT_FOLDER);
  const timeTag = Utilities.formatDate(now, "GMT+8", CONFIG.DATE_FORMAT_DOC);
  
  // 命名規則：Calendar-yyyyMMdd / Schedule-yyyyMMdd-HHmm
  const folderName = `Calendar-${dateTag}`;
  const docName = `Schedule-${dateTag}-${timeTag}`;
  
  // 呼叫 Utils_DriveManager 取得目標資料夾
  const targetFolder = getOrCreateDailyFolder(CONFIG.ROOT_FOLDER_ID, folderName);

  // --- Phase 4: 資料獲取與排版 (Data Processing) ---
  
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const events = calendar.getEvents(startDate, endDate);
  
  // 建構文件內容 (Header)
  let content = `文件產出時間：${now.toLocaleString()}\n`;
  content += `行程區間：${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n`;
  content += `==========================================\n\n`;

  if (events.length === 0) {
    content += "此區間內無任何行程。\n";
  } else {
    let currentDayLabel = "";
    
    events.forEach(event => {
      const start = event.getStartTime();
      // 日期標籤：01/23 (Fri)
      const dayLabel = Utilities.formatDate(start, "GMT+8", "MM/dd (EEE)");
      
      // 換日分隔線邏輯
      if (dayLabel !== currentDayLabel) {
        content += `\n--- ${dayLabel} ---\n`;
        currentDayLabel = dayLabel;
      }

      const timeStr = Utilities.formatDate(start, "GMT+8", "HH:mm");
      
      // 呼叫 Utils_Parser 進行標題解析
      const meta = parseEventTitle(event.getTitle());

      // 組合單行行程資訊
      content += `【${timeStr}】 ${meta.task}\n`; 
      if (meta.project)  content += `   • 專案：${meta.project}\n`;
      if (meta.location) content += `   • 地點：${meta.location}\n`;
      if (meta.attendee) content += `   • 對象：${meta.attendee}\n`;
      
      // 處理備註與系統地點
      const cleanDesc = cleanDescription(event.getDescription());
      if (cleanDesc) content += `   > 備註：${cleanDesc}\n`;
      
      if (event.getLocation() && !meta.location) {
        content += `   > 地點(系統)：${event.getLocation()}\n`;
      }
    });
  }

  // --- Phase 5: 產出與交付 (Delivery) ---
  
  // 建立 Doc -> 寫入內容 -> 移動到歸檔資料夾
  const doc = DocumentApp.create(docName);
  doc.getBody().setText(content);
  
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(targetFolder);

  console.log(`[Workflow] 文件歸檔成功：${doc.getUrl()}`);
}