// Google検索結果でのYouTube動画フィルタリング用コンテンツスクリプト（最適化版）

// セレクタ設定（優先度順）
const YOUTUBE_SELECTORS = [
  '.tF2Cxc a[href*="youtube.com/watch"]',
  '.tF2Cxc a[href*="youtube.com/shorts"]',
  '.yuRUbf a[href*="youtube.com/watch"]',
  '.yuRUbf a[href*="youtube.com/shorts"]',
  'div[data-ved] a[href*="youtube.com/watch"]',
  'div[data-ved] a[href*="youtube.com/shorts"]',
  '.g a[href*="youtube.com/watch"]',
  '.g a[href*="youtube.com/shorts"]',
  'a[href*="youtube.com/watch"]',
  'a[href*="youtube.com/shorts"]',
  'a[href*="youtu.be/"]'
];

const FALLBACK_SELECTORS = [
  'a[href*="youtube.com"]',
  'a[href*="youtu.be"]'
];

// グローバル変数
let bannedIds = [];
let bannedNames = [];
let enableGoogleFilter = true;
let processedElements = new WeakSet();
let settingsCache = null;
let settingsCacheTime = 0;

/**
 * Google検索ページかどうかを判定
 */
function isGoogleSearchPage() {
  return window.location.hostname === 'www.google.com' && 
         (window.location.pathname === '/search' || window.location.search.includes('q='));
}

/**
 * YouTube URLからチャンネル情報を抽出
 */
function extractChannelFromUrl(url) {
  if (!url || typeof url !== 'string') return { channelId: null, channelHandle: null };
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    
    // youtu.be短縮URLの場合
    if (urlObj.hostname === 'youtu.be') {
      return { channelId: null, channelHandle: null };
    }
    
    // @ハンドル形式
    const handleMatch = urlObj.pathname.match(/\/@([a-zA-Z0-9_.-]+)/);
    if (handleMatch) {
      return { channelId: null, channelHandle: '@' + handleMatch[1] };
    }
    
    // チャンネルID形式
    const channelMatch = urlObj.pathname.match(/\/channel\/([^\/\?]+)/);
    if (channelMatch) {
      return { channelId: channelMatch[1], channelHandle: null };
    }
    
    // ユーザー名形式
    const userMatch = urlObj.pathname.match(/\/user\/([^\/\?]+)/);
    if (userMatch) {
      return { channelId: userMatch[1], channelHandle: null };
    }
    
    // URLパラメータからチャンネル情報
    const params = new URLSearchParams(urlObj.search);
    if (params.has('channel')) {
      const channelParam = params.get('channel');
      return { channelId: channelParam, channelHandle: null };
    }
    
  } catch (error) {
    console.debug('URL parsing error:', error);
  }
  
  return { channelId: null, channelHandle: null };
}

/**
 * 検索結果要素からチャンネル名を抽出
 */
function extractChannelNameFromElement(element) {
  if (!element) return null;
  
  try {
    const container = element.closest('div[data-ved], .g, .MjjYud, .tF2Cxc');
    if (!container) return null;
    
    // cite要素からチャンネル名を抽出
    const cite = container.querySelector('cite');
    if (cite && cite.textContent) {
      const text = cite.textContent.trim();
      
      // @ハンドル形式
      const handleMatch = text.match(/youtube\.com\/@([^\/\s\?]+)/);
      if (handleMatch) return handleMatch[1];
      
      // 従来のURL形式
      const pathMatch = text.match(/youtube\.com\/(?:c\/([^\/\s\?]+)|channel\/([^\/\s\?]+)|user\/([^\/\s\?]+))/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1] || pathMatch[2] || pathMatch[3]);
      }
    }
    
    // その他のテキスト要素から抽出
    const selectors = ['.VuuXrf', '.qLRx3b', '.tjvcx', '.byrV5b'];
    for (const selector of selectors) {
      const textElement = container.querySelector(selector);
      if (textElement && textElement.textContent) {
        const text = textElement.textContent.trim();
        if (text.length > 0 && text.length < 100 && !text.includes('http')) {
          return text;
        }
      }
    }
    
  } catch (error) {
    console.debug('Channel name extraction error:', error);
  }
  
  return null;
}

/**
 * YouTube動画情報を取得
 */
function getYouTubeVideoInfo(linkElement) {
  if (!linkElement || !linkElement.href) {
    return {
      url: '',
      channelId: null,
      channelHandle: null,
      channelName: null,
      title: '',
      isShorts: false,
      element: linkElement
    };
  }
  
  const url = linkElement.href;
  const { channelId, channelHandle } = extractChannelFromUrl(url);
  const channelName = extractChannelNameFromElement(linkElement);
  
  // タイトル取得
  let title = '';
  if (linkElement.textContent) {
    title = linkElement.textContent.trim();
  } else if (linkElement.title) {
    title = linkElement.title.trim();
  }
  
  const isShorts = url.includes('/shorts/') || url.includes('youtube.com/shorts');
  
  return {
    url,
    channelId,
    channelHandle,
    channelName,
    title,
    isShorts,
    element: linkElement
  };
}

/**
 * 動画をブロックすべきかどうかを判定
 */
function shouldHideVideo(videoInfo) {
  if (!enableGoogleFilter || !videoInfo) {
    return { shouldHide: false, reason: 'Filter disabled or invalid info', matchedValue: null };
  }
  
  // チャンネルIDでの照合
  if (videoInfo.channelId && bannedIds.length > 0) {
    const normalizedChannelId = videoInfo.channelId.toLowerCase().trim();
    
    for (const bannedId of bannedIds) {
      if (!bannedId) continue;
      const normalizedBannedId = bannedId.toLowerCase().trim();
      
      if (normalizedChannelId === normalizedBannedId ||
          normalizedChannelId === '@' + normalizedBannedId ||
          '@' + normalizedChannelId === normalizedBannedId) {
        return { shouldHide: true, reason: 'Channel ID match', matchedValue: bannedId };
      }
    }
  }
  
  // チャンネルハンドルでの照合
  if (videoInfo.channelHandle && bannedIds.length > 0) {
    const normalizedHandle = videoInfo.channelHandle.toLowerCase().trim();
    
    for (const bannedId of bannedIds) {
      if (!bannedId) continue;
      const normalizedBannedId = bannedId.toLowerCase().trim();
      
      if (normalizedHandle === normalizedBannedId ||
          normalizedHandle === '@' + normalizedBannedId ||
          '@' + normalizedHandle === normalizedBannedId) {
        return { shouldHide: true, reason: 'Channel handle match', matchedValue: bannedId };
      }
    }
  }
  
  // チャンネル名での照合
  if (videoInfo.channelName && bannedNames.length > 0) {
    const normalizedChannelName = videoInfo.channelName.toLowerCase().trim();
    
    for (const bannedName of bannedNames) {
      if (!bannedName) continue;
      const normalizedBannedName = bannedName.toLowerCase().trim();
      
      if (normalizedChannelName.includes(normalizedBannedName)) {
        return { shouldHide: true, reason: 'Channel name match', matchedValue: bannedName };
      }
    }
  }
  
  return { shouldHide: false, reason: 'No match found', matchedValue: null };
}

/**
 * YouTube動画要素を非表示にする
 */
function hideVideoElement(element, filterResult = {}) {
  if (!element || element.hasAttribute('data-youtube-filtered')) {
    return false;
  }
  
  const containerSelectors = [
    'div[data-ved]',
    '.tF2Cxc',
    '.g',
    '.MjjYud',
    '.yuRUbf',
    '.hlcw0c'
  ];
  
  let targetContainer = null;
  
  for (const selector of containerSelectors) {
    try {
      const container = element.closest(selector);
      if (container && !container.hasAttribute('data-youtube-filtered')) {
        targetContainer = container;
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  const targetElement = targetContainer || element;
  
  try {
    targetElement.style.display = 'none';
    targetElement.style.visibility = 'hidden';
    targetElement.setAttribute('data-youtube-filtered', 'true');
    targetElement.setAttribute('data-filter-reason', filterResult.reason || 'unknown');
    targetElement.setAttribute('data-filter-matched', filterResult.matchedValue || 'unknown');
    
    console.debug('Hidden element:', {
      reason: filterResult.reason,
      matchedValue: filterResult.matchedValue
    });
    
    return true;
  } catch (error) {
    console.error('Error hiding element:', error);
    return false;
  }
}

/**
 * YouTube動画要素を検出
 */
function detectYouTubeVideoElements(container = document) {
  const elements = [];
  
  try {
    const combinedSelector = YOUTUBE_SELECTORS.join(', ');
    const foundElements = container.querySelectorAll(combinedSelector);
    
    foundElements.forEach(element => {
      if (element.href && (
        element.href.includes('youtube.com/watch') ||
        element.href.includes('youtube.com/shorts') ||
        element.href.includes('youtu.be/')
      )) {
        elements.push(element);
      }
    });
    
    // フォールバック検索
    if (elements.length === 0) {
      const fallbackSelector = FALLBACK_SELECTORS.join(', ');
      const fallbackElements = container.querySelectorAll(fallbackSelector);
      
      fallbackElements.forEach(element => {
        if (element.href && (
          element.href.includes('youtube.com/watch') ||
          element.href.includes('youtube.com/shorts') ||
          element.href.includes('youtu.be/')
        )) {
          elements.push(element);
        }
      });
    }
    
  } catch (error) {
    console.error('Error detecting YouTube elements:', error);
  }
  
  return elements;
}

/**
 * フィルタリング処理を実行
 */
function processYouTubeElements(elements) {
  if (!elements || elements.length === 0) return;
  
  let processedCount = 0;
  let hiddenCount = 0;
  
  elements.forEach(element => {
    try {
      if (processedElements.has(element)) return;
      
      const videoInfo = getYouTubeVideoInfo(element);
      const filterResult = shouldHideVideo(videoInfo);
      
      processedElements.add(element);
      processedCount++;
      
      if (filterResult.shouldHide) {
        if (hideVideoElement(element, filterResult)) {
          hiddenCount++;
        }
      }
      
    } catch (error) {
      console.debug('Error processing element:', error);
    }
  });
  
  if (processedCount > 0) {
    console.debug(`Processed ${processedCount} elements, hidden ${hiddenCount}`);
  }
}

/**
 * ストレージから設定を読み込み
 */
function loadSettingsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { bannedIds: [], bannedNames: [], enableGoogleFilter: true },
      (data) => {
        bannedIds = data.bannedIds || [];
        bannedNames = data.bannedNames || [];
        enableGoogleFilter = data.enableGoogleFilter !== false;
        
        // キャッシュ更新
        settingsCache = { ...data };
        settingsCacheTime = Date.now();
        
        console.debug('Settings loaded:', { 
          bannedIds: bannedIds.length, 
          bannedNames: bannedNames.length, 
          enableGoogleFilter 
        });
        
        resolve();
      }
    );
  });
}

/**
 * メインのフィルタリング処理
 */
async function runFiltering() {
  if (!isGoogleSearchPage() || !enableGoogleFilter) return;
  
  try {
    const youtubeElements = detectYouTubeVideoElements();
    if (youtubeElements.length > 0) {
      processYouTubeElements(youtubeElements);
    }
  } catch (error) {
    console.error('Error in filtering process:', error);
  }
}

/**
 * DOM変更監視の設定
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const hasYouTubeLinks = node.querySelector && 
              node.querySelector('a[href*="youtube.com"], a[href*="youtu.be"]');
            if (hasYouTubeLinks) {
              shouldProcess = true;
              break;
            }
          }
        }
      }
    });
    
    if (shouldProcess) {
      setTimeout(runFiltering, 100); // 少し遅延させて処理
    }
  });
  
  const targetNode = document.querySelector('#rso, #search, #center_col') || document.body;
  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
  
  console.debug('MutationObserver setup completed');
}

/**
 * ストレージ変更の監視
 */
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      let settingsChanged = false;
      
      if (changes.bannedIds) {
        bannedIds = changes.bannedIds.newValue || [];
        settingsChanged = true;
      }
      
      if (changes.bannedNames) {
        bannedNames = changes.bannedNames.newValue || [];
        settingsChanged = true;
      }
      
      if (changes.enableGoogleFilter) {
        enableGoogleFilter = changes.enableGoogleFilter.newValue !== false;
        settingsChanged = true;
      }
      
      if (settingsChanged) {
        console.debug('Settings updated from storage');
        // 既に非表示にした要素をリセット
        processedElements = new WeakSet();
        // 再フィルタリング実行
        setTimeout(runFiltering, 100);
      }
    }
  });
}

/**
 * 初期化処理
 */
async function initialize() {
  if (!isGoogleSearchPage()) {
    console.debug('Not a Google search page, skipping initialization');
    return;
  }
  
  console.debug('Initializing Google search YouTube filter...');
  
  try {
    // 設定読み込み
    await loadSettingsFromStorage();
    
    // 初回フィルタリング実行
    await runFiltering();
    
    // DOM監視開始
    setupMutationObserver();
    
    // ストレージ変更監視
    setupStorageListener();
    
    console.debug('Google search YouTube filter initialized successfully');
    
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// ページ読み込み完了後に初期化実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// ページ表示時にも実行（戻るボタン等での表示時）
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(runFiltering, 500);
  }
});