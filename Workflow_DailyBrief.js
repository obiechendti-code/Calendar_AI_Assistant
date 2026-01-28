/**
 * 流程控制：每日 AI 行程匯報
 * Workflow: Daily Schedule Briefing
 * * 職責 (Responsibilities):
 * 1. 排程守門員 (Gatekeeper): 檢查星期幾、休假關鍵字 (Config)
 * 2. 資料獲取 (Extraction): 讀取 Calendar Events
 * 3. 核心處理 (Processing): 呼叫 Gemini AI (Prompt + Model)
 * 4. 派送交付 (Delivery): 寄送 Gmail (HTML)、同步 Notion DB
 * 5. [優化] 異常處理 (Resilience): 全域錯誤攔截與主動通知
 *
 * 相依檔案 (Dependencies):
 * - Config.gs
 * - Prompt.gs
 * - Utils_CalendarParser.gs
 * - Utils_TaskClassifier.gs
 * - Utils_Notion.gs (Optional)
 */

function sendDailyBriefing() {
  const now = new Date();

  // [優化] 加入全域錯誤攔截 (Global Error Handling)
  // 確保即使程式崩潰，也能收到通知，而不是無聲無息地失敗
  try {
    
    // --- Phase 1: 星期幾檢查 (Gatekeeping Level 1) ---
    const dayOfWeek = now.getDay();
    if (!CONFIG.ACTIVE_DAYS.includes(dayOfWeek)) {
      console.log(`[Workflow] 略過：今天是星期 ${dayOfWeek}，不在排程清單中。`);
      return;
    }

    // --- Phase 2: 資料獲取 (Extraction - 僅做一次) ---
    // [優化] 提早抓取 Events，供後續 "休假檢查" 與 "資料處理" 共用，節省 API 呼叫
    const events = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID).getEventsForDay(now);

    if (events.length === 0) {
      console.log("[Workflow] 今日無行程 (Empty Schedule)。");
      // 視需求可 return
      // return; 
    }

    // --- Phase 3: 休假/勿擾檢查 (Gatekeeping Level 2) ---
    // 使用已抓取的 events 進行檢查
    const isOffDay = events.some(event => {
      if (!event.isAllDayEvent()) return false;
      const title = event.getTitle().toLowerCase();
      return CONFIG.SKIP_KEYWORDS.some(keyword => title.includes(keyword.toLowerCase()));
    });

    if (isOffDay) {
      console.log(`[Workflow] 略過：偵測到「休假/勿擾」行程。`);
      return;
    }

    // --- Phase 4: 資料處理 (Data Processing) ---
    console.log(`[Workflow] 開始執行匯報流程...`);
    
    let scheduleContext = [];
    let projectTags = new Set();

    events.forEach(event => {
      const meta = parseEventTitle(event.getTitle());
      const timeStr = `${Utilities.formatDate(event.getStartTime(), "GMT+8", "HH:mm")} - ${Utilities.formatDate(event.getEndTime(), "GMT+8", "HH:mm")}`;
      
      scheduleContext.push({
        time: timeStr,
        title: meta.task,
        project: meta.project,
        location: meta.location,
        attendee: meta.attendee
      });

      if (meta.project && meta.project !== "其他") {
        projectTags.add(meta.project);
      }
    });

    // --- Phase 5: AI 生成 (Intelligence) ---
    const briefingContent = callGeminiAPI(scheduleContext);

    if (!briefingContent || briefingContent.startsWith("(AI")) {
      // 這裡 throw error 會觸發 catch 區塊寄送錯誤通知
      throw new Error("Gemini API 回傳無效內容或連線失敗。");
    }

    // --- Phase 6: 交付派送 (Delivery) ---

    // 6.1 Gmail 交付
    const recipient = getRecipients();
    const subject = `【工作匯報】${Utilities.formatDate(now, "GMT+8", "MM/dd")} 行程與重點提示`;
    
    if (recipient) {
      GmailApp.sendEmail(
        recipient,
        subject,
        "您的郵件軟體不支援 HTML，請切換檢視模式。",
        { htmlBody: briefingContent }
      );
      console.log(`[Workflow] Email 已交付給：${recipient}`);
    } else {
      console.warn("[Workflow] 警示：未設定收件人，略過寄信。");
    }

    // 6.2 Notion 同步 (Optional)
    if (typeof saveBriefingToNotion === 'function' && CONFIG.ENABLE_NOTION_SYNC) {
      saveBriefingToNotion(now, briefingContent, Array.from(projectTags));
      console.log(`[Workflow] Notion 資料已同步。`);
    }
    
    console.log(`[Workflow] 流程執行完畢。`);

  } catch (e) {
    // --- Exception Handling ---
    console.error("[Workflow] 發生嚴重錯誤:", e);
    
    // 嘗試寄送錯誤報告給執行者 (Admin)
    try {
      const adminEmail = Session.getActiveUser().getEmail();
      if (adminEmail) {
        GmailApp.sendEmail(
          adminEmail,
          `【系統警報】每日匯報執行失敗 (${Utilities.formatDate(now, "GMT+8", "MM/dd HH:mm")})`,
          `您的 GAS 腳本在執行過程中發生未預期的錯誤，請檢查 Log。\n\n錯誤訊息：\n${e.toString()}\n\nStack Trace:\n${e.stack}`
        );
        console.log(`[Resilience] 已發送錯誤警報給管理員: ${adminEmail}`);
      }
    } catch (mailError) {
      console.error("無法發送錯誤警報信:", mailError);
    }
  }
}

/**
 * 輔助：產生收件人清單 (由 Config 驅動)
 */
function getRecipients() {
  let recipientList = [];

  // 1. 寄給自己
  if (CONFIG.SEND_TO_MYSELF) {
    const selfEmail = Session.getActiveUser().getEmail();
    if (selfEmail && selfEmail !== "") {
      recipientList.push(selfEmail);
    } else {
      console.warn("[Workflow] 警告：無法抓取當前使用者 Email，已略過。");
    }
  }

  // 2. 公司信箱 (Config 讀取)
  if (CONFIG.COMPANY_EMAIL && CONFIG.COMPANY_EMAIL.trim() !== "") {
    recipientList.push(CONFIG.COMPANY_EMAIL);
  }

  // 3. 額外名單 (Config 陣列)
  if (CONFIG.ADDITIONAL_RECIPIENTS && Array.isArray(CONFIG.ADDITIONAL_RECIPIENTS)) {
    const validEmails = CONFIG.ADDITIONAL_RECIPIENTS.filter(email => email && email.trim() !== "");
    recipientList = recipientList.concat(validEmails);
  }

  // 4. 去重並合併
  const uniqueList = [...new Set(recipientList)];

  if (uniqueList.length === 0) {
    console.warn("警示：收件人列表為空，請檢查 Config 設定。");
    return null;
  }

  return uniqueList.join(",");
}

/**
 * 核心：Gemini API 介接
 * 依賴: Config.gs (GEMINI_MODEL), Prompt.gs (PROMPT_DAILY_BRIEF)
 */
function callGeminiAPI(scheduleData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  const modelVersion = CONFIG.GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelVersion}:generateContent?key=${apiKey}`;
  
  const geminiInstruction = PROMPT_DAILY_BRIEF;

  const payload = {
    "contents": [{ "parts": [{"text": `今日行程資料如下：\n${JSON.stringify(scheduleData)}`}] }],
    "systemInstruction": { "parts": [{"text": geminiInstruction}] }
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const json = JSON.parse(response.getContentText());

    if (code !== 200) {
      console.error(`[Gemini] API 錯誤 ${code}:`, json);
      return null;
    }
    
    if (json.candidates && json.candidates.length > 0) {
      return json.candidates[0].content.parts[0].text;
    } else {
      console.warn("[Gemini] API 回傳成功但無內容。");
      return null;
    }
  } catch (e) {
    console.error("[Gemini] 連線請求失敗: ", e);
    // 這裡不 throw，回傳 null 讓外層統一處理
    return null;
  }
}