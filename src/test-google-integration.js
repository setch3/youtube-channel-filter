// Google検索フィルタリング統合テスト用JavaScript

// テスト結果を格納するグローバル変数
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
};

// テスト用のモックデータ
const mockTestData = {
    bannedIds: ['@testchannel1', 'UC1234567890', 'testuser'],
    bannedNames: ['テストチャンネル', 'Test Channel', 'ブロック対象'],
    testVideos: [
        {
            url: 'https://www.youtube.com/watch?v=test1',
            title: 'テスト動画1',
            channelId: '@testchannel1',
            channelName: 'テストチャンネル',
            shouldBeHidden: true
        },
        {
            url: 'https://www.youtube.com/watch?v=test2',
            title: 'テスト動画2',
            channelId: '@allowedchannel',
            channelName: '許可チャンネル',
            shouldBeHidden: false
        },
        {
            url: 'https://www.youtube.com/shorts/test3',
            title: 'テストShorts',
            channelId: 'UC1234567890',
            channelName: 'ブロック対象',
            shouldBeHidden: true
        }
    ]
};

// ログ出力関数
function log(message, type = 'info') {
    const verboseLogging = document.getElementById('verboseLogging').checked;
    if (verboseLogging || type === 'error') {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// テスト結果を表示する関数
function displayTestResult(containerId, testName, success, message, details = null) {
    const container = document.getElementById(containerId);
    const testCase = document.createElement('div');
    testCase.className = `test-case ${success ? '' : 'failed'}`;
    
    const resultDiv = document.createElement('div');
    resultDiv.className = `test-result ${success ? 'success' : 'error'}`;
    
    let resultHtml = `<strong>${testName}</strong><br>`;
    resultHtml += `結果: ${success ? '✅ 成功' : '❌ 失敗'}<br>`;
    resultHtml += `詳細: ${message}`;
    
    if (details) {
        resultHtml += `<br>追加情報: ${JSON.stringify(details, null, 2)}`;
    }
    
    resultDiv.innerHTML = resultHtml;
    testCase.appendChild(resultDiv);
    container.appendChild(testCase);
    
    // 統計を更新
    testResults.total++;
    if (success) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
    
    updateTestStats();
}

// テスト統計を更新
function updateTestStats() {
    document.getElementById('total-tests').textContent = testResults.total;
    document.getElementById('passed-tests').textContent = testResults.passed;
    document.getElementById('failed-tests').textContent = testResults.failed;
    
    const successRate = testResults.total > 0 
        ? Math.round((testResults.passed / testResults.total) * 100) 
        : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;
}

// Chrome Storage APIのモック（テスト環境用）
function mockChromeStorage() {
    if (typeof chrome === 'undefined') {
        window.chrome = {
            storage: {
                sync: {
                    data: {},
                    get: function(keys, callback) {
                        const result = {};
                        if (typeof keys === 'object' && keys !== null) {
                            Object.keys(keys).forEach(key => {
                                result[key] = this.data[key] !== undefined ? this.data[key] : keys[key];
                            });
                        }
                        callback(result);
                    },
                    set: function(items, callback) {
                        Object.assign(this.data, items);
                        if (callback) callback();
                        // ストレージ変更イベントをシミュレート
                        window.dispatchEvent(new CustomEvent('chrome-storage-changed', {
                            detail: { changes: items, areaName: 'sync' }
                        }));
                    }
                }
            }
        };
        log('Chrome Storage API mock initialized', 'info');
    }
}

// 1. Google検索クエリフィルタリングテスト
async function runSearchQueryTests() {
    log('Starting Google search query filtering tests', 'info');
    const containerId = 'search-query-tests';
    document.getElementById(containerId).innerHTML = '';
    
    // テスト1.1: 基本的なYouTube動画検出
    try {
        createMockSearchResults();
        await new Promise(resolve => setTimeout(resolve, 100)); // DOM更新待機
        
        const youtubeLinks = document.querySelectorAll('a[href*="youtube.com"]');
        const success = youtubeLinks.length > 0;
        
        displayTestResult(containerId, 'YouTube動画リンク検出テスト', success, 
            `${youtubeLinks.length}個のYouTubeリンクを検出`, 
            { detectedLinks: youtubeLinks.length });
            
    } catch (error) {
        displayTestResult(containerId, 'YouTube動画リンク検出テスト', false, 
            `エラー: ${error.message}`);
    }
    
    // テスト1.2: チャンネル情報抽出テスト
    try {
        const testUrl = 'https://www.youtube.com/watch?v=test123';
        const mockElement = document.createElement('a');
        mockElement.href = testUrl;
        mockElement.textContent = 'テスト動画';
        
        // google-content.jsの関数が利用可能かチェック
        if (typeof extractChannelFromUrl === 'function') {
            const channelInfo = extractChannelFromUrl(testUrl);
            const success = channelInfo !== null;
            
            displayTestResult(containerId, 'チャンネル情報抽出テスト', success,
                `チャンネル情報抽出: ${success ? '成功' : '失敗'}`,
                channelInfo);
        } else {
            displayTestResult(containerId, 'チャンネル情報抽出テスト', false,
                'extractChannelFromUrl関数が見つかりません（google-content.jsが読み込まれていない可能性）');
        }
        
    } catch (error) {
        displayTestResult(containerId, 'チャンネル情報抽出テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト1.3: フィルタリング判定テスト
    try {
        await loadTestData();
        
        const testVideo = {
            channelId: '@testchannel1',
            channelName: 'テストチャンネル',
            url: 'https://www.youtube.com/watch?v=test'
        };
        
        if (typeof shouldHideVideo === 'function') {
            const filterResult = shouldHideVideo(testVideo);
            const success = filterResult && filterResult.shouldHide === true;
            
            displayTestResult(containerId, 'フィルタリング判定テスト', success,
                `ブロック対象動画の判定: ${success ? '正しく検出' : '検出失敗'}`,
                filterResult);
        } else {
            displayTestResult(containerId, 'フィルタリング判定テスト', false,
                'shouldHideVideo関数が見つかりません');
        }
        
    } catch (error) {
        displayTestResult(containerId, 'フィルタリング判定テスト', false,
            `エラー: ${error.message}`);
    }
    
    log('Google search query filtering tests completed', 'info');
}

// 2. YouTube内フィルタリング連携テスト
async function runYouTubeIntegrationTests() {
    log('Starting YouTube integration tests', 'info');
    const containerId = 'youtube-integration-tests';
    document.getElementById(containerId).innerHTML = '';
    
    // テスト2.1: 共通設定の使用確認
    try {
        await loadTestData();
        
        chrome.storage.sync.get(['bannedIds', 'bannedNames'], (data) => {
            const hasIds = data.bannedIds && data.bannedIds.length > 0;
            const hasNames = data.bannedNames && data.bannedNames.length > 0;
            const success = hasIds && hasNames;
            
            displayTestResult(containerId, '共通設定使用テスト', success,
                `ブロックリスト設定: IDs=${data.bannedIds?.length || 0}, Names=${data.bannedNames?.length || 0}`,
                { bannedIds: data.bannedIds, bannedNames: data.bannedNames });
        });
        
    } catch (error) {
        displayTestResult(containerId, '共通設定使用テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト2.2: 設定変更の即座反映テスト
    try {
        const testChannelId = '@integration-test-channel';
        
        // 設定を追加
        chrome.storage.sync.get(['bannedIds'], (data) => {
            const newBannedIds = [...(data.bannedIds || []), testChannelId];
            
            chrome.storage.sync.set({ bannedIds: newBannedIds }, () => {
                // 設定変更後の確認
                chrome.storage.sync.get(['bannedIds'], (updatedData) => {
                    const success = updatedData.bannedIds.includes(testChannelId);
                    
                    displayTestResult(containerId, '設定変更反映テスト', success,
                        `テストチャンネルID追加: ${success ? '成功' : '失敗'}`,
                        { addedId: testChannelId, currentIds: updatedData.bannedIds });
                    
                    // テスト後にクリーンアップ
                    const cleanedIds = updatedData.bannedIds.filter(id => id !== testChannelId);
                    chrome.storage.sync.set({ bannedIds: cleanedIds });
                });
            });
        });
        
    } catch (error) {
        displayTestResult(containerId, '設定変更反映テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト2.3: ストレージ同期テスト
    try {
        const testData = { testSync: Date.now() };
        
        chrome.storage.sync.set(testData, () => {
            chrome.storage.sync.get(['testSync'], (data) => {
                const success = data.testSync === testData.testSync;
                
                displayTestResult(containerId, 'ストレージ同期テスト', success,
                    `同期データ確認: ${success ? '成功' : '失敗'}`,
                    { expected: testData.testSync, actual: data.testSync });
                
                // テストデータをクリーンアップ
                chrome.storage.sync.remove(['testSync']);
            });
        });
        
    } catch (error) {
        displayTestResult(containerId, 'ストレージ同期テスト', false,
            `エラー: ${error.message}`);
    }
    
    log('YouTube integration tests completed', 'info');
}

// 3. 設定変更・ストレージ同期テスト
async function runSettingsSyncTests() {
    log('Starting settings sync tests', 'info');
    const containerId = 'settings-sync-tests';
    document.getElementById(containerId).innerHTML = '';
    
    // テスト3.1: Google検索フィルタリング有効/無効設定
    try {
        const enableGoogleFilter = document.getElementById('enableGoogleFilter').checked;
        
        chrome.storage.sync.set({ enableGoogleFilter }, () => {
            chrome.storage.sync.get(['enableGoogleFilter'], (data) => {
                const success = data.enableGoogleFilter === enableGoogleFilter;
                
                displayTestResult(containerId, 'Google検索フィルタリング設定テスト', success,
                    `設定値: ${enableGoogleFilter ? '有効' : '無効'}, 保存確認: ${success ? '成功' : '失敗'}`,
                    { expected: enableGoogleFilter, actual: data.enableGoogleFilter });
            });
        });
        
    } catch (error) {
        displayTestResult(containerId, 'Google検索フィルタリング設定テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト3.2: 設定変更イベントの処理
    try {
        let eventReceived = false;
        
        // カスタムイベントリスナーを設定
        const eventHandler = (event) => {
            if (event.detail && event.detail.changes) {
                eventReceived = true;
                log('Storage change event received', 'info');
            }
        };
        
        window.addEventListener('chrome-storage-changed', eventHandler);
        
        // 設定を変更してイベントをトリガー
        chrome.storage.sync.set({ testEventTrigger: Date.now() }, () => {
            setTimeout(() => {
                const success = eventReceived;
                
                displayTestResult(containerId, '設定変更イベント処理テスト', success,
                    `イベント受信: ${success ? '成功' : '失敗'}`);
                
                // クリーンアップ
                window.removeEventListener('chrome-storage-changed', eventHandler);
                chrome.storage.sync.remove(['testEventTrigger']);
            }, 100);
        });
        
    } catch (error) {
        displayTestResult(containerId, '設定変更イベント処理テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト3.3: 複数設定の一括更新
    try {
        const bulkSettings = {
            bannedIds: ['@bulk-test-1', '@bulk-test-2'],
            bannedNames: ['バルクテスト1', 'バルクテスト2'],
            enableGoogleFilter: true,
            hideShortsSearch: false
        };
        
        chrome.storage.sync.set(bulkSettings, () => {
            chrome.storage.sync.get(Object.keys(bulkSettings), (data) => {
                const success = Object.keys(bulkSettings).every(key => 
                    JSON.stringify(data[key]) === JSON.stringify(bulkSettings[key])
                );
                
                displayTestResult(containerId, '一括設定更新テスト', success,
                    `一括更新: ${success ? '成功' : '失敗'}`,
                    { expected: bulkSettings, actual: data });
            });
        });
        
    } catch (error) {
        displayTestResult(containerId, '一括設定更新テスト', false,
            `エラー: ${error.message}`);
    }
    
    log('Settings sync tests completed', 'info');
}

// 4. 動的コンテンツ監視テスト
async function runDynamicContentTests() {
    log('Starting dynamic content tests', 'info');
    const containerId = 'dynamic-content-tests';
    document.getElementById(containerId).innerHTML = '';
    
    // テスト4.1: MutationObserver動作確認
    try {
        let observerTriggered = false;
        
        // テスト用のMutationObserverを設定
        const testObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    observerTriggered = true;
                    log('MutationObserver triggered by DOM change', 'info');
                }
            });
        });
        
        const testContainer = document.getElementById('mock-results-container');
        testObserver.observe(testContainer, { childList: true, subtree: true });
        
        // 動的にコンテンツを追加
        const newElement = document.createElement('div');
        newElement.innerHTML = '<a href="https://www.youtube.com/watch?v=dynamic-test">動的追加テスト動画</a>';
        testContainer.appendChild(newElement);
        
        setTimeout(() => {
            const success = observerTriggered;
            
            displayTestResult(containerId, 'MutationObserver動作テスト', success,
                `DOM変更検知: ${success ? '成功' : '失敗'}`);
            
            testObserver.disconnect();
            testContainer.removeChild(newElement);
        }, 100);
        
    } catch (error) {
        displayTestResult(containerId, 'MutationObserver動作テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト4.2: 動的追加要素のフィルタリング
    try {
        await loadTestData();
        
        const mockContainer = document.getElementById('mock-results-container');
        const dynamicVideo = document.createElement('div');
        dynamicVideo.className = 'mock-search-result';
        dynamicVideo.innerHTML = `
            <a href="https://www.youtube.com/watch?v=dynamic-blocked" class="mock-video-link">
                動的追加されたブロック対象動画
            </a>
            <div class="mock-channel-info">@testchannel1</div>
        `;
        
        mockContainer.appendChild(dynamicVideo);
        
        // フィルタリング処理をシミュレート
        const videoLink = dynamicVideo.querySelector('a[href*="youtube.com"]');
        if (videoLink && typeof shouldHideVideo === 'function') {
            const videoInfo = {
                url: videoLink.href,
                channelId: '@testchannel1',
                channelName: 'テストチャンネル'
            };
            
            const filterResult = shouldHideVideo(videoInfo);
            
            if (filterResult.shouldHide) {
                dynamicVideo.style.display = 'none';
                dynamicVideo.setAttribute('data-youtube-filtered', 'true');
            }
            
            const success = dynamicVideo.style.display === 'none';
            
            displayTestResult(containerId, '動的追加要素フィルタリングテスト', success,
                `動的要素のフィルタリング: ${success ? '成功' : '失敗'}`,
                filterResult);
        } else {
            displayTestResult(containerId, '動的追加要素フィルタリングテスト', false,
                'フィルタリング関数が利用できません');
        }
        
    } catch (error) {
        displayTestResult(containerId, '動的追加要素フィルタリングテスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト4.3: 無限スクロール対応テスト
    try {
        let scrollEventTriggered = false;
        
        const scrollHandler = () => {
            scrollEventTriggered = true;
            log('Scroll event detected', 'info');
        };
        
        window.addEventListener('scroll', scrollHandler);
        
        // スクロールイベントをシミュレート
        window.scrollTo(0, 100);
        
        setTimeout(() => {
            const success = scrollEventTriggered;
            
            displayTestResult(containerId, '無限スクロール対応テスト', success,
                `スクロールイベント検知: ${success ? '成功' : '失敗'}`);
            
            window.removeEventListener('scroll', scrollHandler);
            window.scrollTo(0, 0);
        }, 100);
        
    } catch (error) {
        displayTestResult(containerId, '無限スクロール対応テスト', false,
            `エラー: ${error.message}`);
    }
    
    log('Dynamic content tests completed', 'info');
}

// 5. パフォーマンステスト
async function runPerformanceTests() {
    log('Starting performance tests', 'info');
    const containerId = 'performance-tests';
    document.getElementById(containerId).innerHTML = '';
    
    // テスト5.1: セレクタ実行時間測定
    try {
        const testSelectors = [
            'a[href*="youtube.com/watch"]',
            'a[href*="youtube.com/shorts"]',
            '.tF2Cxc a[href*="youtube.com"]',
            'div[data-ved] a[href*="youtube.com"]'
        ];
        
        const performanceResults = [];
        
        testSelectors.forEach(selector => {
            const startTime = performance.now();
            const elements = document.querySelectorAll(selector);
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            performanceResults.push({
                selector,
                executionTime: executionTime.toFixed(2),
                elementsFound: elements.length
            });
        });
        
        const avgTime = performanceResults.reduce((sum, result) => 
            sum + parseFloat(result.executionTime), 0) / performanceResults.length;
        
        const success = avgTime < 10; // 10ms以下を良好とする
        
        displayTestResult(containerId, 'セレクタ実行時間テスト', success,
            `平均実行時間: ${avgTime.toFixed(2)}ms (${success ? '良好' : '要改善'})`,
            performanceResults);
        
    } catch (error) {
        displayTestResult(containerId, 'セレクタ実行時間テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト5.2: 大量要素処理テスト
    try {
        const startTime = performance.now();
        
        // 大量のモック要素を作成
        const mockContainer = document.getElementById('mock-results-container');
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < 100; i++) {
            const mockResult = document.createElement('div');
            mockResult.innerHTML = `
                <a href="https://www.youtube.com/watch?v=test${i}">テスト動画${i}</a>
                <div>チャンネル${i}</div>
            `;
            fragment.appendChild(mockResult);
        }
        
        mockContainer.appendChild(fragment);
        
        // 処理時間を測定
        const youtubeLinks = mockContainer.querySelectorAll('a[href*="youtube.com"]');
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        const success = processingTime < 50; // 50ms以下を良好とする
        
        displayTestResult(containerId, '大量要素処理テスト', success,
            `100要素処理時間: ${processingTime.toFixed(2)}ms, 検出要素数: ${youtubeLinks.length}`,
            { processingTime, elementsProcessed: 100, elementsFound: youtubeLinks.length });
        
        // クリーンアップ
        mockContainer.innerHTML = '';
        
    } catch (error) {
        displayTestResult(containerId, '大量要素処理テスト', false,
            `エラー: ${error.message}`);
    }
    
    // テスト5.3: メモリ使用量監視
    try {
        if (performance.memory) {
            const memoryBefore = performance.memory.usedJSHeapSize;
            
            // メモリを使用する処理をシミュレート
            const testData = [];
            for (let i = 0; i < 1000; i++) {
                testData.push({
                    id: i,
                    url: `https://www.youtube.com/watch?v=test${i}`,
                    title: `テスト動画${i}`,
                    channel: `チャンネル${i}`
                });
            }
            
            const memoryAfter = performance.memory.usedJSHeapSize;
            const memoryUsed = memoryAfter - memoryBefore;
            
            const success = memoryUsed < 1024 * 1024; // 1MB以下を良好とする
            
            displayTestResult(containerId, 'メモリ使用量テスト', success,
                `メモリ使用量: ${(memoryUsed / 1024).toFixed(2)}KB (${success ? '良好' : '要注意'})`,
                { memoryUsed, memoryBefore, memoryAfter });
        } else {
            displayTestResult(containerId, 'メモリ使用量テスト', false,
                'performance.memoryが利用できません（Chrome以外のブラウザ）');
        }
        
    } catch (error) {
        displayTestResult(containerId, 'メモリ使用量テスト', false,
            `エラー: ${error.message}`);
    }
    
    log('Performance tests completed', 'info');
}

// モックGoogle検索結果を作成
function createMockSearchResults() {
    const mockContainer = document.getElementById('mock-results-container');
    const mockResultsDiv = document.getElementById('mock-search-results');
    
    mockContainer.innerHTML = '';
    mockResultsDiv.style.display = 'block';
    
    mockTestData.testVideos.forEach((video, index) => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'mock-search-result';
        resultDiv.innerHTML = `
            <a href="${video.url}" class="mock-video-link">${video.title}</a>
            <div class="mock-channel-info">${video.channelName} • ${video.channelId}</div>
            <div class="mock-video-meta">1日前 • 10万回視聴</div>
        `;
        mockContainer.appendChild(resultDiv);
    });
    
    log(`Created ${mockTestData.testVideos.length} mock search results`, 'info');
}

// テストデータを読み込み
async function loadTestData() {
    return new Promise((resolve) => {
        chrome.storage.sync.set({
            bannedIds: mockTestData.bannedIds,
            bannedNames: mockTestData.bannedNames,
            enableGoogleFilter: true
        }, () => {
            log('Test data loaded to storage', 'info');
            resolve();
        });
    });
}

// 設定をリセット
function resetSettings() {
    chrome.storage.sync.clear(() => {
        chrome.storage.sync.set({
            bannedIds: [],
            bannedNames: [],
            hideShortsSearch: false,
            enableGoogleFilter: true
        }, () => {
            log('Settings reset to defaults', 'info');
            alert('設定をリセットしました');
        });
    });
}

// 結果をクリア
function clearResults() {
    const testContainers = [
        'search-query-tests',
        'youtube-integration-tests', 
        'settings-sync-tests',
        'dynamic-content-tests',
        'performance-tests'
    ];
    
    testContainers.forEach(containerId => {
        document.getElementById(containerId).innerHTML = '';
    });
    
    testResults = { total: 0, passed: 0, failed: 0, warnings: 0 };
    updateTestStats();
    
    document.getElementById('mock-search-results').style.display = 'none';
    
    log('Test results cleared', 'info');
}

// 全テストを実行
async function runAllTests() {
    log('Starting all integration tests', 'info');
    clearResults();
    
    // Chrome Storage APIのモックを初期化
    mockChromeStorage();
    
    try {
        await runSearchQueryTests();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await runYouTubeIntegrationTests();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await runSettingsSyncTests();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await runDynamicContentTests();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await runPerformanceTests();
        
        log('All integration tests completed', 'info');
        
        // 最終結果をアラートで表示
        const successRate = testResults.total > 0 
            ? Math.round((testResults.passed / testResults.total) * 100) 
            : 0;
        
        alert(`統合テスト完了\n総テスト数: ${testResults.total}\n成功: ${testResults.passed}\n失敗: ${testResults.failed}\n成功率: ${successRate}%`);
        
    } catch (error) {
        log(`Error during test execution: ${error.message}`, 'error');
        alert(`テスト実行中にエラーが発生しました: ${error.message}`);
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    log('Google Search Filter Integration Test initialized', 'info');
    mockChromeStorage();
    updateTestStats();
    
    // Google検索フィルタリング設定の同期
    chrome.storage.sync.get(['enableGoogleFilter'], (data) => {
        document.getElementById('enableGoogleFilter').checked = data.enableGoogleFilter !== false;
    });
    
    // 設定変更の監視
    document.getElementById('enableGoogleFilter').addEventListener('change', (e) => {
        chrome.storage.sync.set({ enableGoogleFilter: e.target.checked });
    });
});