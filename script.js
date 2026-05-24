document.addEventListener('DOMContentLoaded', () => {
    // --- 게임 설정 상수 ---
    const FIRST_DOT_TIME = 5; // 첫 번째 점 등장 시간 (초)
    const EARLY_OBSTACLE_START_MIN = 13; // 초반 방해물 시작 최소 시간 (초)
    const EARLY_OBSTACLE_START_MAX = 17; // 초반 방해물 시작 최대 시간 (초)
    const EARLY_SPAWN_MIN_INTERVAL = 1500; // 초반 방해물 등장 최소 간격 (밀리초)
    const EARLY_SPAWN_MAX_INTERVAL = 4000; // 초반 방해물 등장 최대 간격 (밀리초)

    // 전역 상태 변수
    let playTime = 0;
    let isGameOver = false;
    let currentEarlyStartTime = 0; // 매 게임마다 13~17초 사이로 랜덤 설정되는 실제 시작 시간

    let timerInterval = null;
    let spawnTimer = null;
    let midSpawnTimer = null;
    let lateSpawnTimer = null;
    let typeWriterTimer = null; // 타자 효과 취소용
    let pauseTrapTimer = null;
    let pauseClickedTime = 0;
    let isEasterEggActive = false;
    let anxietyActive = false; // 후반부 불안 연출 활성화 여부
    let mouseMovementIntensity = 0; // 마우스 움직임 강도

    // 기록 저장 방해물 관련 상수 및 변수
    const SAVE_PROMPT_START_TIME = 237;
    const SAVE_PROMPT_END_TIME = 267;
    const SAVE_PROMPT_TEST_TIME = 15; // 테스트용 15초
    let hasShownSavePrompt = false;

    // 보상 룰렛 방해물 관련 상수 및 변수
    const REWARD_ROULETTE_START_TIME = 205; // 3분 25초
    const REWARD_ROULETTE_END_TIME = 225; // 3분 45초
    let hasShownRewardRoulette = false;

    // UI 요소
    const pauseBtn = document.getElementById('icon-pause');
    const powerBtn = document.getElementById('icon-power');
    const restartBtn = document.getElementById('restart-btn');
    const trueEndingRestartBtn = document.getElementById('true-ending-restart-btn');

    // 메인 타이머 시작 함수
    function startMainTimer() {
        if (currentEarlyStartTime === 0) {
            currentEarlyStartTime = Math.floor(Math.random() * (EARLY_OBSTACLE_START_MAX - EARLY_OBSTACLE_START_MIN + 1)) + EARLY_OBSTACLE_START_MIN;
        }

        timerInterval = setInterval(() => {
            if (isGameOver) return;

            playTime++;

            if (playTime === FIRST_DOT_TIME) { showFirstDotObstacle(); }
            if (playTime === 12) { showInputWaitingText(); }
            if (playTime === 16) { startSpawningObstacles(); }
            if (playTime === 60) { startSpawningMidObstacles(); }
            if (playTime === 160) { triggerFakeErrorEvent(); }
            if (playTime === 180) { triggerThreeMinuteEvent(); }
            
            // 후반부 보상 룰렛 등장 로직 (3분 25초 ~ 3분 45초 랜덤)
            if (playTime >= REWARD_ROULETTE_START_TIME && playTime <= REWARD_ROULETTE_END_TIME && !hasShownRewardRoulette) {
                if (Math.random() < 0.1 || playTime === REWARD_ROULETTE_END_TIME) {
                    showRewardRoulette();
                    hasShownRewardRoulette = true;
                }
            }

            /*
            // 테스트용 기록 저장 시스템 창 강제 호출 (15초)
            if (playTime === SAVE_PROMPT_TEST_TIME && !hasShownSavePrompt) {
                showSavePrompt();
                hasShownSavePrompt = true;
            }
            */
            // 후반부 기록 저장 시스템 창 등장 로직 (3분 50초 ~ 4분 20초 랜덤)
            // 테스트 시 SAVE_PROMPT_TEST_TIME 상수를 활용해 조기 등장 가능
            if (playTime >= SAVE_PROMPT_START_TIME && playTime <= SAVE_PROMPT_END_TIME && !hasShownSavePrompt) {
                if (Math.random() < 0.1 || playTime === SAVE_PROMPT_END_TIME) {
                    showSavePrompt();
                    hasShownSavePrompt = true;
                }
            }

            if (playTime === 300) { triggerFiveMinuteEvent(); }
        }, 1000);
    }

    // 게임 리셋(초기화) 함수
    function resetGame() {
        // 모든 타이머 정지
        clearInterval(timerInterval);
        clearTimeout(spawnTimer);
        clearTimeout(midSpawnTimer);
        clearTimeout(lateSpawnTimer);
        clearTimeout(pauseTrapTimer);
        clearTimeout(typeWriterTimer);

        // 상태 변수 초기화
        playTime = 0;
        currentEarlyStartTime = 0;
        isGameOver = false;
        isEasterEggActive = false;
        pauseClickedTime = 0;
        pauseTrapTimer = null;
        anxietyActive = false;
        mouseMovementIntensity = 0;
        hasShownSavePrompt = false;
        hasShownRewardRoulette = false;
        document.body.style.backgroundColor = ''; // 배경색 복구
        document.body.style.boxShadow = '';
        document.body.style.transform = '';

        // DOM 요소 초기화
        document.body.className = '';
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('true-ending-screen').classList.add('hidden');
        document.getElementById('fake-ending-screen').classList.add('hidden');
        document.getElementById('easter-egg-screen').classList.add('hidden');
        document.getElementById('top-icons').classList.remove('hidden');

        // 생성된 모든 방해물 삭제
        const obstacles = document.querySelectorAll('.obstacle');
        obstacles.forEach(obs => obs.remove());

        // 생성된 앰비언트 텍스트 삭제
        const ambients = document.querySelectorAll('.ambient-text');
        ambients.forEach(el => el.remove());

        // 버튼 및 특수 효과 초기화
        restartBtn.classList.add('hidden');
        if (trueEndingRestartBtn) trueEndingRestartBtn.classList.add('hidden');
        pauseBtn.classList.remove('shatter-effect');

        // 진짜 엔딩 화면 DOM 원상복구
        const h1_404 = document.getElementById('true-ending-404');
        h1_404.style.animation = 'none';
        h1_404.style.display = 'block';
        const textContainer = document.getElementById('true-ending-texts');
        textContainer.innerHTML = '';
        textContainer.classList.add('hidden');

        // 메인 타이머 재시작
        startMainTimer();
    }

    startMainTimer(); // 최초 실행

    // --- 후반부 불안 연출 (마우스 반응) ---
    document.addEventListener('mousemove', (e) => {
        if (!anxietyActive || isGameOver) return;

        // 마우스 이동 속도 기반 강도 증가
        const speed = Math.sqrt(e.movementX ** 2 + e.movementY ** 2);
        mouseMovementIntensity += speed * 0.05;
        if (mouseMovementIntensity > 14) mouseMovementIntensity = 14; // 최대 241 (#f1f1f1)

        // 빠른 움직임 시 1px 미세 흔들림
        if (speed > 50) {
            const rx = (Math.random() - 0.5) * 2;
            const ry = (Math.random() - 0.5) * 2;
            document.body.style.transform = `translate(${rx}px, ${ry}px)`;
            setTimeout(() => {
                if (!isGameOver) document.body.style.transform = '';
            }, 100);
        }
    });

    function updateAnxietyEffect() {
        if (!anxietyActive || isGameOver) return;

        if (mouseMovementIntensity > 0) {
            mouseMovementIntensity -= 0.2; // 서서히 감소 (약 1.2초에 걸쳐 복구)
            if (mouseMovementIntensity < 0) mouseMovementIntensity = 0;
        }

        // 배경색 변화: 255 -> 241 (#f1f1f1)
        const colorVal = 255 - Math.floor(mouseMovementIntensity);
        document.body.style.backgroundColor = `rgb(${colorVal}, ${colorVal}, ${colorVal})`;

        // 화면 가장자리 미세한 안쪽 그림자 효과
        if (mouseMovementIntensity > 0) {
            const shadowOpacity = (mouseMovementIntensity / 14) * 0.15; // 최대 0.15
            document.body.style.boxShadow = `inset 0 0 60px rgba(0, 0, 0, ${shadowOpacity})`;
        } else {
            document.body.style.boxShadow = '';
        }

        requestAnimationFrame(updateAnxietyEffect);
    }

    // 1. 일시정지(함정) 버튼
    pauseBtn.addEventListener('click', () => {
        if (isGameOver || isEasterEggActive || pauseTrapTimer) return;

        pauseClickedTime = Date.now();
        pauseBtn.classList.add('shatter-effect');

        // 1초 뒤에 실패 처리
        pauseTrapTimer = setTimeout(() => {
            pauseTrapTimer = null; // 초기화
            gameOver("멈춤마저 버튼으로 해결하려 했습니다.<br>게임이 종료됩니다.", false, "pause_trap");
        }, 1000);
    });

    // 2. 게임 종료 버튼 (이스터에그 판별 포함)
    powerBtn.addEventListener('click', () => {
        if (isGameOver || isEasterEggActive) return;

        const now = Date.now();

        // ⏸ 버튼을 누르고 1초(1000ms) 이내에 ⏻ 버튼을 누른 경우 -> 이스터에그 발동
        if (pauseTrapTimer && (now - pauseClickedTime <= 1000)) {
            // 실패 화면으로 가는 함정 타이머 정지
            clearTimeout(pauseTrapTimer);
            pauseTrapTimer = null;
            isEasterEggActive = true;

            const easterEggScreen = document.getElementById('easter-egg-screen');
            easterEggScreen.classList.remove('hidden');

            // 텍스트를 글자 단위로 쪼개기 (파사삭 애니메이션 준비)
            const eggTextContainer = easterEggScreen.querySelector('p');
            const originalText = "지금, 무엇을 끝내고 싶었나요?";
            eggTextContainer.innerHTML = '';

            for (let char of originalText) {
                let span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char; // 공백 유지
                eggTextContainer.appendChild(span);
            }

            // 1초 유지 후 글자 흩어지는 애니메이션 시작
            setTimeout(() => {
                const spans = eggTextContainer.querySelectorAll('span');
                spans.forEach(span => {
                    const tx = (Math.random() - 0.5) * 80; // X축 무작위 이동
                    const ty = (Math.random() - 0.5) * 80; // Y축 무작위 이동
                    const rot = (Math.random() - 0.5) * 180; // 무작위 회전

                    span.style.setProperty('--tx', `${tx}px`);
                    span.style.setProperty('--ty', `${ty}px`);
                    span.style.setProperty('--rot', `${rot}deg`);
                    span.style.animation = `easterEggShatter 0.9s forwards ease-out`;
                });
            }, 1000);

            // 전체 2.5초 후 이스터에그 종료 및 복귀
            setTimeout(() => {
                easterEggScreen.classList.add('hidden');
                eggTextContainer.innerHTML = originalText; // DOM 원상 복구
                isEasterEggActive = false;

                // 일시정지 버튼 파괴 효과도 슬그머니 복구
                pauseBtn.classList.remove('shatter-effect');
            }, 2500);

            return; // 일반 종료 로직이 실행되지 않도록 리턴
        }

        // 일반적인 종료 버튼 처리 (이스터에그 조건 미달 시)
        gameOver("게임이 종료되었습니다.", true, "power_button");
    });

    // 3. 다시 시작 버튼 이벤트 바인딩
    restartBtn.addEventListener('click', resetGame);
    if (trueEndingRestartBtn) {
        trueEndingRestartBtn.addEventListener('click', resetGame);
    }

    // --- 초반 테스트용 대기 문구 (12초) ---
    function showInputWaitingText() {
        if (isGameOver) return;

        let el = document.createElement('div');
        el.className = 'ambient-text';
        el.textContent = '사용자 응답 대기중...';

        // 화면 왼쪽 하단에 시스템 문구처럼 작고 흐리게 배치
        el.style.position = 'fixed';
        el.style.bottom = '20px';
        el.style.left = '20px';
        el.style.color = '#aaaaaa';
        el.style.fontSize = '0.75rem';
        el.style.fontFamily = 'monospace';
        el.style.letterSpacing = '0.05em';
        el.style.opacity = '0';
        el.style.transition = 'opacity 1.5s ease-in-out';
        el.style.cursor = 'default';
        el.style.pointerEvents = 'none'; // 클릭을 아예 무시 (실패 처리 안 됨)
        el.style.zIndex = '50';

        document.body.appendChild(el);

        // 부드럽게 나타남
        setTimeout(() => {
            if (!isGameOver) el.style.opacity = '0.6';
        }, 100);

        // 3.5초 정도 보인 뒤 다시 부드럽게 사라짐
        setTimeout(() => {
            if (document.body.contains(el)) {
                el.style.opacity = '0';
                // 투명해진 뒤 DOM에서 완전 제거
                setTimeout(() => {
                    if (document.body.contains(el)) el.remove();
                }, 1500);
            }
        }, 3600);
    }

    // --- 초반 방해물 (5초 첫 점, 10초 일반 방해물) ---
    function showFirstDotObstacle() {
        if (isGameOver) return;

        let dot = document.createElement('div');
        dot.className = 'obstacle first-dot';

        // 정중앙에서 살짝 어긋난 랜덤 위치 (-30px ~ +30px)
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;

        dot.style.left = `calc(50% + ${offsetX}px)`;
        dot.style.top = `calc(50% + ${offsetY}px)`;
        dot.style.width = '5px'; // 기존의 작은 점(tiny-dot) 크기로 복구
        dot.style.height = '5px';
        dot.style.backgroundColor = ['#222', '#333'][Math.floor(Math.random() * 2)];
        dot.style.borderRadius = '50%';
        dot.style.opacity = '0';
        dot.style.transition = 'opacity 3s ease-in'; // 서서히 나타남
        dot.style.zIndex = '1';

        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isEasterEggActive) gameOver(null, false, "first_dot");
        });

        document.body.appendChild(dot);

        // 약간의 딜레이 후 opacity 변경 (페이드인 실행)
        setTimeout(() => {
            if (!isGameOver) dot.style.opacity = '1';
        }, 100);
    }

    function startSpawningObstacles() {
        if (isGameOver) return;
        function spawn() {
            if (isGameOver) return;
            createRandomObstacle();
            const delay = Math.random() * (EARLY_SPAWN_MAX_INTERVAL - EARLY_SPAWN_MIN_INTERVAL) + EARLY_SPAWN_MIN_INTERVAL;
            spawnTimer = setTimeout(spawn, delay);
        }
        spawn();
    }

    function createRandomObstacle() {
        const types = ['dot', 'tiny-dot', 'btn', 'text'];
        const selectedType = types[Math.floor(Math.random() * types.length)];
        let el;

        if (selectedType === 'dot') {
            el = document.createElement('div');
            el.className = 'obstacle obstacle-dot';
        } else if (selectedType === 'tiny-dot') {
            el = document.createElement('div');
            el.className = 'obstacle obstacle-tiny-dot';
        } else if (selectedType === 'btn') {
            el = document.createElement('button');
            el.className = 'obstacle obstacle-btn';
            const btnTexts = ['클릭', '확인', '취소', 'X'];
            el.textContent = btnTexts[Math.floor(Math.random() * btnTexts.length)];
        } else if (selectedType === 'text') {
            el = document.createElement('span');
            el.className = 'obstacle obstacle-text';
            const phrases = ['오류 발생?', '새로고침', '여기를 클릭', '무엇일까요?'];
            el.textContent = phrases[Math.floor(Math.random() * phrases.length)];
        }

        const x = Math.random() * (window.innerWidth - 100) + 50;
        const y = Math.random() * (window.innerHeight - 100) + 50;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        el.addEventListener('click', () => {
            // 이스터에그 도중에는 방해물을 잘못 눌러도 죽지 않게 쉴드
            if (!isEasterEggActive) gameOver(null, false, "random_obstacle");
        });
        document.body.appendChild(el);
    }

    // --- 중반부 방해물 (움직이는 방해물 추가) ---
    function startSpawningMidObstacles() {
        if (isGameOver) return;
        
        // 중반부로 넘어가면 역할이 끝난 첫 번째 점 방해물은 안전하게 제거
        const firstDots = document.querySelectorAll('.first-dot');
        firstDots.forEach(dot => dot.remove());

        function spawnMid() {
            if (isGameOver) return;
            createMidObstacle();
            midSpawnTimer = setTimeout(spawnMid, Math.random() * 3500 + 2500);
        }
        spawnMid();
    }

    function createMidObstacle() {
        const types = ['popup', 'alert', 'reward'];
        const selectedType = types[Math.floor(Math.random() * types.length)];
        let el = document.createElement('div');
        el.className = 'obstacle';

        if (selectedType === 'popup') {
            el.classList.add('obstacle-popup');
            el.innerHTML = `
                <div class="popup-header"><span>알림</span><span>X</span></div>
                <div class="popup-body">새로운 메시지가 도착했습니다.<br>확인하시겠습니까?</div>
            `;
        } else if (selectedType === 'alert') {
            el.classList.add('obstacle-alert');
            el.innerHTML = `<strong>경고:</strong> 시스템 성능이 저하되었습니다. 최적화를 위해 클릭하세요.`;
        } else if (selectedType === 'reward') {
            el = document.createElement('button');
            el.className = 'obstacle obstacle-reward';
            el.textContent = '🎁 무료 보상 받기';
        }

        const safeWidth = window.innerWidth > 500 ? window.innerWidth - 500 : 0;
        const safeHeight = window.innerHeight > 300 ? window.innerHeight - 300 : 0;
        const x = Math.random() * safeWidth;
        const y = Math.random() * safeHeight;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        el.addEventListener('click', () => {
            if (!isEasterEggActive) gameOver(null, false, "mid_obstacle");
        });
        document.body.appendChild(el);
    }

    // --- 2분 40초(160초) 가짜 오류창 강제 발생 ---
    function triggerFakeErrorEvent() {
        if (isGameOver) return;

        // 에러창 등장 시 기존의 모든 방해물 즉시 제거
        const existingObstacles = document.querySelectorAll('.obstacle');
        existingObstacles.forEach(obs => obs.remove());

        // 진짜 에러처럼 보이도록 상단 아이콘 숨김
        document.getElementById('top-icons').classList.add('hidden');

        let el = document.createElement('div');
        el.className = 'obstacle obstacle-error';
        el.innerHTML = `
            <h2>404 ERROR</h2>
            <p>페이지를 찾을 수 없습니다.<br>연결이 끊어졌거나 일시적인 오류가 발생했습니다.<br>다시 시도하려면 클릭하세요.</p>
            <button>새로고침</button>
        `;

        el.addEventListener('click', () => {
            if (!isEasterEggActive) gameOver(null, false, "fake_error");
        });
        document.body.appendChild(el);
    }

    // --- 3분(180초) 가짜 엔딩 및 후반 방해물 시작 ---
    function triggerThreeMinuteEvent() {
        if (isGameOver) return;

        clearTimeout(spawnTimer);
        clearTimeout(midSpawnTimer);

        const obstacles = document.querySelectorAll('.obstacle');
        obstacles.forEach(obs => obs.remove());

        // 숨겼던 상단 아이콘 원상 복구
        document.getElementById('top-icons').classList.remove('hidden');

        const fakeEndingScreen = document.getElementById('fake-ending-screen');
        fakeEndingScreen.classList.remove('hidden');

        // 원래 텍스트 복구 (다시 시작 시 대비)
        const h1El = fakeEndingScreen.querySelector('h1');
        const pEls = fakeEndingScreen.querySelectorAll('p');
        h1El.innerHTML = 'CLEAR';
        pEls[0].innerHTML = '게임의 규칙을 이해했습니다.';
        pEls[1].innerHTML = '결과를 확인하시겠습니까?';

        // --- 데이터 손상 글리치 (가짜 엔딩 화면 적용) ---
        const line1Chars = 'CLEAR'.split('');
        const line2Chars = '게임의 규칙을 이해했습니다.'.split('');
        const line3Chars = '결과를 확인하시겠습니까?'.split('');

        const glitchChars = [
            '\uFFFD', '\uFFFD', '\uFFFD', '\uFFFD', '\uFFFD', '\uFFFD', '\uFFFD', '\uFFFD', '\uFFFD', '\uFFFD', //  문자 빈도 더욱 증가
            '□', '▒', '░', '?', '#', '_', '0', '1',
            'Ã', 'Â', 'ê', 'ë', 'ø', 'æ', 'ð', 'ñ', 'þ', 'µ', '¥', '¤', '¬',
            'ㅁ', 'ㄴ', 'ㅏ', 'ㅣ', 'ㅇ', 'ㄱ',
            '뜫', '뚅', '씠', '꺏', '껅', '쓺', '읅', '끫', '뛣', '쐓',
            '쯫', '쀫', '홁', '꿁', '뮻', '얅', '쓔', '휑', '쫣', '궭'
        ];

        const corrupted1 = new Map();
        const corrupted2 = new Map();
        const corrupted3 = new Map();

        function getRandomGlitchChar() {
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }

        function renderCorrupted() {
            if (isGameOver || fakeEndingScreen.classList.contains('hidden')) return;
            const r1 = line1Chars.map((ch, i) => corrupted1.has(i) ? corrupted1.get(i) : ch).join('');
            const r2 = line2Chars.map((ch, i) => corrupted2.has(i) ? corrupted2.get(i) : ch).join('');
            const r3 = line3Chars.map((ch, i) => corrupted3.has(i) ? corrupted3.get(i) : ch).join('');
            h1El.innerHTML = r1;
            pEls[0].innerHTML = r2;
            pEls[1].innerHTML = r3;
        }

        function pickStart(chars, corruptedMap) {
            let idx = Math.floor(Math.random() * chars.length);
            let tries = 0;
            while ((chars[idx] === ' ' || corruptedMap.has(idx)) && tries < 30) {
                idx = Math.floor(Math.random() * chars.length);
                tries++;
            }
            return idx;
        }

        function spreadOnce(corruptedMap, chars) {
            const frontier = Array.from(corruptedMap.keys());
            frontier.forEach(idx => {
                let left = idx - 1;
                while (left >= 0 && chars[left] === ' ') left--;
                if (left >= 0 && !corruptedMap.has(left) && Math.random() < 0.3) {
                    corruptedMap.set(left, getRandomGlitchChar());
                }
                
                let right = idx + 1;
                while (right < chars.length && chars[right] === ' ') right++;
                if (right < chars.length && !corruptedMap.has(right) && Math.random() < 0.3) {
                    corruptedMap.set(right, getRandomGlitchChar());
                }
            });

            if (Math.random() < 0.15) {
                let uncorrupted = [];
                chars.forEach((ch, i) => {
                    if (ch !== ' ' && !corruptedMap.has(i)) uncorrupted.push(i);
                });
                if (uncorrupted.length > 0) {
                    let randIdx = uncorrupted[Math.floor(Math.random() * uncorrupted.length)];
                    corruptedMap.set(randIdx, getRandomGlitchChar());
                }
            }
        }

        function startCorruption() {
            if (isGameOver || fakeEndingScreen.classList.contains('hidden')) return;

            corrupted1.set(pickStart(line1Chars, corrupted1), getRandomGlitchChar());
            
            setTimeout(() => {
                if (isGameOver || fakeEndingScreen.classList.contains('hidden')) return;
                corrupted2.set(pickStart(line2Chars, corrupted2), getRandomGlitchChar());
            }, 600);

            setTimeout(() => {
                if (isGameOver || fakeEndingScreen.classList.contains('hidden')) return;
                corrupted3.set(pickStart(line3Chars, corrupted3), getRandomGlitchChar());
            }, 1200);

            renderCorrupted();

            const target1 = Math.floor(line1Chars.filter(c => c !== ' ').length * 0.85);
            const target2 = Math.floor(line2Chars.filter(c => c !== ' ').length * 0.85);
            const target3 = Math.floor(line3Chars.filter(c => c !== ' ').length * 0.85);

            const spreadInterval = setInterval(() => {
                if (isGameOver || fakeEndingScreen.classList.contains('hidden')) {
                    clearInterval(spreadInterval);
                    return;
                }

                spreadOnce(corrupted1, line1Chars);
                spreadOnce(corrupted2, line2Chars);
                spreadOnce(corrupted3, line3Chars);
                renderCorrupted();

                if (corrupted1.size >= target1 && corrupted2.size >= target2 && corrupted3.size >= target3) {
                    clearInterval(spreadInterval);
                }
            }, 300);
        }

        // 가짜 엔딩(CLEAR) 화면이 뜬 후 15초간 정적 유지 (완전 끝난 것처럼 연출)
        setTimeout(() => {
            if (!isGameOver) {
                startSpawningLateObstacles();
                anxietyActive = true;
                updateAnxietyEffect();

                // 후반 방해물이 다시 나오기 시작한 직후(0.7초 뒤) 가짜 엔딩 글자 깨짐 효과 시작
                setTimeout(() => {
                    if (!isGameOver) {
                        startCorruption();
                    }
                }, 700);
            }
        }, 15000);
    }

    const fakeEndingBtn = document.getElementById('fake-ending-btn');
    fakeEndingBtn.addEventListener('click', () => {
        if (!isEasterEggActive) gameOver("끝났다고 믿은 순간, 게임은 끝났습니다.", false, "fake_ending");
    });

    // --- 후반 방해물 (180초~) ---
    function startSpawningLateObstacles() {
        if (isGameOver) return;
        function spawnLate() {
            if (isGameOver) return;
            createLateObstacle();
            lateSpawnTimer = setTimeout(spawnLate, Math.random() * 2500 + 2000);
        }
        spawnLate();
    }

    function createLateObstacle() {
        const types = ['ad', 'blink', 'multi-popup', 'sound'];
        const selectedType = types[Math.floor(Math.random() * types.length)];

        const safeWidth = window.innerWidth > 400 ? window.innerWidth - 350 : 0;
        const safeHeight = window.innerHeight > 300 ? window.innerHeight - 300 : 0;
        const x = Math.random() * safeWidth;
        const y = Math.random() * safeHeight;

        if (selectedType === 'multi-popup') {
            const count = Math.floor(Math.random() * 3) + 3;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    if (isGameOver) return;
                    let popup = document.createElement('div');
                    popup.className = 'obstacle obstacle-popup obstacle-late';
                    popup.innerHTML = `
                        <div class="popup-header"><span>경고창 ${i + 1}</span><span>X</span></div>
                        <div class="popup-body">심각한 시스템 오류가 감지되었습니다!</div>
                    `;
                    popup.style.left = `${x + (i * 25)}px`;
                    popup.style.top = `${y + (i * 25)}px`;
                    popup.addEventListener('click', () => {
                        if (!isEasterEggActive) gameOver(null, false, "multi_popup");
                    });
                    document.body.appendChild(popup);
                }, i * 250);
            }
            return;
        }

        let el = document.createElement('div');
        el.className = 'obstacle obstacle-late';

        if (selectedType === 'ad') {
            el.classList.add('obstacle-ad');
            el.innerHTML = `
                <div class="ad-header"><span>광고</span><span>X</span></div>
                <div class="ad-body">
                    <h3>🎉 축하합니다! 🎉</h3>
                    <p>1,000,000번째 방문자입니다!</p>
                    <button>상품 확인</button>
                </div>
            `;
        }
        else if (selectedType === 'blink') {
            el = document.createElement('button');
            el.className = 'obstacle obstacle-late obstacle-blink';
            el.textContent = '절대 누르지 마시오!';
        }
        else if (selectedType === 'sound') {
            el.classList.add('obstacle-sound-alert');
            el.textContent = '비정상적인 접근이 시도되었습니다.';
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
            } catch (e) { }
        }

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        el.addEventListener('click', () => {
            if (!isEasterEggActive) gameOver(null, false, "late_obstacle");
        });
        document.body.appendChild(el);
    }

    // --- 후반부 보상 룰렛 시스템 창 ---
    function showRewardRoulette() {
        if (isGameOver) return;

        let popup = document.createElement('div');
        // 기존 장애물 제거 로직(gameOver)에 의해 자동 관리되도록 'obstacle' 클래스 추가
        popup.className = 'obstacle obstacle-roulette roulette-popup';

        popup.innerHTML = `
            <div class="roulette-header">
                <span>보상 룰렛</span>
                <span class="close-btn">X</span>
            </div>
            <div class="roulette-body">
                <div class="roulette-desc">하나의 보조 효과를 획득할 수 있습니다.</div>
                <div class="roulette-wheel-container">
                    <div class="roulette-pointer"></div>
                    <div class="roulette-wheel"></div>
                    <div class="roulette-labels">
                        <div class="roulette-label label-1">힌트 보기</div>
                        <div class="roulette-label label-2">방해물 제거</div>
                        <div class="roulette-label label-3">시간 단축</div>
                        <div class="roulette-label label-4">기록 보호</div>
                        <div class="roulette-label label-5">쉴드</div>
                        <div class="roulette-label label-6">보상 없음</div>
                    </div>
                    <div class="roulette-center">GO</div>
                </div>
                <button class="roulette-spin-btn">돌리기</button>
            </div>
        `;

        // 룰렛창 내부의 모든 클릭은 실패 처리 (obstacle 규칙 적용)
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isEasterEggActive) return;

            // 살짝 반응하는 효과
            const wheel = popup.querySelector('.roulette-wheel');
            wheel.style.transform = `rotate(${Math.random() * 360 + 360}deg)`;

            setTimeout(() => {
                gameOver("보상 요청이 감지되었습니다.<br>게임이 종료됩니다.", false, "reward_roulette");
            }, 300);
        });

        document.body.appendChild(popup);
        console.log("reward roulette shown as floating obstacle (Center)");
    }

    // --- 기록 저장 시스템 창 방해물 ---
    function showSavePrompt() {
        console.log("showSavePrompt called");
        if (isGameOver) return;

        let el = document.createElement('div');
        el.className = 'obstacle obstacle-save-prompt';
        el.innerHTML = `
            <div class="save-header">
                <span class="save-header-left">
                    <svg class="save-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 1L15 14H1L8 1Z" fill="none" stroke="#ff9900" stroke-width="1.4"/>
                        <line x1="8" y1="6" x2="8" y2="10" stroke="#ff9900" stroke-width="1.4" stroke-linecap="round"/>
                        <circle cx="8" cy="12" r="0.7" fill="#ff9900"/>
                    </svg>
                    <span class="save-title">기록 동기화 실패</span>
                </span>
                <span class="save-close">✕</span>
            </div>
            <div class="save-separator"></div>
            <div class="save-body">
                <p class="save-desc">현재 기록이 서버에 저장되지 않았습니다.<br><br>저장을 다시 시도하시겠습니까?</p>
                <div class="save-btn-container">
                    <button class="save-btn">다시 시도</button>
                </div>
            </div>
        `;

        el.style.position = 'fixed';
        el.style.right = '30px';
        el.style.bottom = '30px';
        el.style.left = 'auto';
        el.style.top = 'auto';
        el.style.transform = 'none';

        el.addEventListener('click', () => {
            if (!isEasterEggActive) {
                gameOver("<p>기록을 남기려는 순간, 기록이 멈췄습니다.</p><p>게임이 종료됩니다.</p>", false, "save_attempt");
            }
        });

        document.body.appendChild(el);
        console.log("save prompt shown without glitch");
    }

    // --- 5분(300초) 진 엔딩 로직 ---
    function triggerFiveMinuteEvent() {
        if (isGameOver) return;
        isGameOver = true;

        anxietyActive = false;
        document.body.style.backgroundColor = '';
        document.body.style.boxShadow = '';
        document.body.style.transform = '';

        clearInterval(timerInterval);
        clearTimeout(spawnTimer);
        clearTimeout(midSpawnTimer);
        clearTimeout(lateSpawnTimer);

        const obstacles = document.querySelectorAll('.obstacle');
        obstacles.forEach(obs => obs.remove());

        const fakeEndingScreen = document.getElementById('fake-ending-screen');
        if (fakeEndingScreen) {
            fakeEndingScreen.classList.add('hidden');
        }

        document.getElementById('top-icons').classList.add('hidden');

        document.body.classList.add('true-ending');

        const trueEndingScreen = document.getElementById('true-ending-screen');
        trueEndingScreen.classList.remove('hidden');

        // --- 진짜 엔딩 소름 돋는 타이핑 연출 ---
        const h1_404 = document.getElementById('true-ending-404');
        const textContainer = document.getElementById('true-ending-texts');
        textContainer.innerHTML = '';

        // 404 페이드 인 & 아웃 애니메이션 실행
        h1_404.style.animation = 'fadeInOut404 5s forwards';

        // 5초 뒤 404 텍스트 숨기고 타이핑 효과 시작
        typeWriterTimer = setTimeout(() => {
            h1_404.style.display = 'none';
            textContainer.classList.remove('hidden');

            const lines = [
                "당신의 클릭을 찾을 수 없습니다.",
                "눌러야 할 것은 없었습니다.",
                "기다리는 동안, 당신은 게임의 답을 찾았습니다.",
                "게임이 종료됩니다."
            ];

            let lineIndex = 0;
            let charIndex = 0;
            let currentP = null;

            function typeWriter() {
                if (lineIndex < lines.length) {
                    if (charIndex === 0) {
                        currentP = document.createElement('p');
                        if (lineIndex === lines.length - 1) {
                            currentP.style.marginTop = '40px';
                            currentP.style.color = '#ffffff';
                        }
                        textContainer.appendChild(currentP);
                    }

                    if (charIndex < lines[lineIndex].length) {
                        currentP.innerHTML += lines[lineIndex].charAt(charIndex);
                        charIndex++;
                        // 타이핑 속도를 불규칙하게 하여 기계적이거나 섬뜩한 느낌 연출
                        let delay = Math.random() * 100 + 50;
                        typeWriterTimer = setTimeout(typeWriter, delay);
                    } else {
                        lineIndex++;
                        charIndex = 0;
                        // 한 줄이 끝나고 다음 줄이 나오기까지의 숨막히는 정적
                        typeWriterTimer = setTimeout(typeWriter, 1200);
                    }
                } else {
                    // 타이핑이 모두 끝난 뒤 '다시 시작' 버튼 노출
                    if (document.getElementById('true-ending-restart-btn')) {
                        document.getElementById('true-ending-restart-btn').classList.remove('hidden');
                    }
                }
            }
            typeWriter();

        }, 5000);
    }

    // --- 게임 실패(오버) 및 종료 로직 ---
    function gameOver(customMsg = null, isPowerQuit = false, endType = 'normal') {
        if (isGameOver) return;
        isGameOver = true;

        // Supabase 등 나중에 기록 저장을 위해 endType 값을 활용할 수 있도록 출력
        console.log("Game Over Event:", { playTime, isPowerQuit, endType });
         anxietyActive = false;
        document.body.style.backgroundColor = '';
        document.body.style.boxShadow = '';
        document.body.style.transform = '';

        clearInterval(timerInterval);
        clearTimeout(spawnTimer);
        clearTimeout(midSpawnTimer);
        clearTimeout(lateSpawnTimer);

        document.body.classList.add('game-over');

        const fakeEndingScreen = document.getElementById('fake-ending-screen');
        if (fakeEndingScreen) {
            fakeEndingScreen.classList.add('hidden');
        }

        document.getElementById('top-icons').classList.add('hidden');

        const obstacles = document.querySelectorAll('.obstacle');
        obstacles.forEach(obs => obs.classList.add('hidden'));

        const ambients = document.querySelectorAll('.ambient-text');
        ambients.forEach(el => el.classList.add('hidden'));

        const gameOverScreen = document.getElementById('game-over-screen');
        const msgEl = document.getElementById('game-over-msg');
        const recordTimeSpan = document.getElementById('record-time');
        const recordContainer = document.getElementById('game-over-record-container');
        const footerEl = document.getElementById('game-over-footer');
        const restartBtn = document.getElementById('restart-btn');

        if (!customMsg) {
            if (playTime < 60) {
                customMsg = "게임이 종료됩니다.";
            } else if (playTime < 180) {
                customMsg = "방금의 선택으로 게임은 끝났습니다.";
            } else {
                customMsg = "아무것도 하지 않는 데 실패했습니다.";
            }
        }

        msgEl.innerHTML = customMsg;

        // 어떤 실패/종료든 항상 다시 시작 버튼 표시
        restartBtn.classList.remove('hidden');

        if (isPowerQuit) {
            recordContainer.classList.add('hidden');
            footerEl.classList.add('hidden');
        } else {
            recordTimeSpan.textContent = playTime;
            recordContainer.classList.remove('hidden');

            if (customMsg === "아무것도 하지 않는 데 실패했습니다.") {
                footerEl.classList.remove('hidden');
            } else {
                footerEl.classList.add('hidden');
            }
        }

        gameOverScreen.classList.remove('hidden');
    }
});
