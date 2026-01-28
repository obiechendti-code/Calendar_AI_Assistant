/**
 * 工具庫：系統除錯與診斷 (System Debug & Diagnostics)
 * Utils: Debug
 * * 職責 (Responsibilities):
 * 1. API 連線測試: 驗證 Gemini API Key 是否有效
 * 2. 模型清單檢索: 列出帳號權限下可用的所有模型
 * 3. 設定檔驗證: 自動檢查 Config 中設定的模型是否存在於可用清單中
 * 4. 單元測試 (Unit Test): 驗證 Parser 與 Classifier 邏輯正確性
 * 5. 安全檢查 (Safety Check): 執行前確認 Config 設定是否安全
 *
 * 備註:
 * 此檔案之函式僅供開發者「手動執行」以排除故障，不應被自動化流程呼叫。
 *
 * 相依檔案 (Dependencies):
 * - Config.gs (讀取 GEMINI_MODEL, RECIPIENT 設定)
 * - Workflow_DailyBrief.gs (若需測試 getRecipients 函式)
 * - Utils_CalendarParser.gs (若需測試 parseEventTitle 函式)
 */

/**
 * [手動執行] 診斷 Gemini API 模型清單
 * 用途：
 * 1. 測試 API Key 連線是否正常 (200 OK)
 * 2. 列出支援 generateContent (文字生成) 的模型
 * 3. [關鍵功能] 自動比對 Config.gs 中的設定是否有效
 */
function debugModelList() {
  console.log(">>> 開始執行 Gemini API 模型診斷 <<<");

  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("[Debug] 錯誤：找不到 GEMINI_API_KEY，請檢查指令碼屬性。");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code !== 200) {
      console.error(`[Debug] 連線失敗 (Code: ${code})`);
      console.error(`[Debug] 錯誤訊息: ${text}`);
      return;
    }

    const json = JSON.parse(text);

    if (json.models) {
      console.log("=== 您的 API Key 可用模型清單 ===");
      
      const availableModels = json.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace("models/", ""));
      
      console.log(availableModels.join("\n"));
      console.log("==================================");

      // 設定檔驗證
      if (typeof CONFIG !== 'undefined' && CONFIG.GEMINI_MODEL) {
        const currentConfigModel = CONFIG.GEMINI_MODEL;
        console.log(`[檢查] 目前 Config 設定值: "${currentConfigModel}"`);

        if (availableModels.includes(currentConfigModel)) {
          console.log(`[結果] ✅ 設定正確：模型存在且權限正常。`);
        } else {
          console.warn(`[結果] ⚠️ 潛在風險：設定的模型 "${currentConfigModel}" 未出現在可用清單中。`);
          console.warn(`       可能原因：拼字錯誤、模型尚未對此 Key 開放、或該模型不支援 generateContent。`);
        }
      } else {
        console.warn("[檢查] 無法讀取 CONFIG.GEMINI_MODEL，略過設定驗證。");
      }

    } else {
      console.error("[Debug] 無法解析模型列表，API 回傳結構異常。", json);
    }
  } catch (e) {
    console.error("[Debug] 執行過程發生例外錯誤：", e);
  }
}

/**
 * [手動執行] 單元測試：標題解析器 (Calendar Parser)
 * 用途: 確保各種寫法的標題都能正確拆解出地點、專案與任務
 * (原 Tests.gs 中的 test_CalendarParser)
 */
function debugCalendarParser() {
  console.log(">>> 開始測試: Utils_CalendarParser (Unit Test) <<<");

  // 確保依賴存在
  if (typeof parseEventTitle !== 'function') {
    console.error("❌ 找不到 parseEventTitle 函式，請確認 Utils_CalendarParser.gs 是否存在。");
    return;
  }

  const testCases = [
    { 
      input: "@809 [中小微] 討論計畫", 
      expectedProject: "中小微AI", 
      desc: "標準格式 (@地點 [專案] 任務)" 
    },
    { 
      input: "@809_[中小微] 討論計畫", 
      expectedProject: "中小微AI", 
      desc: "緊連格式 (@地點_[專案] 任務)" 
    },
    { 
      input: "填寫研究紀錄簿", 
      expectedProject: "行政類", 
      desc: "無標籤，靠標題關鍵字歸類" 
    },
    { 
      input: "[Edge] 模型測試", 
      expectedProject: "Edge AI", 
      desc: "無地點，僅有標籤" 
    }
  ];

  let passCount = 0;
  testCases.forEach((tc, index) => {
    const result = parseEventTitle(tc.input);
    const isPass = result.project === tc.expectedProject;
    
    const status = isPass ? "✅ 通過" : `❌ 失敗 (預期: ${tc.expectedProject}, 實際: ${result.project})`;
    console.log(`Case ${index + 1} [${tc.desc}]: ${status}`);
    
    if (!isPass) {
      console.log("   解析結果:", JSON.stringify(result));
    } else {
      passCount++;
    }
  });

  console.log("---------------------------------------------------");
  console.log(`測試結果: ${passCount}/${testCases.length} 通過`);
}

/**
 * [手動執行] 設定檔安全檢查 (Config Safety Check)
 * 用途: 在執行 sendDailyBriefing 前，確認信不會寄給閒雜人等，並檢查基本設定
 * (原 Tests.gs 中的 checkConfigSafety，與 debugRecipientList 整合)
 */
function debugConfigSafety() {
  console.log(">>> 設定檔安全檢查 (Config Safety Check) <<<");
  
  if (typeof CONFIG === 'undefined') {
    console.error("❌ 找不到 CONFIG 物件，請確認 Config.gs 是否存在。");
    return;
  }

  console.log(`1. 目前模型: ${CONFIG.GEMINI_MODEL}`);
  console.log(`2. 寄給自己: ${CONFIG.SEND_TO_MYSELF}`);
  console.log(`3. 額外收件人: ${JSON.stringify(CONFIG.ADDITIONAL_RECIPIENTS)}`);
  console.log(`4. 公司信箱: ${CONFIG.COMPANY_EMAIL ? CONFIG.COMPANY_EMAIL : "(未設定)"}`);
  
  if (typeof getRecipients === 'function') {
    const recipients = getRecipients(); // 呼叫 Workflow 裡的輔助函式
    console.log(`\n[預覽] 若現在執行，信件將寄給: \n${recipients}`);
    
    if (CONFIG.ADDITIONAL_RECIPIENTS && CONFIG.ADDITIONAL_RECIPIENTS.length > 0) {
      console.warn("\n⚠️ 注意：額外收件人清單不為空。若這只是測試，建議先在 Config.gs 將其註解掉。");
    } else {
      console.log("\n✅ 安全：目前只會寄給您自己 (或清單為空)。");
    }
  } else {
    console.warn("\n⚠️ 無法呼叫 getRecipients，無法預覽收件人字串。");
  }
}