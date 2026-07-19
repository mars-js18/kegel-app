// Data Models & Constants
const L_STORAGE_KEY = 'kgl_dual_data';

const defaultConfig = {
    currentLevel: 1,
    consecutiveDays: 0,
    hasSeenWarning: false,
    hasCalibrated: false,
    lastWorkoutDate: null,
    morningCompleted: false,
    nightCompleted: false,
    rkCount: 0
};

// Level Parameters defined in architecture
const levelParams = {
    1: { blockASets: 3, blockAReps: 10, blockATimeContract: 1, blockATimeRelax: 2, 
         blockBSets: 3, blockBReps: 5, blockBTimeContract: 5, blockBTimeRelax: 10, restTime: 60 },
    2: { blockASets: 3, blockAReps: 15, blockATimeContract: 1, blockATimeRelax: 2, 
         blockBSets: 3, blockBReps: 5, blockBTimeContract: 7, blockBTimeRelax: 15, restTime: 60 },
    3: { blockASets: 3, blockAReps: 15, blockATimeContract: 1, blockATimeRelax: 2, 
         blockBSets: 3, blockBReps: 5, blockBTimeContract: 10, blockBTimeRelax: 20, restTime: 60 }
};

let appData = { ...defaultConfig };
let currentSessionType = null; // 'morning' or 'night'

// DOM Elements
const views = {
    splash: document.getElementById('splash-screen'),
    warning: document.getElementById('warning-screen'),
    calibration: document.getElementById('calibration-screen'),
    home: document.getElementById('home-screen'),
    training: document.getElementById('training-screen'),
    rest: document.getElementById('rest-screen'),
    validation: document.getElementById('validation-screen')
};

// Initialization
function init() {
    loadData();
    checkDailyReset();
    
    // Simulate Splash Screen
    setTimeout(() => {
        if (!appData.hasSeenWarning) {
            showView('warning');
        } else if (!appData.hasCalibrated) {
            showView('calibration');
        } else {
            updateHomeUI();
            showView('home');
        }
    }, 1500);

    setupEventListeners();
}

function loadData() {
    const data = localStorage.getItem(L_STORAGE_KEY);
    if (data) appData = JSON.parse(data);
}

function saveData() {
    localStorage.setItem(L_STORAGE_KEY, JSON.stringify(appData));
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function checkDailyReset() {
    const today = getTodayStr();
    if (appData.lastWorkoutDate !== today) {
        // Did they miss a day?
        if (appData.lastWorkoutDate) {
            let lastDate = new Date(appData.lastWorkoutDate);
            let todayDate = new Date(today);
            let diffTime = Math.abs(todayDate - lastDate);
            let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays > 1 && (appData.morningCompleted || appData.nightCompleted)) {
                // Missed a day entirely
                appData.consecutiveDays = 0;
            } else if (diffDays === 1 && (!appData.morningCompleted || !appData.nightCompleted)) {
                // Didn't complete both sessions yesterday
                appData.consecutiveDays = 0;
            }
        }
        
        // Reset daily progress
        appData.morningCompleted = false;
        appData.nightCompleted = false;
        appData.rkCount = 0;
        appData.lastWorkoutDate = today;
        saveData();
    }
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewId].classList.add('active');
}

// Event Listeners
function setupEventListeners() {
    // Warning Screen
    const warnCheck = document.getElementById('warning-checkbox');
    const btnWarn = document.getElementById('btn-warning-accept');
    warnCheck.addEventListener('change', (e) => {
        btnWarn.disabled = !e.target.checked;
        if(e.target.checked) btnWarn.classList.remove('disabled');
        else btnWarn.classList.add('disabled');
    });
    btnWarn.addEventListener('click', () => {
        appData.hasSeenWarning = true;
        saveData();
        showView('calibration');
    });

    // Calibration Screen
    const calib1 = document.getElementById('calib-1');
    const calib2 = document.getElementById('calib-2');
    const btnCalib = document.getElementById('btn-calibration-accept');
    const checkCalib = () => {
        const checked = calib1.checked && calib2.checked;
        btnCalib.disabled = !checked;
        if(checked) btnCalib.classList.remove('disabled');
        else btnCalib.classList.add('disabled');
    };
    calib1.addEventListener('change', checkCalib);
    calib2.addEventListener('change', checkCalib);
    btnCalib.addEventListener('click', () => {
        appData.hasCalibrated = true;
        saveData();
        updateHomeUI();
        showView('home');
    });

    // Home Screen
    document.getElementById('btn-start-morning').addEventListener('click', () => startSession('morning'));
    document.getElementById('btn-start-night').addEventListener('click', () => startSession('night'));
    document.getElementById('btn-log-rk').addEventListener('click', () => {
        if(appData.rkCount < 10) {
            appData.rkCount++;
            saveData();
            updateHomeUI();
        }
    });

    // Validation Screen
    const valMuscles = document.getElementById('val-muscles');
    const valBreath = document.getElementById('val-breath');
    const valRelax = document.getElementById('val-relax');
    const btnVal = document.getElementById('btn-validation-submit');
    
    btnVal.addEventListener('click', () => {
        if (valMuscles.checked && valBreath.checked && valRelax.checked) {
            // Perfect session
            if (currentSessionType === 'morning') appData.morningCompleted = true;
            if (currentSessionType === 'night') appData.nightCompleted = true;
            
            // Check if both completed today
            if (appData.morningCompleted && appData.nightCompleted) {
                appData.consecutiveDays++;
                if (appData.consecutiveDays >= 14) {
                    appData.consecutiveDays = 0;
                    if (appData.currentLevel < 3) appData.currentLevel++;
                    alert('¡Felicidades! Has avanzado al Nivel ' + appData.currentLevel);
                }
            }
        } else {
            // Failed rules
            alert('Has fallado en la técnica. Por tu seguridad, la racha de 14 días se reiniciará para evitar lesiones.');
            appData.consecutiveDays = 0;
        }
        
        // Reset checkboxes
        valMuscles.checked = false; valBreath.checked = false; valRelax.checked = false;
        
        saveData();
        updateHomeUI();
        showView('home');
    });

    // Training Abort
    document.getElementById('btn-abort-training').addEventListener('click', () => {
        clearAllIntervals();
        showView('home');
    });
}

function updateHomeUI() {
    document.getElementById('current-level').innerText = appData.currentLevel;
    document.getElementById('next-level').innerText = appData.currentLevel < 3 ? appData.currentLevel + 1 : 3;
    document.getElementById('streak-days').innerText = appData.consecutiveDays;
    
    let streakPercent = (appData.consecutiveDays / 14) * 100;
    document.getElementById('streak-fill').style.width = streakPercent + '%';

    // Update buttons
    const btnM = document.getElementById('btn-start-morning');
    const statM = document.getElementById('status-morning');
    if (appData.morningCompleted) {
        btnM.disabled = true; btnM.innerText = 'Completado';
        statM.className = 'status-badge completed'; statM.innerText = 'Completado';
    } else {
        btnM.disabled = false; btnM.innerText = 'Iniciar';
        statM.className = 'status-badge pending'; statM.innerText = 'Pendiente';
    }

    const btnN = document.getElementById('btn-start-night');
    const statN = document.getElementById('status-night');
    if (appData.nightCompleted) {
        btnN.disabled = true; btnN.innerText = 'Completado';
        statN.className = 'status-badge completed'; statN.innerText = 'Completado';
    } else {
        btnN.disabled = false; btnN.innerText = 'Iniciar';
        statN.className = 'status-badge pending'; statN.innerText = 'Pendiente';
    }

    document.getElementById('rk-count').innerText = appData.rkCount;
}

// Timer Logic Variables
let timerInterval;
let currentBlock = 'A'; // A or B
let currentSet = 1;
let currentRep = 1;
let isContracting = true;
let timeLeft = 0;
let p = null; // level parameters

function startSession(type) {
    currentSessionType = type;
    p = levelParams[appData.currentLevel];
    currentBlock = 'A';
    currentSet = 1;
    currentRep = 1;
    
    // Posture Reminder Update
    const subtitle = document.getElementById('training-subtitle');
    subtitle.innerText = appData.currentLevel === 3 ? "Postura: De pie (Lucha contra gravedad)" : "Postura: Acostado boca arriba";
    
    startBlockA();
}

function clearAllIntervals() {
    if(timerInterval) clearInterval(timerInterval);
}

function updateTrainingUI() {
    document.getElementById('current-set').innerText = currentSet;
    document.getElementById('current-rep').innerText = currentRep;
    const isBlockA = currentBlock === 'A';
    document.getElementById('total-reps').innerText = isBlockA ? p.blockAReps : p.blockBReps;
    document.getElementById('training-title').innerText = isBlockA ? 'Bloque A: Fuerza' : 'Bloque B: Resistencia';
    
    const breathAlert = document.getElementById('breath-alert');
    if(!isBlockA && isContracting) {
        breathAlert.classList.remove('hidden');
    } else {
        breathAlert.classList.add('hidden');
    }
}

function startBlockA() {
    showView('training');
    isContracting = true;
    timeLeft = p.blockATimeContract;
    updateTrainingUI();
    runTimerCycle(p.blockATimeContract, p.blockATimeRelax, p.blockAReps, p.blockASets, handleEndOfBlockA);
}

function startBlockB() {
    showView('training');
    isContracting = true;
    timeLeft = p.blockBTimeContract;
    updateTrainingUI();
    runTimerCycle(p.blockBTimeContract, p.blockBTimeRelax, p.blockBReps, p.blockBSets, handleEndOfBlockB);
}

function runTimerCycle(contractT, relaxT, maxReps, maxSets, onBlockComplete) {
    const ring = document.getElementById('timer-ring');
    const tText = document.getElementById('timer-text');
    const tSub = document.getElementById('timer-subtext');
    
    const updateRing = () => {
        tText.innerText = timeLeft;
        if(isContracting) {
            ring.className = 'timer-ring contract';
            tSub.innerText = 'CONTRAE (100%)';
            if (currentBlock === 'B') tSub.innerText = 'CONTRAE SUAVE (60%)';
        } else {
            ring.className = 'timer-ring relax';
            tSub.innerText = 'RELAJA (DROP)';
        }
        updateTrainingUI();
    };

    updateRing();

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            if (isContracting) {
                // Switch to Relax
                isContracting = false;
                timeLeft = relaxT;
            } else {
                // Rep completed
                currentRep++;
                if (currentRep > maxReps) {
                    // Set completed
                    clearInterval(timerInterval);
                    if (currentSet >= maxSets) {
                        // Block completed
                        onBlockComplete();
                    } else {
                        // Go to Rest Screen before next set
                        startRest(() => {
                            currentSet++;
                            currentRep = 1;
                            isContracting = true;
                            timeLeft = contractT;
                            showView('training');
                            runTimerCycle(contractT, relaxT, maxReps, maxSets, onBlockComplete);
                        });
                    }
                    return;
                } else {
                    // Next Rep
                    isContracting = true;
                    timeLeft = contractT;
                }
            }
        }
        updateRing();
    }, 1000);
}

function startRest(onComplete) {
    showView('rest');
    let restTimeLeft = p.restTime;
    const restText = document.getElementById('rest-timer-text');
    restText.innerText = restTimeLeft;
    
    timerInterval = setInterval(() => {
        restTimeLeft--;
        restText.innerText = restTimeLeft;
        if(restTimeLeft <= 0) {
            clearInterval(timerInterval);
            onComplete();
        }
    }, 1000);
}

function handleEndOfBlockA() {
    currentBlock = 'B';
    currentSet = 1;
    currentRep = 1;
    startRest(() => {
        startBlockB();
    });
}

function handleEndOfBlockB() {
    showView('validation');
}

// Bootstrap
window.onload = init;
