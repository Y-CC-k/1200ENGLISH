      document.addEventListener('DOMContentLoaded', () => {
    // 獲取 DOM 元素
    const gradeSelect = document.getElementById('grade-select');
    const weekSelect = document.getElementById('week-select');
    const wordListContainer = document.getElementById('word-list');

    let currentGradeData = null; // 用來存放當前選定年級的資料
    let isAudioPlaying = false; // 用來追蹤是否有音訊正在播放

    // 1. 當年級改變時，載入對應的 JSON 資料
    async function handleGradeChange() {
        const selectedGrade = gradeSelect.value;
        
        // 清空週次選單和單字列表
        weekSelect.innerHTML = '<option value="">--請選擇--</option>';
        wordListContainer.innerHTML = '';
        currentGradeData = null;

        if (!selectedGrade) {
            displayMessage("請先選擇年級。");
            weekSelect.disabled = true;
            return;
        }

        weekSelect.disabled = true; // 載入時禁用
        displayMessage("正在載入年級資料...");

        try {
            // 根據選擇的年級，動態決定要載入的檔案路徑
            const response = await fetch(`./document/grade${selectedGrade}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            currentGradeData = await response.json();
            populateWeekSelect(); // 成功載入後，填入週次
            displayMessage("請選擇週次來顯示單字。");
            weekSelect.disabled = false; // 啟用週次選單
        } catch (error) {
            console.error("無法載入單字資料:", error);
            displayMessage(`錯誤：無法載入 ${selectedGrade} 年級的資料。請檢查 document/grade${selectedGrade}.json 檔案。`);
        }
    }

    // 2. 根據載入的資料，產生週次下拉選單
    function populateWeekSelect() {
        if (!currentGradeData || !currentGradeData.weeks) return;

        currentGradeData.weeks.forEach(weekInfo => {
            const option = document.createElement('option');
            option.value = weekInfo.week;
            option.textContent = `第 ${weekInfo.week} 週`;
            weekSelect.appendChild(option);
        });
    }

    // 3. 根據選擇的週次來顯示單字
    function displayWordsForWeek() {
        const selectedGrade = gradeSelect.value;
        const selectedWeek = weekSelect.value;
        
        wordListContainer.innerHTML = '';

        if (!selectedGrade || !selectedWeek) {
            return;
        }

        const weekData = currentGradeData.weeks.find(
            (w) => w.week.toString() === selectedWeek
        );
        
        if (!weekData || weekData.content.length === 0) {
            displayMessage("這個組合沒有找到任何單字。");
            return;
        }

        // 建立單字卡片並插入到頁面中
        weekData.content.forEach(word => {
            // 將年級和週次資訊傳遞給卡片建立函式
            const card = createWordCard(word, selectedGrade, selectedWeek);
            wordListContainer.appendChild(card);
        });
    }

    // 4. 建立單一單字卡片的 HTML 結構
    function createWordCard(word, grade, week) {
        const card = document.createElement('div');
        card.className = 'word-card';

        // 根據新的資料夾結構組合音訊檔案路徑 (例如: ./Audio/Grade3/01/apple.mp3)
        const gradeFolder = `Grade${grade}`;
        const weekFolder = String(week).padStart(2, '0');
        const wordFileName = `${word.word.toLowerCase()}.mp3`;
        // 使用 / 作為路徑分隔符以確保跨平台相容性
        const audioFile = `${gradeFolder}/${weekFolder}/${wordFileName}`;

        card.innerHTML = `
            <div class="word-info">
                <h2 class="english">${word.word}</h2>
                <p class="phonetic">${word.phonetic || ''}</p>
                <p class="details"><span class="pos">${word.pos || ''}</span> ${word.chinese || ''}</p>
                <p class="sentence">${word.sentence || ''}</p>
            </div>
            <button class="play-audio-btn" data-audio="${audioFile}">
                &#9658; <!-- 這是播放符號 ► -->
            </button>
        `;

        // 為播放按鈕添加點擊事件
        const playBtn = card.querySelector('.play-audio-btn');
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止事件冒泡

            // 如果有音訊正在播放，則不執行任何操作
            if (isAudioPlaying) {
                return;
            }

            // 設定狀態為播放中，並禁用所有播放按鈕
            isAudioPlaying = true;
            document.querySelectorAll('.play-audio-btn').forEach(btn => btn.disabled = true);

            const audio = new Audio(`./Audio/${audioFile}`);

            // 當音訊播放結束時，恢復按鈕功能
            audio.onended = () => {
                isAudioPlaying = false;
                document.querySelectorAll('.play-audio-btn').forEach(btn => btn.disabled = false);
            };

            // 處理播放錯誤
            audio.onerror = () => {
                console.error("音訊檔案載入或播放失敗:", audioFile);
                isAudioPlaying = false; // 發生錯誤也要恢復狀態
                document.querySelectorAll('.play-audio-btn').forEach(btn => btn.disabled = false);
            };

            audio.play();
        });

        return card;
    }

    // 5. 顯示提示訊息
    function displayMessage(message) {
        wordListContainer.innerHTML = `<p class="message">${message}</p>`;
    }

    // 6. 監聽下拉選單的變動
    gradeSelect.addEventListener('change', handleGradeChange);
    weekSelect.addEventListener('change', displayWordsForWeek);

    // 程式起始點：初始化頁面狀態
    displayMessage("請先選擇年級。");
    weekSelect.disabled = true;
});
