// ===== 啟動 / 錯誤 =====

alert(
  "應用程式無法啟動，因為缺少以下 HTML 元素：\n\n" +
  missingElements.join("\n")
);

setStatus(
  "JSZip 載入失敗，請檢查 index.html 中的 JSZip script。",
  true
);

setStatus("應用程式已準備就緒。");


// ===== 模式說明 =====

elements.modeDescription.textContent =
  "單頁模式：系統會自動計算行數、欄數及相片尺寸。";

elements.modeDescription.textContent =
  "標準模式：每頁最多顯示 9 張相片。";


// ===== 相片選擇 =====

setStatus(
  `選擇相片失敗：${error.message}`,
  true
);

setStatus(
  "尚未選擇任何檔案。",
  true
);

setStatus(
  "沒有選擇支援的相片格式。請使用 JPG、JPEG 或 PNG 檔案。",
  true
);

let message =
  `已選擇 ${photos.length} 張相片。`;

message +=
  ` 已略過 ${duplicateCount} 個重複檔案。`;

message +=
  ` 已略過 ${rejectedCount} 個不支援的檔案。`;


// ===== 相片清單 =====

setStatus("已清除所有已選擇的相片。");

setStatus(
  `已選擇 ${photos.length} 張相片。`
);

setStatus("相片次序已更新。");

elements.photoCount.textContent =
  `已選擇 ${photos.length} 張`;

emptyState.textContent =
  "尚未選擇任何相片。";

image.alt =
  `已選擇的相片 ${index + 1}`;

title.textContent =
  `相片 ${index + 1}`;

captionInput.placeholder =
  "相片說明";


// ===== 按鈕 aria-label =====

"將相片向前移"

"將相片向後移"

"移除相片"


// ===== 產生報告前的檢查 =====

setStatus(
  "請先選擇 Word 範本。",
  true
);

setStatus(
  "範本必須為 .docx 檔案。",
  true
);

setStatus(
  "請輸入服務日期。",
  true
);

setStatus(
  "請輸入地點。",
  true
);

setStatus(
  "請至少選擇一張相片。",
  true
);

setStatus(
  "為確保相片保持清晰可讀，單頁模式最多支援 30 張相片。",
  true
);

setStatus(
  "JSZip 無法使用。",
  true
);


// ===== 產生 Word 報告 =====

setStatus(
  `正在準備 ${photos.length} 張相片...`
);

setStatus(
  `正在處理第 ${index + 1} 張相片，共 ${photos.length} 張...`
);

setStatus(
  "正在建立 Word 文件..."
);

setStatus(
  `報告已成功產生：${filename}`
);

setStatus(
  `產生報告失敗：${error.message}`,
  true
);


// ===== Word 範本 / XML 錯誤 =====

throw new Error(
  "所選檔案不是有效的 Word 範本。"
);

throw new Error(
  `Word 範本缺少 ${placeholder}。`
);

throw new Error(
  "Word 文件的 XML 格式無效。"
);

throw new Error(
  "找不到相片預留位置所在的段落。"
);

throw new Error(
  "產生的相片 XML 格式無效。"
);

throw new Error(
  "未能產生相片版面。"
);


// ===== 圖片處理 =====

throw new Error(
  "無法使用圖片處理 Canvas。"
);

throw new Error(
  `無法處理 ${file.name}。`
);

throw new Error(
  `無法讀取 ${file.name}。`
);


// ===== 單頁模式 =====

throw new Error(
  "無法計算適合單頁顯示的版面配置。"
);


// ===== Word package errors =====

throw new Error(
  "Word relationships 檔案格式無效。"
);

throw new Error(
  "Word content-types 檔案格式無效。"
);
