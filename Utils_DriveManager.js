/**
 * 工具庫：Drive 檔案管理器 (File System Manager)
 * Utils: Drive Manager
 * * 職責:
 * 1. 資料夾結構管理 (Get or Create)
 * 2. 執行過期檔案清理 (Retention Policy)
 */

/**
 * 取得或建立指定名稱的子資料夾
 * @param {string} parentFolderId - 母資料夾 ID
 * @param {string} folderName - 目標資料夾名稱
 * @returns {GoogleAppsScript.Drive.Folder} 目標資料夾物件
 */
function getOrCreateDailyFolder(parentFolderId, folderName) {
  const parentFolder = DriveApp.getFolderById(parentFolderId);
  const subFolders = parentFolder.getFoldersByName(folderName);
  
  if (subFolders.hasNext()) {
    return subFolders.next();
  } else {
    // 若不存在則建立
    return parentFolder.createFolder(folderName);
  }
}

/**
 * 執行過期資料夾清理
 * 邏輯：掃描符合 "Calendar-yyyyMMdd" 格式的資料夾，刪除超過 retentionDays 的項目
 * * @param {string} parentFolderId - 掃描目標資料夾 ID
 * @param {number} retentionDays - 保留天數
 */
function executeCleanup(parentFolderId, retentionDays) {
  const parentFolder = DriveApp.getFolderById(parentFolderId);
  const folders = parentFolder.getFolders();
  const now = new Date();
  
  // Regex: 嚴格匹配 Calendar-yyyyMMdd
  const namePattern = /^Calendar-(\d{4})(\d{2})(\d{2})$/;
  let deletedCount = 0;

  while (folders.hasNext()) {
    const folder = folders.next();
    const match = folder.getName().match(namePattern);

    if (!match) continue; // 跳過非系統產生的資料夾

    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // JS Month is 0-indexed
    const day = parseInt(match[3]);
    const folderDate = new Date(year, month, day);
    
    const daysOld = (now - folderDate) / (1000 * 60 * 60 * 24);

    if (daysOld > retentionDays) {
      console.log(`[DriveManager] 清理過期資料夾：${folder.getName()} (${Math.floor(daysOld)}天前)`);
      folder.setTrashed(true);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`[DriveManager] 本次共清理 ${deletedCount} 個舊資料夾。`);
  }
}