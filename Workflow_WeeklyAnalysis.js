/**
 * 流程控制：每週日曆數據分析歸檔 (CSV)
 * Workflow: Weekly Analysis Archiver
 * * 職責 (Responsibilities):
 * 1. 時間定義 (Time Definition): 計算上一個完整週 (週日~週六) 的區間
 * 2. 資料獲取 (Extraction): 讀取 Google Calendar 行程
 * 3. 資料清洗 (Transformation): 解析標題、計算時數、格式化為 CSV (含轉義處理)
 * 4. 儲存交付 (Storage): 寫入 Google Drive，並具備內容比對功能 (Idempotency) 以避免重複寫入
 *
 * 相依檔案 (Dependencies):
 * - Config.gs (CALENDAR_ID, ANALYSIS_FOLDER_ID)
 * - Utils_Parser.gs (parseEventTitle, cleanDescription)
 */

function archiveWeeklyAnalysisToDrive() {
  const now = new Date();
  console.log(`[Workflow] 開始執行週分析歸檔 [${now.toLocaleString()}]`);

  // --- Phase 1: 時間定義 (Time Definition) ---
  // 目標：抓取「上一個完整的週日到週六」
  // 邏輯：不管今天星期幾執行，都回推到最近的一個週六作為結束點
  
  // today(Day) + 1。例如週二(2)執行，回推 3 天是週六
  const daysSinceLastSaturday = now.getDay() + 1;
  
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - daysSinceLastSaturday);
  endDate.setHours(23, 59, 59, 999);

  // 開始時間：結束時間再往前推 6 天 (即上一個週日)
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6); 
  startDate.setHours(0, 0, 0, 0);

  // 檔名格式：Weekly_Analysis_yyyyMMdd-yyyyMMdd.csv
  const fStart = Utilities.formatDate(startDate, "GMT+8", "yyyyMMdd");
  const fEnd = Utilities.formatDate(endDate, "GMT+8", "yyyyMMdd");
  const fileName = `Weekly_Analysis_${fStart}-${fEnd}.csv`;
  
  console.log(`[Workflow] 分析區間: ${startDate.toLocaleDateString()} (日) ~ ${endDate.toLocaleDateString()} (六)`);

  // --- Phase 2: 資料獲取 (Data Extraction) ---
  
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const events = calendar.getEvents(startDate, endDate);

  if (events.length === 0) {
    console.warn("[Workflow] 此區間內無任何行程，跳過檔案建立。");
    return;
  }

  // --- Phase 3: 資料轉換 (Data Transformation) ---
  // 目標：產出標準 CSV 格式，供 Excel 或 Data Studio 分析
  
  const headers = [
    "Date", "Day", "Time_Start", "Time_End", "Duration_Hrs", 
    "Project", "Task", "Location", "Attendee", "Raw_Title", "Description"
  ];
  
  // 初始化 CSV 內容 (表頭)
  let csvBody = headers.join(",") + "\n";

  events.forEach(event => {
    const start = event.getStartTime();
    const end = event.getEndTime();
    
    // 呼叫 Utils_Parser 進行標準化解析
    // 這會自動處理 [Edge AI]、[中小微] 等專案分類
    const meta = parseEventTitle(event.getTitle()); 
    const cleanDesc = cleanDescription(event.getDescription());
    
    // 計算時數 (保留小數點後兩位)
    const durationHrs = ((end - start) / (1000 * 60 * 60)).toFixed(2);
    
    // 準備單列資料
    const row = [
      Utilities.formatDate(start, "GMT+8", "yyyy-MM-dd"), // Date
      Utilities.formatDate(start, "GMT+8", "EEE"),        // Day
      Utilities.formatDate(start, "GMT+8", "HH:mm"),      // Start
      Utilities.formatDate(end, "GMT+8", "HH:mm"),        // End
      durationHrs,                                        // Duration
      meta.project || "",                                 // Project (已分類)
      meta.task || "",                                    // Task
      meta.location || event.getLocation() || "",         // Location
      meta.attendee || "",                                // Attendee
      event.getTitle(),                                   // Raw Title (備查)
      cleanDesc                                           // Description
    ];

    // CSV 轉義處理 (Escaping)
    // 若欄位包含逗號、換行或雙引號，需用雙引號包覆，並將內部的雙引號轉義為 ""
    const escapedRow = row.map(field => {
      const stringField = String(field);
      if (stringField.includes(",") || stringField.includes("\n") || stringField.includes('"')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    });

    csvBody += escapedRow.join(",") + "\n";
  });

  // [關鍵] 加入 BOM (\uFEFF) 讓 Excel 能正確識別 UTF-8 中文
  const finalCsvContent = '\uFEFF' + csvBody;

  // --- Phase 4: 儲存交付 (Storage & Idempotency) ---
  
  try {
    const targetFolder = DriveApp.getFolderById(CONFIG.ANALYSIS_FOLDER_ID);
    const existingFiles = targetFolder.getFilesByName(fileName);
    
    if (existingFiles.hasNext()) {
      // 檔案已存在：檢查內容是否變更 (Idempotency Check)
      // 避免每次執行都更新檔案，造成版本紀錄 (Version History) 氾濫
      const file = existingFiles.next();
      const currentFileContent = file.getBlob().getDataAsString();

      if (currentFileContent === finalCsvContent) {
        console.log(`[Workflow] 略過：檔案已存在且內容無異動 (${fileName})`);
      } else {
        file.setContent(finalCsvContent);
        console.log(`[Workflow] 更新：偵測到內容變更，已更新檔案 (${fileName})`);
      }
    } else {
      // 檔案不存在：直接建立
      targetFolder.createFile(fileName, finalCsvContent, MimeType.CSV);
      console.log(`[Workflow] 新建：CSV 分析檔已建立 (${fileName})`);
    }
  } catch (e) {
    console.error(`[Workflow] 錯誤：檔案寫入失敗 - ${e.toString()}`);
  }
}