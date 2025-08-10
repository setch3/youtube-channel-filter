/**
 * チャンネル情報抽出機能の単体テスト
 * ブラウザのコンソールで実行可能
 */

// テスト用のヘルパー関数
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expectedStr}, Actual: ${actualStr}`);
  }
}

/**
 * extractChannelFromUrl関数のテスト
 */
function testExtractChannelFromUrl() {
  console.log('Testing extractChannelFromUrl...');
  
  // テストケース1: @ハンドル形式のURL
  let result = extractChannelFromUrl('https://www.youtube.com/@TechChannel');
  assertDeepEqual(result, { channelId: null, channelHandle: '@TechChannel' }, 'Handle URL test');
  
  // テストケース2: /c/形式のURL
  result = extractChannelFromUrl('https://www.youtube.com/c/TechChannel');
  assertDeepEqual(result, { channelId: 'TechChannel', channelHandle: null }, '/c/ URL test');
  
  // テストケース3: /channel/形式のURL
  result = extractChannelFromUrl('https://www.youtube.com/channel/UC1234567890');
  assertDeepEqual(result, { channelId: 'UC1234567890', channelHandle: null }, '/channel/ URL test');
  
  // テストケース4: /user/形式のURL
  result = extractChannelFromUrl('https://www.youtube.com/user/OldUserName');
  assertDeepEqual(result, { channelId: 'OldUserName', channelHandle: null }, '/user/ URL test');
  
  // テストケース5: 動画URLにチャンネル情報が含まれている場合
  result = extractChannelFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&channel=TestChannel');
  assertDeepEqual(result, { channelId: 'TestChannel', channelHandle: null }, 'Video URL with channel param test');
  
  // テストケース6: youtu.be短縮URL
  result = extractChannelFromUrl('https://youtu.be/dQw4w9WgXcQ');
  assertDeepEqual(result, { channelId: null, channelHandle: null }, 'Short URL test');
  
  // テストケース7: 無効なURL
  result = extractChannelFromUrl('invalid-url');
  assertDeepEqual(result, { channelId: null, channelHandle: null }, 'Invalid URL test');
  
  // テストケース8: null/undefined入力
  result = extractChannelFromUrl(null);
  assertDeepEqual(result, { channelId: null, channelHandle: null }, 'Null input test');
  
  result = extractChannelFromUrl(undefined);
  assertDeepEqual(result, { channelId: null, channelHandle: null }, 'Undefined input test');
  
  // テストケース9: 空文字列
  result = extractChannelFromUrl('');
  assertDeepEqual(result, { channelId: null, channelHandle: null }, 'Empty string test');
  
  // テストケース10: プロトコルなしのURL
  result = extractChannelFromUrl('www.youtube.com/@TestChannel');
  assertDeepEqual(result, { channelId: null, channelHandle: '@TestChannel' }, 'URL without protocol test');
  
  // テストケース11: 日本語チャンネル名
  result = extractChannelFromUrl('https://www.youtube.com/c/テストチャンネル');
  assertDeepEqual(result, { channelId: 'テストチャンネル', channelHandle: null }, 'Japanese channel name test');
  
  // テストケース12: URLエンコードされたチャンネル名
  result = extractChannelFromUrl('https://www.youtube.com/c/%E3%83%86%E3%82%B9%E3%83%88');
  assertDeepEqual(result, { channelId: 'テスト', channelHandle: null }, 'URL encoded channel name test');
  
  console.log('✓ extractChannelFromUrl tests passed');
}

/**
 * extractChannelNameFromElement関数のテスト
 */
function testExtractChannelNameFromElement() {
  console.log('Testing extractChannelNameFromElement...');
  
  // テスト用のDOM要素を作成
  function createTestElement(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.firstElementChild;
  }
  
  // テストケース1: cite要素からチャンネル名を抽出
  let testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test">Test Video</a>
      <cite>https://www.youtube.com/@TestChannel</cite>
    </div>
  `;
  let element = createTestElement(testHtml);
  let link = element.querySelector('a');
  let result = extractChannelNameFromElement(link);
  assertEqual(result, 'TestChannel', 'Extract from cite element test');
  
  // テストケース2: VuuXrf要素からチャンネル名を抽出
  testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test">Test Video</a>
      <div class="VuuXrf">Tech Channel Name</div>
    </div>
  `;
  element = createTestElement(testHtml);
  link = element.querySelector('a');
  result = extractChannelNameFromElement(link);
  assertEqual(result, 'Tech Channel Name', 'Extract from VuuXrf element test');
  
  // テストケース3: タイトルから「- YouTube」パターンでチャンネル名を抽出
  testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test">Test Video</a>
      <h3>Amazing Tech Channel - YouTube</h3>
    </div>
  `;
  element = createTestElement(testHtml);
  link = element.querySelector('a');
  result = extractChannelNameFromElement(link);
  assertEqual(result, 'Amazing Tech Channel', 'Extract from title with YouTube suffix test');
  
  // テストケース4: 日付表記を除外
  testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test">Test Video</a>
      <div class="VuuXrf">3日前</div>
    </div>
  `;
  element = createTestElement(testHtml);
  link = element.querySelector('a');
  result = extractChannelNameFromElement(link);
  assertEqual(result, null, 'Exclude date pattern test');
  
  // テストケース5: 数字のみを除外
  testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test">Test Video</a>
      <div class="VuuXrf">123456</div>
    </div>
  `;
  element = createTestElement(testHtml);
  link = element.querySelector('a');
  result = extractChannelNameFromElement(link);
  assertEqual(result, null, 'Exclude numbers only test');
  
  // テストケース6: 日本語チャンネル名
  testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test">Test Video</a>
      <div class="VuuXrf">テクノロジーチャンネル</div>
    </div>
  `;
  element = createTestElement(testHtml);
  link = element.querySelector('a');
  result = extractChannelNameFromElement(link);
  assertEqual(result, 'テクノロジーチャンネル', 'Japanese channel name test');
  
  // テストケース7: 無効な要素
  result = extractChannelNameFromElement(null);
  assertEqual(result, null, 'Null element test');
  
  // テストケース8: 親コンテナが見つからない場合
  const orphanElement = document.createElement('a');
  orphanElement.href = 'https://www.youtube.com/watch?v=test';
  result = extractChannelNameFromElement(orphanElement);
  assertEqual(result, null, 'No parent container test');
  
  // テストケース9: aria-labelからの抽出
  testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test" aria-label="Test Video by Amazing Channel">Test Video</a>
    </div>
  `;
  element = createTestElement(testHtml);
  link = element.querySelector('a');
  result = extractChannelNameFromElement(link);
  assertEqual(result, 'Amazing Channel', 'Extract from aria-label test');
  
  // テストケース10: URLエンコードされたチャンネル名
  testHtml = `
    <div class="g">
      <a href="https://www.youtube.com/watch?v=test">Test Video</a>
      <cite>https://www.youtube.com/c/%E3%83%86%E3%82%B9%E3%83%88%E3%83%81%E3%83%A3%E3%83%B3%E3%83%8D%E3%83%AB</cite>
    </div>
  `;
  element = createTestElement(testHtml);
  link = element.querySelector('a');
  result = extractChannelNameFromElement(link);
  assertEqual(result, 'テストチャンネル', 'URL encoded channel name in cite test');
  
  console.log('✓ extractChannelNameFromElement tests passed');
}

/**
 * 統合テスト: getYouTubeVideoInfo関数
 */
function testGetYouTubeVideoInfo() {
  console.log('Testing getYouTubeVideoInfo integration...');
  
  // テスト用のDOM要素を作成
  function createTestVideoElement(href, containerHtml) {
    const container = document.createElement('div');
    container.className = 'g';
    container.innerHTML = containerHtml;
    const link = container.querySelector('a') || document.createElement('a');
    link.href = href;
    return link;
  }
  
  // テストケース1: 完全な情報を持つ動画要素
  const testHtml = `
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Amazing Video Title</a>
    <cite>https://www.youtube.com/@TechChannel</cite>
    <div class="VuuXrf">Tech Channel</div>
  `;
  let element = createTestVideoElement('https://www.youtube.com/watch?v=dQw4w9WgXcQ', testHtml);
  let result = getYouTubeVideoInfo(element);
  
  assertEqual(result.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Video URL test');
  assertEqual(result.channelHandle, '@TechChannel', 'Channel handle test');
  assertEqual(result.channelName, 'TechChannel', 'Channel name test');
  assertEqual(result.title, 'Amazing Video Title', 'Video title test');
  assertEqual(result.isShorts, false, 'Is not shorts test');
  assertEqual(result.isRegularVideo, true, 'Is regular video test');
  
  // テストケース2: Shorts動画
  element = createTestVideoElement('https://www.youtube.com/shorts/abc123', '<a href="https://www.youtube.com/shorts/abc123">Short Video</a>');
  result = getYouTubeVideoInfo(element);
  
  assertEqual(result.isShorts, true, 'Is shorts test');
  assertEqual(result.isRegularVideo, false, 'Is not regular video test');
  
  console.log('✓ getYouTubeVideoInfo integration tests passed');
}

/**
 * エラーハンドリングテスト
 */
function testErrorHandling() {
  console.log('Testing error handling...');
  
  // 不正なURLでのテスト
  let result = extractChannelFromUrl('not-a-url');
  assertDeepEqual(result, { channelId: null, channelHandle: null }, 'Invalid URL handling');
  
  // 存在しないDOM要素でのテスト
  result = extractChannelNameFromElement(document.createElement('div'));
  assertEqual(result, null, 'Non-existent DOM element handling');
  
  console.log('✓ Error handling tests passed');
}

/**
 * 全テストを実行
 */
function runAllTests() {
  console.log('=== チャンネル情報抽出機能 単体テスト開始 ===');
  
  try {
    testExtractChannelFromUrl();
    testExtractChannelNameFromElement();
    testGetYouTubeVideoInfo();
    testErrorHandling();
    
    console.log('=== 全テスト成功 ✓ ===');
    return true;
  } catch (error) {
    console.error('=== テスト失敗 ✗ ===');
    console.error(error.message);
    console.error(error.stack);
    return false;
  }
}

// ブラウザ環境でのテスト実行
if (typeof window !== 'undefined') {
  // グローバルにテスト関数を公開
  window.runChannelExtractionTests = runAllTests;
  window.testExtractChannelFromUrl = testExtractChannelFromUrl;
  window.testExtractChannelNameFromElement = testExtractChannelNameFromElement;
  window.testGetYouTubeVideoInfo = testGetYouTubeVideoInfo;
  
  console.log('チャンネル情報抽出テストが利用可能です:');
  console.log('- runChannelExtractionTests() : 全テストを実行');
  console.log('- testExtractChannelFromUrl() : URL抽出テスト');
  console.log('- testExtractChannelNameFromElement() : DOM要素抽出テスト');
  console.log('- testGetYouTubeVideoInfo() : 統合テスト');
}

// Node.js環境での対応（将来的な拡張用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testExtractChannelFromUrl,
    testExtractChannelNameFromElement,
    testGetYouTubeVideoInfo,
    testErrorHandling
  };
}