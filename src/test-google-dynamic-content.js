// Google検索動的コンテンツ監視機能の自動テストスクリプト

/**
 * 動的コンテンツ監視機能の自動テストスイート
 */
class GoogleDynamicContentTester {
    constructor() {
        this.testResults = [];
        this.mockElements = [];
        this.originalConsoleLog = console.log;
        this.originalConsoleDebug = console.debug;
        this.capturedLogs = [];
        
        // テスト用のモックデータ
        this.mockChannels = [
            { name: 'TestChannel1', handle: '@testchannel1', id: 'UC1234567890' },
            { name: 'TestChannel2', handle: '@testchannel2', id: 'UC0987654321' },
            { name: 'BannedChannel', handle: '@bannedchannel', id: 'UC9999999999' }
        ];
        
        this.mockVideos = [
            { title: 'テスト動画1', id: 'dQw4w9WgXcQ' },
            { title: 'テスト動画2', id: 'oHg5SJYRHA0' },
            { title: 'ブロック対象動画', id: 'blocked123' }
        ];
    }

    /**
     * コンソールログをキャプチャする
     */
    startLogCapture() {
        this.capturedLogs = [];
        
        console.log = (...args) => {
            this.capturedLogs.push({ level: 'log', args, timestamp: Date.now() });
            this.originalConsoleLog.apply(console, args);
        };
        
        console.debug = (...args) => {
            this.capturedLogs.push({ level: 'debug', args, timestamp: Date.now() });
            this.originalConsoleDebug.apply(console, args);
        };
    }

    /**
     * コンソールログキャプチャを停止する
     */
    stopLogCapture() {
        console.log = this.originalConsoleLog;
        console.debug = this.originalConsoleDebug;
    }

    /**
     * テスト結果を記録する
     */
    recordTestResult(testName, passed, message = '', details = {}) {
        const result = {
            testName,
            passed,
            message,
            details,
            timestamp: Date.now()
        };
        
        this.testResults.push(result);
        
        const status = passed ? '✓ PASS' : '✗ FAIL';
        console.log(`[TEST] ${status}: ${testName} - ${message}`);
        
        if (!passed) {
            console.error('Test details:', details);
        }
    }

    /**
     * モックYouTube動画要素を作成する
     */
    createMockVideoElement(channel, video, containerClass = 'g') {
        const container = document.createElement('div');
        container.className = containerClass;
        container.setAttribute('data-ved', `test-${Date.now()}-${Math.random()}`);
        
        const link = document.createElement('a');
        link.href = `https://www.youtube.com/watch?v=${video.id}`;
        link.textContent = video.title;
        
        const cite = document.createElement('cite');
        cite.textContent = `https://www.youtube.com/${channel.handle}`;
        
        const channelInfo = document.createElement('div');
        channelInfo.className = 'VuuXrf';
        channelInfo.textContent = channel.name;
        
        container.appendChild(link);
        container.appendChild(cite);
        container.appendChild(channelInfo);
        
        this.mockElements.push(container);
        return container;
    }

    /**
     * テスト1: MutationObserverの基本動作テスト
     */
    async testMutationObserverBasics() {
        const testName = 'MutationObserver基本動作';
        
        try {
            // テスト用コンテナを作成
            const testContainer = document.createElement('div');
            testContainer.id = 'mutation-test-container';
            document.body.appendChild(testContainer);
            
            // ログキャプチャ開始
            this.startLogCapture();
            
            // モック動画要素を追加
            const mockElement = this.createMockVideoElement(
                this.mockChannels[0], 
                this.mockVideos[0]
            );
            
            testContainer.appendChild(mockElement);
            
            // MutationObserverが反応するまで少し待機
            await this.wait(200);
            
            // ログを確認
            const mutationLogs = this.capturedLogs.filter(log => 
                log.args.some(arg => 
                    typeof arg === 'string' && 
                    (arg.includes('mutation') || arg.includes('new video element'))
                )
            );
            
            this.stopLogCapture();
            
            // クリーンアップ
            document.body.removeChild(testContainer);
            
            const passed = mutationLogs.length > 0;
            this.recordTestResult(testName, passed, 
                passed ? 'MutationObserverが正常に動作' : 'MutationObserverが反応しない',
                { capturedLogs: mutationLogs.length, totalLogs: this.capturedLogs.length }
            );
            
        } catch (error) {
            this.recordTestResult(testName, false, `エラー: ${error.message}`, { error });
        }
    }

    /**
     * テスト2: 動的コンテンツ検出テスト
     */
    async testDynamicContentDetection() {
        const testName = '動的コンテンツ検出';
        
        try {
            if (!window.debugYouTubeFilter) {
                this.recordTestResult(testName, false, 'debugYouTubeFilter が利用できません');
                return;
            }
            
            // 初期状態の動画数を取得
            const initialVideos = window.debugYouTubeFilter.detectVideos();
            const initialCount = initialVideos.length;
            
            // 新しい動画要素を追加
            const testContainer = document.createElement('div');
            testContainer.id = 'dynamic-content-test';
            document.body.appendChild(testContainer);
            
            const mockElement = this.createMockVideoElement(
                this.mockChannels[1], 
                this.mockVideos[1]
            );
            
            testContainer.appendChild(mockElement);
            
            // 検出まで少し待機
            await this.wait(300);
            
            // 追加後の動画数を取得
            const afterVideos = window.debugYouTubeFilter.detectVideos();
            const afterCount = afterVideos.length;
            
            // クリーンアップ
            document.body.removeChild(testContainer);
            
            const passed = afterCount > initialCount;
            this.recordTestResult(testName, passed,
                passed ? `動画検出数が増加 (${initialCount} → ${afterCount})` : '動画検出数に変化なし',
                { initialCount, afterCount, difference: afterCount - initialCount }
            );
            
        } catch (error) {
            this.recordTestResult(testName, false, `エラー: ${error.message}`, { error });
        }
    }

    /**
     * テスト3: フィルタリング機能テスト
     */
    async testFilteringFunctionality() {
        const testName = 'フィルタリング機能';
        
        try {
            if (!window.debugYouTubeFilter) {
                this.recordTestResult(testName, false, 'debugYouTubeFilter が利用できません');
                return;
            }
            
            // テスト用のブロック設定を一時的に設定
            const originalSettings = window.debugYouTubeFilter.settings();
            
            // ブロック対象チャンネルを含む動画要素を作成
            const testContainer = document.createElement('div');
            testContainer.id = 'filtering-test';
            document.body.appendChild(testContainer);
            
            const blockedElement = this.createMockVideoElement(
                this.mockChannels[2], // BannedChannel
                this.mockVideos[2]
            );
            
            testContainer.appendChild(blockedElement);
            
            // フィルタリングを実行
            await window.debugYouTubeFilter.filterVideos(testContainer, true);
            
            // 要素が非表示になっているかチェック
            const isHidden = blockedElement.hasAttribute('data-youtube-filtered') ||
                           blockedElement.style.display === 'none' ||
                           blockedElement.style.visibility === 'hidden';
            
            // クリーンアップ
            document.body.removeChild(testContainer);
            
            this.recordTestResult(testName, isHidden,
                isHidden ? 'ブロック対象動画が正常に非表示化' : 'フィルタリングが機能していない',
                { elementHidden: isHidden, hasFilterAttribute: blockedElement.hasAttribute('data-youtube-filtered') }
            );
            
        } catch (error) {
            this.recordTestResult(testName, false, `エラー: ${error.message}`, { error });
        }
    }

    /**
     * テスト4: 検索クエリ変更検出テスト
     */
    async testSearchQueryChangeDetection() {
        const testName = '検索クエリ変更検出';
        
        try {
            this.startLogCapture();
            
            // 現在のURLを保存
            const originalUrl = window.location.href;
            
            // URL変更をシミュレート
            const testQuery = 'test-query-' + Date.now();
            const newUrl = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(testQuery)}`;
            
            // history.pushStateを使用してURL変更
            history.pushState({}, '', newUrl);
            
            // URL変更の検出まで待機
            await this.wait(1200);
            
            // ログを確認
            const queryChangeLogs = this.capturedLogs.filter(log => 
                log.args.some(arg => 
                    typeof arg === 'string' && 
                    (arg.includes('query changed') || arg.includes('URL changed'))
                )
            );
            
            this.stopLogCapture();
            
            // 元のURLに戻す
            history.pushState({}, '', originalUrl);
            
            const passed = queryChangeLogs.length > 0;
            this.recordTestResult(testName, passed,
                passed ? '検索クエリ変更が正常に検出' : '検索クエリ変更が検出されない',
                { queryChangeLogs: queryChangeLogs.length, testQuery }
            );
            
        } catch (error) {
            this.recordTestResult(testName, false, `エラー: ${error.message}`, { error });
        }
    }

    /**
     * テスト5: パフォーマンステスト
     */
    async testPerformance() {
        const testName = 'パフォーマンス';
        
        try {
            if (!window.debugYouTubeFilter) {
                this.recordTestResult(testName, false, 'debugYouTubeFilter が利用できません');
                return;
            }
            
            const testContainer = document.createElement('div');
            testContainer.id = 'performance-test';
            document.body.appendChild(testContainer);
            
            // 大量の要素を追加
            const elementCount = 50;
            const startTime = performance.now();
            
            for (let i = 0; i < elementCount; i++) {
                const mockElement = this.createMockVideoElement(
                    this.mockChannels[i % this.mockChannels.length],
                    this.mockVideos[i % this.mockVideos.length]
                );
                testContainer.appendChild(mockElement);
            }
            
            // フィルタリング実行
            const filterStartTime = performance.now();
            await window.debugYouTubeFilter.filterVideos(testContainer, true);
            const filterEndTime = performance.now();
            
            const totalTime = filterEndTime - startTime;
            const filterTime = filterEndTime - filterStartTime;
            const averageTimePerElement = filterTime / elementCount;
            
            // クリーンアップ
            document.body.removeChild(testContainer);
            
            // パフォーマンス基準: 1要素あたり5ms以下
            const passed = averageTimePerElement < 5;
            
            this.recordTestResult(testName, passed,
                `${elementCount}要素の処理時間: ${filterTime.toFixed(2)}ms (平均: ${averageTimePerElement.toFixed(2)}ms/要素)`,
                { 
                    totalTime: totalTime.toFixed(2),
                    filterTime: filterTime.toFixed(2),
                    averageTimePerElement: averageTimePerElement.toFixed(2),
                    elementCount,
                    performanceThreshold: 5
                }
            );
            
        } catch (error) {
            this.recordTestResult(testName, false, `エラー: ${error.message}`, { error });
        }
    }

    /**
     * テスト6: 無限スクロール検出テスト
     */
    async testInfiniteScrollDetection() {
        const testName = '無限スクロール検出';
        
        try {
            this.startLogCapture();
            
            // スクロール位置を下部に移動
            const originalScrollY = window.scrollY;
            window.scrollTo(0, document.body.scrollHeight);
            
            // スクロールイベントの処理まで待機
            await this.wait(500);
            
            // ログを確認
            const scrollLogs = this.capturedLogs.filter(log => 
                log.args.some(arg => 
                    typeof arg === 'string' && 
                    (arg.includes('bottom of page') || arg.includes('scroll'))
                )
            );
            
            this.stopLogCapture();
            
            // 元のスクロール位置に戻す
            window.scrollTo(0, originalScrollY);
            
            const passed = scrollLogs.length > 0;
            this.recordTestResult(testName, passed,
                passed ? '無限スクロールが正常に検出' : '無限スクロールが検出されない',
                { scrollLogs: scrollLogs.length }
            );
            
        } catch (error) {
            this.recordTestResult(testName, false, `エラー: ${error.message}`, { error });
        }
    }

    /**
     * 指定時間待機する
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 全テストを実行する
     */
    async runAllTests() {
        console.log('=== Google検索動的コンテンツ監視機能テスト開始 ===');
        
        this.testResults = [];
        
        // 各テストを順次実行
        await this.testMutationObserverBasics();
        await this.wait(100);
        
        await this.testDynamicContentDetection();
        await this.wait(100);
        
        await this.testFilteringFunctionality();
        await this.wait(100);
        
        await this.testSearchQueryChangeDetection();
        await this.wait(100);
        
        await this.testPerformance();
        await this.wait(100);
        
        await this.testInfiniteScrollDetection();
        
        // テスト結果のサマリーを表示
        this.displayTestSummary();
        
        // クリーンアップ
        this.cleanup();
        
        return this.testResults;
    }

    /**
     * テスト結果のサマリーを表示する
     */
    displayTestSummary() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(result => result.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n=== テスト結果サマリー ===');
        console.log(`総テスト数: ${totalTests}`);
        console.log(`成功: ${passedTests}`);
        console.log(`失敗: ${failedTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n失敗したテスト:');
            this.testResults
                .filter(result => !result.passed)
                .forEach(result => {
                    console.log(`- ${result.testName}: ${result.message}`);
                });
        }
        
        console.log('\n詳細なテスト結果:');
        console.table(this.testResults.map(result => ({
            テスト名: result.testName,
            結果: result.passed ? '成功' : '失敗',
            メッセージ: result.message,
            実行時刻: new Date(result.timestamp).toLocaleTimeString()
        })));
    }

    /**
     * テスト用リソースをクリーンアップする
     */
    cleanup() {
        // 作成したモック要素を削除
        this.mockElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        this.mockElements = [];
        
        // ログキャプチャを停止
        this.stopLogCapture();
        
        console.log('テストクリーンアップ完了');
    }
}

// グローバルに公開
window.GoogleDynamicContentTester = GoogleDynamicContentTester;

// 自動実行用の関数
window.runGoogleDynamicContentTests = async function() {
    const tester = new GoogleDynamicContentTester();
    return await tester.runAllTests();
};

// ページ読み込み完了後に自動実行（オプション）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Google検索動的コンテンツ監視機能テストスクリプトが読み込まれました');
        console.log('テスト実行: window.runGoogleDynamicContentTests()');
    });
} else {
    console.log('Google検索動的コンテンツ監視機能テストスクリプトが読み込まれました');
    console.log('テスト実行: window.runGoogleDynamicContentTests()');
}