document.addEventListener('DOMContentLoaded', () => {
    // --- 共通 DOM 元素 ---
    const gradeSelect = document.getElementById('grade-select');
    const weekSelect = document.getElementById('week-select');

    // --- index.html 專用 DOM 元素 ---
    const wordListContainer = document.getElementById('word-list');

    // --- activity.html 專用 DOM 元素 ---
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const quizContainer = document.getElementById('quiz-container');
    
    let controlsContainer = null; 

    let currentGradeData = null;
    let isAudioPlaying = false;

    // --- 教學模式相關變數 ---
    let currentCardIndex = 0;
    let wordCards = []; // 這個變數現在會指向 Modal 內的卡片
    let isAutoplaying = false;
    let autoplayTimeoutId = null;

    const toggleModeBtn = document.createElement('button');
    
    // 新增：Modal 相關的 DOM 元素
    let modalOverlay = null;
    let modalWordList = null;

    // 1. 當年級改變時，載入對應的 JSON 資料
    async function handleGradeChange() {
        const selectedGrade = gradeSelect.value;

        weekSelect.innerHTML = '<option value="">--請選擇--</option>';
        currentGradeData = null;

        // 根據所在頁面執行不同清理操作
        if (wordListContainer) { // 在 index.html
            wordListContainer.innerHTML = '';
            toggleModeBtn.style.display = 'none';
        }
        if (quizContainer) {
            quizContainer.style.display = 'none';
            quizContainer.innerHTML = '';
        }


        if (!selectedGrade) {
            if (wordListContainer) displayMessage("請先選擇年級。");
            weekSelect.disabled = true;
            if (startQuizBtn) startQuizBtn.disabled = true;
            return;
        }

        weekSelect.disabled = true;
        if (startQuizBtn) startQuizBtn.disabled = true;

        if (wordListContainer) displayMessage("正在載入年級資料...");

        try {
            const response = await fetch(`./document/grade${selectedGrade}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            currentGradeData = await response.json();
            populateWeekSelect();
            if (wordListContainer) displayMessage("請選擇週次來顯示單字。");
            weekSelect.disabled = false;
        } catch (error) {
            console.error("無法載入單字資料:", error);
            if (wordListContainer) {
                displayMessage(`錯誤：無法載入 ${selectedGrade} 年級的資料。請檢查 document/grade${selectedGrade}.json 檔案。`);
            }
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

        // 根據所在頁面執行不同操作
        if (wordListContainer) { // 在 index.html
            wordListContainer.innerHTML = '';
            toggleModeBtn.style.display = 'none';
        }
        if (quizContainer) { // 在 activity.html
            quizContainer.style.display = 'none';
            quizContainer.innerHTML = '';
        }


        if (!selectedGrade || !selectedWeek) {
            return;
        }

        // 在 activity.html，選擇週次後啟用測驗按鈕
        if (startQuizBtn) {
            startQuizBtn.disabled = false;
        }

        const weekData = currentGradeData.weeks.find(
            (w) => w.week.toString() === selectedWeek
        );
        
        if (!weekData || weekData.content.length === 0) {
            if (wordListContainer) displayMessage("這個組合沒有找到任何單字。");
            return;
        }

        // 只在 index.html 才顯示單字卡列表
        if (wordListContainer) {
            weekData.content.forEach(word => {
                const card = createWordCard(word, selectedGrade, selectedWeek);
                wordListContainer.appendChild(card);
            });

            const mainWordCards = wordListContainer.querySelectorAll('.word-card');
            if (toggleModeBtn && mainWordCards.length > 0) {
                toggleModeBtn.style.display = 'inline-block';
            }
        }
    }

    // 4. 建立單一單字卡片的 HTML 結構
    function createWordCard(word, grade, week) {
        const card = document.createElement('div');
        card.className = 'word-card';

        const gradeFolder = `Grade${grade}`;
        const weekFolder = String(week).padStart(2, '0');
        const wordFileName = `${word.word.toLowerCase().replace(/[\(\)]/g, '').trim()}.mp3`;
        const audioFile = `${gradeFolder}/${weekFolder}/${wordFileName}`;

        card.innerHTML = `
            <div class="word-info">
                <h2 class="english">${word.word}</h2>
                <p class="phonetic">${word.phonetic || ''}</p>
                <p class="details"><span class="pos">${word.pos || ''}</span> ${word.chinese || ''}</p>
                <p class="sentence">${word.sentence || ''}</p>
            </div>
            <button class="play-audio-btn" data-audio="${audioFile}">
                &#9658;
            </button>
        `;

        const playBtn = card.querySelector('.play-audio-btn');
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playAudioForCard(card);
        });

        // 新增：讓整張卡片都可以點擊播放音訊
        card.addEventListener('click', () => {
            // 直接呼叫現有的播放函式
            playAudioForCard(card);
        });

        return card;
    }

    // 5. 顯示提示訊息
    function displayMessage(message) {
        wordListContainer.innerHTML = `<p class="message">${message}</p>`;
    }

    // --- 教學模式相關函式 ---

    function playAudioForCard(card) {
        return new Promise((resolve) => {
            if (isAudioPlaying) {
                resolve();
                return;
            }

            const playBtn = card.querySelector('.play-audio-btn');
            if (!playBtn) {
                autoplayTimeoutId = setTimeout(resolve, 2000);
                return;
            }

            isAudioPlaying = true;
            playBtn.disabled = true;

            const audioSrc = playBtn.dataset.audio;
            const audio = new Audio(`./Audio/${audioSrc}`);
            
            audio.onended = () => {
                isAudioPlaying = false;
                playBtn.disabled = false;
                resolve();
            };
            audio.onerror = () => {
                console.error("音訊檔案載入或播放失敗:", audioSrc);
                isAudioPlaying = false;
                playBtn.disabled = false;
                autoplayTimeoutId = setTimeout(resolve, 2000);
            };
            audio.play();
        });
    }

    async function startAutoplay() {
        isAutoplaying = true;
        
        while (isAutoplaying && wordCards.length > 0) {
            const currentCard = wordCards[currentCardIndex];
            if (!currentCard) break;

            updateActiveCard();

            await playAudioForCard(currentCard);

            if (!isAutoplaying) break;

            await new Promise(resolve => {
                autoplayTimeoutId = setTimeout(resolve, 1500);
            });

            if (!isAutoplaying) break;

            showNextCard();
        }
    }

    function enterTeachingMode() {
        const mainWordCards = wordListContainer.querySelectorAll('.word-card');
        if (mainWordCards.length === 0) return;

        // 複製主畫面的卡片到 Modal 中
        modalWordList.innerHTML = '';
        mainWordCards.forEach(card => {
            modalWordList.appendChild(card.cloneNode(true));
        });
        // 更新 wordCards 變數為 Modal 內的卡片
        wordCards = modalWordList.querySelectorAll('.word-card');

        modalOverlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden'; // 防止背景滾動
        
        toggleModeBtn.textContent = '結束教學';
        
        currentCardIndex = 0;
        startAutoplay();
    }

    function exitTeachingMode() {
        isAutoplaying = false;
        clearTimeout(autoplayTimeoutId);

        modalOverlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.style.overflow = ''; // 恢復背景滾動

        toggleModeBtn.textContent = '教學模式';
        
        // 清空 Modal 內的卡片，釋放記憶體
        if(modalWordList) modalWordList.innerHTML = '';
        wordCards = [];
    }

    function updateActiveCard() {
        wordCards.forEach((card, index) => {
            if (index === currentCardIndex) {
                card.classList.add('active');
                // 當卡片變為 active 後，立即調整字體大小
                adjustFontSize(card);
            } else {
                card.classList.remove('active');
            }
        });
    }

    // 新增：動態調整字體大小以適應容器
    function adjustFontSize(card) {
        const englishEl = card.querySelector('.english');
        const container = card.querySelector('.word-info');
        if (!englishEl || !container) return;

        let fontSize = 20; // 根據要求設定為 20rem 作為最大起始值
        englishEl.style.fontSize = `${fontSize}rem`;

        // 當文字的滾動寬度大於容器的客戶區寬度時，縮小字體
        while (englishEl.scrollWidth > container.clientWidth && fontSize > 1) {
            fontSize -= 0.5; // 每次減少 0.5rem
            englishEl.style.fontSize = `${fontSize}rem`;
        }
    }

    function showNextCard() {
        currentCardIndex = (currentCardIndex + 1) % wordCards.length;
    }

    // 初始化控制按鈕和 Modal
    function setupControlsAndModal() {
        // --- 控制按鈕 ---
        controlsContainer = document.querySelector('.controls');
        if (!controlsContainer) {
            console.warn('警告：在 HTML 中找不到 ".controls" 容器。將自動建立一個。');
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'controls';
            const header = document.querySelector('header');
            if (header) {
                header.insertAdjacentElement('afterend', controlsContainer);
            } else {
                document.body.prepend(controlsContainer);
            }
        }

        toggleModeBtn.id = 'toggle-teaching-mode';
        toggleModeBtn.textContent = '教學模式';
        toggleModeBtn.style.display = 'none';
        controlsContainer.appendChild(toggleModeBtn);

        toggleModeBtn.addEventListener('click', () => {
            if (document.body.classList.contains('modal-open')) {
                exitTeachingMode();
            } else {
                enterTeachingMode();
            }
        });

        // --- Modal ---
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.innerHTML = '&times;'; // 關閉按鈕的 'x' 符號
        closeBtn.onclick = exitTeachingMode;

        modalWordList = document.createElement('div');
        modalWordList.id = 'word-list'; // 讓樣式可以共用

        modalContent.appendChild(modalWordList);
        modalContent.appendChild(closeBtn);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // 鍵盤事件
        document.addEventListener('keydown', (e) => {
            if (document.body.classList.contains('modal-open') && e.key === 'Escape') {
                exitTeachingMode();
            }
        });
    }

    // --- 選擇題測驗相關函式 ---

    function startQuiz() {
        const selectedWeek = weekSelect.value;
        if (!currentGradeData || !selectedWeek) {
            alert('請先選擇年級和週次以載入單字！');
            return;
        }

        const weekData = currentGradeData.weeks.find(w => w.week.toString() === selectedWeek);
        const words = weekData.content;

        if (!words || words.length < 4) {
            alert('本週單字少於4個，無法產生選擇題。');
            return;
        }

        quizContainer.style.display = 'block';
        generateQuestion();
    }

    function generateQuestion() {
        const selectedWeek = weekSelect.value;
        const weekData = currentGradeData.weeks.find(w => w.week.toString() === selectedWeek);
        const allWords = [...weekData.content]; // 複製一份單字陣列

        // 1. 隨機選取一個正確答案
        const correctWordIndex = Math.floor(Math.random() * allWords.length);
        const correctWord = allWords.splice(correctWordIndex, 1)[0];

        // 2. 隨機選取三個干擾選項
        const options = [correctWord];
        allWords.sort(() => 0.5 - Math.random()); // 打亂剩餘的單字
        const distractors = allWords.slice(0, 3);
        options.push(...distractors);

        // 3. 再次打亂包含正確答案的四個選項
        options.sort(() => 0.5 - Math.random());

        // 4. 產生 HTML
        quizContainer.innerHTML = `
            <div class="quiz-question">「${correctWord.chinese}」的英文是？</div>
            <div class="quiz-options">
                ${options.map(word => `
                    <div class="quiz-option" data-word="${word.word}">${word.word}</div>
                `).join('')}
            </div>
            <div id="quiz-feedback"></div>
        `;

        // 5. 為選項加上事件監聽
        const optionElements = quizContainer.querySelectorAll('.quiz-option');
        optionElements.forEach(optionEl => {
            optionEl.addEventListener('click', () => checkAnswer(optionEl, correctWord.word));
        });
    }

    function checkAnswer(selectedOption, correctWord) {
        const options = quizContainer.querySelectorAll('.quiz-option');
        const feedbackEl = document.getElementById('quiz-feedback');
        let isCorrect = false;

        // 停用所有選項，防止重複點擊
        options.forEach(opt => opt.classList.add('disabled'));

        if (selectedOption.dataset.word === correctWord) {
            selectedOption.classList.add('correct');
            feedbackEl.innerHTML = '<p style="color: green;">答對了！</p>';
            isCorrect = true;
        } else {
            selectedOption.classList.add('incorrect');
            feedbackEl.innerHTML = `<p style="color: red;">答錯了，正確答案是 ${correctWord}。</p>`;
            // 標示出正確答案
            options.forEach(opt => {
                if (opt.dataset.word === correctWord) {
                    opt.classList.add('correct');
                }
            });
        }

        // 顯示「下一題」按鈕
        const nextButton = document.createElement('button');
        nextButton.textContent = '下一題';
        nextButton.className = 'activity-btn';
        nextButton.onclick = generateQuestion; // 點擊直接產生新題目
        feedbackEl.appendChild(nextButton);
    }


    // 程式起始點
    if (gradeSelect && weekSelect) {
        weekSelect.disabled = true;
        gradeSelect.addEventListener('change', handleGradeChange);
        weekSelect.addEventListener('change', displayWordsForWeek);

        // 僅在 index.html 執行的部分
        if (wordListContainer) {
            setupControlsAndModal();
            displayMessage("請先選擇年級。");
        }

        // 僅在 activity.html 執行的部分
        if (startQuizBtn && quizContainer) {
            startQuizBtn.disabled = true;
            startQuizBtn.addEventListener('click', startQuiz);
        }
    }
});
