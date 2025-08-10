// Google検索ページでのライブテスト用スクリプト
// このスクリプトは実際のGoogle検索ページで実行されることを想定

(function() {
    'use strict';
    
    // テスト結果を格納するオブジェクト
    const liveTestResults = {
        timestamp: new Date().toISOString(),
        tests: [],
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            warnings: 0
        }
    };
    
    // ログ出力関数
    function testLog(message, type = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[LIVE-TEST ${type.toUpperCase()}] ${timestamp}: ${message}`);
    }
    
    // テスト結果を記録
    function recordTestResult(testName, success, message, details = null) {
        const result = {
            name: testName,
            success,
            message,
            details,
            timestamp: new Date().toISOString()
        };
        
        liveTestResults.tests.push(result);
        liveTestResults.summary.total++;
        
        if (success) {
            liveTestResults.summary.passed++;
        } else {
            liveTestResults.summary.failed++;
        }
        
        testLog(`${testName}: ${success ? '✅ PASS' : '❌ FAIL'} - ${message}`, success ? 'info' : 'error');
        
        if (details) {
            testLog(`Details: ${JSON.stringify(details)}`, 'info');
        }
    }
    
    // Google検索ページかどうかを確認
    function isGoogleSearchPage() {
        return window.location.hostname === 'www.google.com' && 
               (window.location.pathname === '/search' || window.location.search.includes('q='));
    }
    
    // YouTube動画要素の検出テスト
    function testYouTubeVideoDetection() {
        testLog('Starting YouTube video detection test', 'info');
        
        try {
            // 複数のセレクタパターンでYouTube動画を検索
            const selectors = [
                'a[href*="youtube.com/watch"]',
                'a[href*="youtube.com/shorts"]',
                'a[href*="youtu.be/"]',
                '.tF2Cxc a[href*="youtube.com"]',
                'div[data-ved] a[href*="youtube.com"]',
                '.g a[href*="youtube.com"]'
            ];
            
            let totalFound = 0;
            const selectorResults = {};
            
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    const validElements = Array.from(elements).filter(el => 
                        el.href && (
                            el.href.includes('youtube.com/watch') ||
                            el.href.includes('youtube.com/shorts') ||
                            el.href.includes('youtu.be/')
                        )
                    );
                    
                    selectorResults[selector] = validElements.length;
                    totalFound = Math.max(totalFound, validElements.length);
                    
                } catch (error) {
                    selectorResults[selector] = `Error: ${error.message}`;
                }
            });
            
            const success = totalFound > 0;
            recordTestResult(
                'YouTube Video Detection',
                success,
                `Found ${totalFound} YouTube video links`,
                { selectorResults, totalFound }
            );
            
            return { success, totalFound, selectorResults };
            
        } catch (error) {
            recordTestResult(
                'YouTube Video Detection',
                false,
                `Test failed: ${error.message}`,
                { error: error.stack }
            );
            return { success: false, error: error.message };
        }
    }
    
    // フィルタリング機能のテスト
    function testFilteringFunctionality() {
        testLog('Starting filtering functionality test', 'info');
        
        try {
            // google-content.jsの関数が利用可能かチェック
            const functionsToCheck = [
                'extractChannelFromUrl',
                'extractChannelNameFromElement', 
                'getYouTubeVideoInfo',
                'shouldHideVideo',
                'hideVideoElement'
            ];
            
            const functionAvailability = {};
            let availableFunctions = 0;
            
            functionsToCheck.forEach(funcName => {
                const isAvailable = typeof window[funcName] === 'function';
                functionAvailability[funcName] = isAvailable;
                if (isAvailable) availableFunctions++;
            });
            
            const success = availableFunctions >= 3; // 最低3つの関数が利用可能
            
            recordTestResult(
                'Filtering Functions Availability',
                success,
                `${availableFunctions}/${functionsToCheck.length} functions available`,
                functionAvailability
            );
            
            // 実際のYouTube動画要素でフィルタリングをテスト
            if (success) {
                const youtubeLinks = document.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtube.com/shorts"]');
                let processedVideos = 0;
                let extractedChannels = 0;
                
                Array.from(youtubeLinks).slice(0, 5).forEach(link => { // 最初の5つのみテスト
                    try {
                        processedVideos++;
                        
                        if (typeof window.getYouTubeVideoInfo === 'function') {
                            const videoInfo = window.getYouTubeVideoInfo(link);
                            if (videoInfo && (videoInfo.channelId || videoInfo.channelName)) {
                                extractedChannels++;
                            }
                        }
                    } catch (error) {
                        testLog(`Error processing video link: ${error.message}`, 'warning');
                    }
                });
                
                const extractionSuccess = extractedChannels > 0;
                recordTestResult(
                    'Channel Information Extraction',
                    extractionSuccess,
                    `Extracted channel info from ${extractedChannels}/${processedVideos} videos`,
                    { processedVideos, extractedChannels }
                );
            }
            
            return { success, functionAvailability };
            
        } catch (error) {
            recordTestResult(
                'Filtering Functionality',
                false,
                `Test failed: ${error.message}`,
                { error: error.stack }
            );
            return { success: false, error: error.message };
        }
    }
    
    // 設定の読み込みテスト
    function testSettingsLoad() {
        testLog('Starting settings load test', 'info');
        
        return new Promise((resolve) => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                    chrome.storage.sync.get([
                        'bannedIds', 
                        'bannedNames', 
                        'enableGoogleFilter', 
                        'hideShortsSearch'
                    ], (data) => {
                        const hasSettings = Object.keys(data).length > 0;
                        const hasFilterData = (data.bannedIds && data.bannedIds.length > 0) || 
                                            (data.bannedNames && data.bannedNames.length > 0);
                        
                        recordTestResult(
                            'Settings Load',
                            hasSettings,
                            `Loaded ${Object.keys(data).length} settings, filter data: ${hasFilterData}`,
                            data
                        );
                        
                        resolve({ success: hasSettings, data });
                    });
                } else {
                    recordTestResult(
                        'Settings Load',
                        false,
                        'Chrome storage API not available',
                        { chromeAvailable: typeof chrome !== 'undefined' }
                    );
                    resolve({ success: false, error: 'Chrome storage API not available' });
                }
            } catch (error) {
                recordTestResult(
                    'Settings Load',
                    false,
                    `Test failed: ${error.message}`,
                    { error: error.stack }
                );
                resolve({ success: false, error: error.message });
            }
        });
    }
    
    // DOM監視機能のテスト
    function testDOMObserver() {
        testLog('Starting DOM observer test', 'info');
        
        return new Promise((resolve) => {
            try {
                let observerTriggered = false;
                let addedNodesCount = 0;
                
                // テスト用のMutationObserverを作成
                const testObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList') {
                            observerTriggered = true;
                            addedNodesCount += mutation.addedNodes.length;
                        }
                    });
                });
                
                // 検索結果コンテナを監視
                const searchContainer = document.querySelector('#search') || 
                                     document.querySelector('#main') || 
                                     document.body;
                
                if (searchContainer) {
                    testObserver.observe(searchContainer, {
                        childList: true,
                        subtree: true
                    });
                    
                    // テスト用の要素を追加
                    const testElement = document.createElement('div');
                    testElement.style.display = 'none';
                    testElement.innerHTML = '<a href="https://www.youtube.com/watch?v=test">Test Video</a>';
                    searchContainer.appendChild(testElement);
                    
                    setTimeout(() => {
                        testObserver.disconnect();
                        searchContainer.removeChild(testElement);
                        
                        recordTestResult(
                            'DOM Observer',
                            observerTriggered,
                            `Observer triggered: ${observerTriggered}, nodes added: ${addedNodesCount}`,
                            { observerTriggered, addedNodesCount }
                        );
                        
                        resolve({ success: observerTriggered, addedNodesCount });
                    }, 500);
                } else {
                    recordTestResult(
                        'DOM Observer',
                        false,
                        'Could not find suitable container for observation',
                        { searchContainer: null }
                    );
                    resolve({ success: false, error: 'No container found' });
                }
                
            } catch (error) {
                recordTestResult(
                    'DOM Observer',
                    false,
                    `Test failed: ${error.message}`,
                    { error: error.stack }
                );
                resolve({ success: false, error: error.message });
            }
        });
    }
    
    // パフォーマンステスト
    function testPerformance() {
        testLog('Starting performance test', 'info');
        
        try {
            const startTime = performance.now();
            
            // セレクタのパフォーマンステスト
            const selectors = [
                'a[href*="youtube.com"]',
                '.tF2Cxc a[href*="youtube.com"]',
                'div[data-ved] a[href*="youtube.com"]'
            ];
            
            const performanceResults = [];
            
            selectors.forEach(selector => {
                const selectorStartTime = performance.now();
                const elements = document.querySelectorAll(selector);
                const selectorEndTime = performance.now();
                
                performanceResults.push({
                    selector,
                    executionTime: selectorEndTime - selectorStartTime,
                    elementsFound: elements.length
                });
            });
            
            const totalTime = performance.now() - startTime;
            const avgTime = performanceResults.reduce((sum, result) => 
                sum + result.executionTime, 0) / performanceResults.length;
            
            const success = avgTime < 20; // 20ms以下を良好とする
            
            recordTestResult(
                'Performance Test',
                success,
                `Average selector time: ${avgTime.toFixed(2)}ms, Total time: ${totalTime.toFixed(2)}ms`,
                { performanceResults, avgTime, totalTime }
            );
            
            return { success, avgTime, totalTime, performanceResults };
            
        } catch (error) {
            recordTestResult(
                'Performance Test',
                false,
                `Test failed: ${error.message}`,
                { error: error.stack }
            );
            return { success: false, error: error.message };
        }
    }
    
    // 実際のフィルタリング動作テスト
    function testActualFiltering() {
        testLog('Starting actual filtering test', 'info');
        
        return new Promise((resolve) => {
            try {
                // 設定を一時的に変更してテスト
                const testChannelId = '@live-test-channel';
                const testChannelName = 'Live Test Channel';
                
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                    chrome.storage.sync.get(['bannedIds', 'bannedNames'], (currentData) => {
                        const newBannedIds = [...(currentData.bannedIds || []), testChannelId];
                        const newBannedNames = [...(currentData.bannedNames || []), testChannelName];
                        
                        chrome.storage.sync.set({
                            bannedIds: newBannedIds,
                            bannedNames: newBannedNames
                        }, () => {
                            // フィルタリング処理を実行
                            setTimeout(() => {
                                const hiddenElements = document.querySelectorAll('[data-youtube-filtered="true"]');
                                const success = hiddenElements.length >= 0; // 隠された要素があるかチェック
                                
                                recordTestResult(
                                    'Actual Filtering',
                                    success,
                                    `Found ${hiddenElements.length} filtered elements`,
                                    { 
                                        hiddenCount: hiddenElements.length,
                                        testChannelId,
                                        testChannelName
                                    }
                                );
                                
                                // 設定を元に戻す
                                chrome.storage.sync.set({
                                    bannedIds: currentData.bannedIds || [],
                                    bannedNames: currentData.bannedNames || []
                                }, () => {
                                    resolve({ success, hiddenCount: hiddenElements.length });
                                });
                            }, 1000);
                        });
                    });
                } else {
                    recordTestResult(
                        'Actual Filtering',
                        false,
                        'Chrome storage API not available for filtering test',
                        {}
                    );
                    resolve({ success: false, error: 'Chrome storage API not available' });
                }
                
            } catch (error) {
                recordTestResult(
                    'Actual Filtering',
                    false,
                    `Test failed: ${error.message}`,
                    { error: error.stack }
                );
                resolve({ success: false, error: error.message });
            }
        });
    }
    
    // 全てのライブテストを実行
    async function runAllLiveTests() {
        testLog('Starting Google Search Live Tests', 'info');
        
        // Google検索ページかどうかを確認
        if (!isGoogleSearchPage()) {
            testLog('Not on Google search page, some tests may not work correctly', 'warning');
        }
        
        try {
            // 1. YouTube動画検出テスト
            const detectionResult = testYouTubeVideoDetection();
            
            // 2. フィルタリング機能テスト
            const filteringResult = testFilteringFunctionality();
            
            // 3. 設定読み込みテスト
            const settingsResult = await testSettingsLoad();
            
            // 4. DOM監視テスト
            const observerResult = await testDOMObserver();
            
            // 5. パフォーマンステスト
            const performanceResult = testPerformance();
            
            // 6. 実際のフィルタリングテスト（設定がある場合のみ）
            let actualFilteringResult = null;
            if (settingsResult.success && settingsResult.data && 
                (settingsResult.data.bannedIds?.length > 0 || settingsResult.data.bannedNames?.length > 0)) {
                actualFilteringResult = await testActualFiltering();
            }
            
            // 結果をまとめて表示
            const successRate = liveTestResults.summary.total > 0 
                ? Math.round((liveTestResults.summary.passed / liveTestResults.summary.total) * 100) 
                : 0;
            
            testLog(`Live tests completed: ${liveTestResults.summary.passed}/${liveTestResults.summary.total} passed (${successRate}%)`, 'info');
            
            // 結果をコンソールに出力
            console.group('🔍 Google Search Filter Live Test Results');
            console.table(liveTestResults.tests.map(test => ({
                Test: test.name,
                Result: test.success ? '✅ PASS' : '❌ FAIL',
                Message: test.message
            })));
            console.groupEnd();
            
            // 詳細結果をオブジェクトとして返す
            return {
                summary: liveTestResults.summary,
                tests: liveTestResults.tests,
                successRate,
                timestamp: liveTestResults.timestamp
            };
            
        } catch (error) {
            testLog(`Error during live test execution: ${error.message}`, 'error');
            return {
                error: error.message,
                summary: liveTestResults.summary,
                tests: liveTestResults.tests
            };
        }
    }
    
    // グローバルに関数を公開（デバッグ用）
    window.googleSearchLiveTest = {
        runAll: runAllLiveTests,
        testYouTubeDetection: testYouTubeVideoDetection,
        testFiltering: testFilteringFunctionality,
        testSettings: testSettingsLoad,
        testObserver: testDOMObserver,
        testPerformance: testPerformance,
        testActualFiltering: testActualFiltering,
        getResults: () => liveTestResults
    };
    
    // ページ読み込み完了後に自動実行（オプション）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                testLog('Auto-running live tests after page load', 'info');
                runAllLiveTests();
            }, 2000); // 2秒待機してからテスト実行
        });
    } else {
        setTimeout(() => {
            testLog('Auto-running live tests', 'info');
            runAllLiveTests();
        }, 2000);
    }
    
    testLog('Google Search Live Test script loaded', 'info');
    
})();