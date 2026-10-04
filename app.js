/* ==========================================================================
   CONTROL PÉLVICO PWA - LÓGICA PRINCIPAL (APP.JS)
   ========================================================================== */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. CONFIGURACIÓN DE FASES DEL PROGRAMA (PFMT & KEGEL INVERSO)
  // --------------------------------------------------------------------------
  const PHASES_CONFIG = {
    1: {
      name: "Fase 1: Activación y Consciencia",
      weeks: "Semanas 1 a 4",
      daysPerWeek: "4 días / semana",
      scheduleSuggestion: "Días alternos (ej: Lun, Mié, Vie, Dom). 1 día de descanso intermedio.",
      description: "50% fuerza de tensión | Aislamiento y relajación profunda.",
      type: "standard",
      tensionTime: 5,
      relaxTime: 10,
      repsPerSet: 10,
      totalSets: 3,
      restBetweenSets: 60,
      postureWarning: false,
      totalDurationFormatted: "9 min 30 s",
      activeDurationFormatted: "7 min 30 s",
      restDurationFormatted: "2 min 00 s"
    },
    2: {
      name: "Fase 2: Resistencia Veno-Oclusiva",
      weeks: "Semanas 5 a 8",
      daysPerWeek: "5 días / semana",
      scheduleSuggestion: "Lunes a Viernes. Descanso completo el fin de semana.",
      description: "70-80% fuerza de tensión | Fortalecimiento vascular y veno-oclusivo.",
      type: "standard",
      tensionTime: 10,
      relaxTime: 15,
      repsPerSet: 10,
      totalSets: 3,
      restBetweenSets: 90,
      postureWarning: false,
      totalDurationFormatted: "15 min 30 s",
      activeDurationFormatted: "12 min 30 s",
      restDurationFormatted: "3 min 00 s"
    },
    3: {
      name: "Fase 3: Potencia y Control Reflejo",
      weeks: "Semanas 9 a 12",
      daysPerWeek: "5 días / semana",
      scheduleSuggestion: "Lunes a Viernes. Estímulo constante para fibras rápidas y lentas.",
      description: "Bloque mixto: 10 Flicks (1s/1s) + 5 Contracciones sostenidas (10s/15s).",
      type: "mixed",
      quickFlicksCount: 10,
      quickTensionTime: 1,
      quickRelaxTime: 1,
      sustainedCount: 5,
      sustainedTensionTime: 10,
      sustainedRelaxTime: 15,
      totalSets: 3,
      restBetweenSets: 120,
      postureWarning: false,
      totalDurationFormatted: "11 min 15 s",
      activeDurationFormatted: "7 min 15 s",
      restDurationFormatted: "4 min 00 s"
    },
    4: {
      name: "Fase 4: Integración Posicional",
      weeks: "Semana 13 en adelante",
      daysPerWeek: "3 días / semana",
      scheduleSuggestion: "Fase de mantenimiento de por vida. Días alternos.",
      description: "Tensión Máxima en postura de pie o sentado en contra de la gravedad.",
      type: "standard",
      tensionTime: 10,
      relaxTime: 20,
      repsPerSet: 15,
      totalSets: 2,
      restBetweenSets: 120,
      postureWarning: true,
      totalDurationFormatted: "17 min 00 s",
      activeDurationFormatted: "15 min 00 s",
      restDurationFormatted: "2 min 00 s"
    }
  };

  // Circunferencia del círculo de progreso (r=120 -> 2 * PI * 120 ≈ 753.98)
  const CIRCLE_CIRCUMFERENCE = 753.98;

  // --------------------------------------------------------------------------
  // 2. ESTADO GLOBAL DE LA APLICACIÓN
  // --------------------------------------------------------------------------
  let currentPhaseId = 1;
  let timerState = "IDLE"; // IDLE, TENSION, RELAXATION, REST, PAUSED, COMPLETED
  let previousTimerState = null;
  let timerInterval = null;
  
  // Contadores de la rutina
  let currentSet = 1;
  let currentRep = 1;
  let timeRemaining = 0;
  let totalPhaseTime = 0;
  let mixedSubState = "QUICK"; // Para Fase 3: "QUICK" o "SUSTAINED"

  // Preferencias
  let isSoundEnabled = true;
  let isHapticEnabled = true;

  // Audio Context (Web Audio API)
  let audioCtx = null;

  // --------------------------------------------------------------------------
  // 3. REFERENCIAS AL DOM
  // --------------------------------------------------------------------------
  const DOM = {
    // Nav & Tabs
    navBtns: document.querySelectorAll('.nav-btn'),
    tabViews: document.querySelectorAll('.tab-view'),

    // Routine View Elements
    phaseSelect: document.getElementById('phase-select'),
    phaseInfo: document.getElementById('phase-info'),
    postureAlert: document.getElementById('posture-alert'),
    
    // Timer SVG & Text
    circleProgress: document.getElementById('timer-circle-progress'),
    stateBadge: document.getElementById('timer-state-badge'),
    countdown: document.getElementById('timer-countdown'),
    sublabel: document.getElementById('timer-sublabel'),
    repCounter: document.getElementById('rep-counter'),
    setCounter: document.getElementById('set-counter'),
    repSubtext: document.getElementById('rep-subtext'),
    setSubtext: document.getElementById('set-subtext'),

    // Controls
    btnStartPause: document.getElementById('btn-start-pause'),
    btnStartText: document.getElementById('btn-start-text'),
    btnReset: document.getElementById('btn-reset'),
    btnPrevRep: document.getElementById('btn-prev-rep'),
    btnNextRep: document.getElementById('btn-next-rep'),
    btnSkipRest: document.getElementById('btn-skip-rest'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),

    // Settings Header
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    iconSoundOn: document.getElementById('icon-sound-on'),
    iconSoundOff: document.getElementById('icon-sound-off'),
    btnHapticToggle: document.getElementById('btn-haptic-toggle'),

    // History & Stats
    statStreak: document.getElementById('stat-streak'),
    statTotal: document.getElementById('stat-total'),
    statMonth: document.getElementById('stat-month'),
    activityGrid: document.getElementById('activity-grid'),
    historyList: document.getElementById('history-list'),
    btnClearHistory: document.getElementById('btn-clear-history'),

    // Modal & Banner
    completionModal: document.getElementById('completion-modal'),
    modalStreakBadge: document.getElementById('modal-streak-badge'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    updateBanner: document.getElementById('update-banner'),
    updateBtn: document.getElementById('update-btn')
  };

  // --------------------------------------------------------------------------
  // 4. INICIALIZACIÓN
  // --------------------------------------------------------------------------
  function init() {
    loadSettings();
    setupEventListeners();
    updatePhaseUI();
    resetTimerState();
    loadAndRenderHistory();
    setupServiceWorkerLifecycle();
  }

  // --------------------------------------------------------------------------
  // 5. MANEJO DE WEB AUDIO API & VIBRACIÓN (SONIDO POTENTE Y CLARO)
  // --------------------------------------------------------------------------
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Master Gain para volumen elevado y seguro
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.9, now);

      if (type === 'tension') {
        // Doble pitido agudo, energético y potente con onda triangular (muy audible en móviles)
        const tones = [
          { freq: 880, start: 0, dur: 0.12 },
          { freq: 1175, start: 0.13, dur: 0.20 }
        ];

        tones.forEach(t => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(t.freq, now + t.start);
          gain.gain.setValueAtTime(0.85, now + t.start);
          gain.gain.exponentialRampToValueAtTime(0.01, now + t.start + t.dur);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + t.start);
          osc.stop(now + t.start + t.dur);
        });

      } else if (type === 'relax') {
        // Tono doble descendente suave pero con cuerpo (659Hz a 440Hz)
        const tones = [
          { freq: 659, start: 0, dur: 0.14 },
          { freq: 440, start: 0.15, dur: 0.28 }
        ];

        tones.forEach(t => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(t.freq, now + t.start);
          gain.gain.setValueAtTime(0.8, now + t.start);
          gain.gain.exponentialRampToValueAtTime(0.01, now + t.start + t.dur);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + t.start);
          osc.stop(now + t.start + t.dur);
        });

      } else if (type === 'rest') {
        // Tono rítmico de campana de descanso (587Hz - 587Hz - 784Hz)
        const tones = [
          { freq: 587, start: 0, dur: 0.12 },
          { freq: 587, start: 0.15, dur: 0.12 },
          { freq: 784, start: 0.30, dur: 0.35 }
        ];

        tones.forEach(t => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(t.freq, now + t.start);
          gain.gain.setValueAtTime(0.8, now + t.start);
          gain.gain.exponentialRampToValueAtTime(0.01, now + t.start + t.dur);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + t.start);
          osc.stop(now + t.start + t.dur);
        });

      } else if (type === 'complete') {
        // Fanfarria triunfal completa
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.85, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.35);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.35);
        });
      }
    } catch (e) {
      console.warn("Audio Context Error:", e);
    }
  }

  function triggerHaptic(pattern = [100]) {
    if (!isHapticEnabled) return;
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // --------------------------------------------------------------------------
  // 6. LÓGICA DE CONTROL DEL TEMPORIZADOR Y RUTINAS
  // --------------------------------------------------------------------------
  function updatePhaseUI() {
    const config = PHASES_CONFIG[currentPhaseId];
    DOM.phaseInfo.innerHTML = `
      <div class="phase-meta">
        <span class="freq-badge">${config.daysPerWeek}</span>
        <span class="duration-badge">⏱️ Duración: ${config.totalDurationFormatted}</span>
      </div>
      <div class="duration-detail">⚡ Ejercicio activo: ${config.activeDurationFormatted} | ☕ Descanso: ${config.restDurationFormatted}</div>
      <div class="schedule-tip">📅 <strong>Esquema:</strong> ${config.scheduleSuggestion}</div>
    `;

    if (config.postureWarning) {
      DOM.postureAlert.classList.remove('hidden');
    } else {
      DOM.postureAlert.classList.add('hidden');
    }

    resetTimerState();
  }

  function resetTimerState() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerState = "IDLE";
    previousTimerState = null;

    currentSet = 1;
    currentRep = 1;
    mixedSubState = "QUICK";

    const config = PHASES_CONFIG[currentPhaseId];
    timeRemaining = (config.type === "mixed") ? config.quickTensionTime : config.tensionTime;
    totalPhaseTime = timeRemaining;

    updateTimerDisplay("CONTRAE / KEGEL", "tension-mode", "badge-tension", getSublabelForCurrentState("TENSION"));
    updateCountersUI();
    setCircleProgress(1);

    DOM.btnStartText.textContent = "Iniciar Rutina";
    DOM.iconPlay.classList.remove('hidden');
    DOM.iconPause.classList.add('hidden');

    if (DOM.btnSkipRest) {
      DOM.btnSkipRest.classList.add('hidden');
    }
  }

  function getSublabelForCurrentState(state) {
    const config = PHASES_CONFIG[currentPhaseId];
    if (state === "TENSION") {
      if (config.type === "mixed") {
        return mixedSubState === "QUICK" ? "⚡ CONTRAE RÁPIDO (1s)" : "💪 CONTRAE Y SOSTÉN (10s)";
      }
      return currentPhaseId === 1 ? "💪 CONTRAE AL 50% DE FUERZA" : currentPhaseId === 2 ? "💪 CONTRAE AL 75-80% DE FUERZA" : "⚡ CONTRAE A MÁXIMA FUERZA (100%)";
    } else if (state === "RELAXATION") {
      return "🌿 RELAJA / KEGEL INVERSO (Expande el periné)";
    } else if (state === "REST") {
      return `☕ DESCANSO ENTRE SERIES (Próxima: Serie ${currentSet + 1})`;
    }
    return "";
  }

  function toggleStartPause() {
    getAudioContext();

    if (timerState === "IDLE" || timerState === "PAUSED") {
      startTimer();
    } else if (timerState === "TENSION" || timerState === "RELAXATION" || timerState === "REST") {
      pauseTimer();
    }
  }

  function startTimer() {
    if (timerState === "IDLE") {
      timerState = "TENSION";
      setupStateTransition("TENSION");
    } else if (timerState === "PAUSED") {
      timerState = previousTimerState || "TENSION";
    }

    DOM.btnStartText.textContent = "Pausar";
    DOM.iconPlay.classList.add('hidden');
    DOM.iconPause.classList.remove('hidden');

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(tick, 1000);
  }

  function pauseTimer() {
    previousTimerState = timerState;
    timerState = "PAUSED";
    clearInterval(timerInterval);
    timerInterval = null;

    DOM.btnStartText.textContent = "Reanudar";
    DOM.iconPlay.classList.remove('hidden');
    DOM.iconPause.classList.add('hidden');
    DOM.sublabel.textContent = "Pausado - Presiona Reanudar";
  }

  function tick() {
    timeRemaining--;

    if (timeRemaining < 0) {
      advanceRoutineState();
      return;
    }

    updateTimerUI();
  }

  // Avanza de forma automática de Tensión -> Relajación -> Siguiente Rep / Descanso / Fin
  function advanceRoutineState() {
    const config = PHASES_CONFIG[currentPhaseId];

    if (timerState === "TENSION") {
      // Pasa a la mitad de relajación de la repetición actual
      timerState = "RELAXATION";
      if (config.type === "mixed") {
        timeRemaining = (mixedSubState === "QUICK") ? config.quickRelaxTime : config.sustainedRelaxTime;
      } else {
        timeRemaining = config.relaxTime;
      }
      totalPhaseTime = timeRemaining;
      setupStateTransition("RELAXATION");

    } else if (timerState === "RELAXATION") {
      // Se completó la relajación de la repetición actual
      if (config.type === "mixed") {
        if (mixedSubState === "QUICK") {
          if (currentRep < config.quickFlicksCount) {
            currentRep++;
            timerState = "TENSION";
            timeRemaining = config.quickTensionTime;
            totalPhaseTime = timeRemaining;
            setupStateTransition("TENSION");
          } else {
            // Completó los 10 flicks rápidos, pasa al bloque sostenido de 5 reps
            mixedSubState = "SUSTAINED";
            currentRep = 1;
            timerState = "TENSION";
            timeRemaining = config.sustainedTensionTime;
            totalPhaseTime = timeRemaining;
            setupStateTransition("TENSION");
          }
        } else { // SUSTAINED
          if (currentRep < config.sustainedCount) {
            currentRep++;
            timerState = "TENSION";
            timeRemaining = config.sustainedTensionTime;
            totalPhaseTime = timeRemaining;
            setupStateTransition("TENSION");
          } else {
            // Terminó la serie completa de Fase 3
            checkSetCompletion();
          }
        }
      } else {
        // Fases estándar 1, 2, 4
        if (currentRep < config.repsPerSet) {
          currentRep++;
          timerState = "TENSION";
          timeRemaining = config.tensionTime;
          totalPhaseTime = timeRemaining;
          setupStateTransition("TENSION");
        } else {
          checkSetCompletion();
        }
      }

    } else if (timerState === "REST") {
      // Terminó el descanso entre series: Inicia la siguiente serie
      currentSet++;
      currentRep = 1;
      mixedSubState = "QUICK";
      timerState = "TENSION";
      timeRemaining = (config.type === "mixed") ? config.quickTensionTime : config.tensionTime;
      totalPhaseTime = timeRemaining;
      setupStateTransition("TENSION");
    }

    updateTimerUI();
  }

  function checkSetCompletion() {
    const config = PHASES_CONFIG[currentPhaseId];

    if (currentSet < config.totalSets) {
      // Inicia descanso entre series
      timerState = "REST";
      timeRemaining = config.restBetweenSets;
      totalPhaseTime = timeRemaining;
      setupStateTransition("REST");
    } else {
      // Rutina completada con éxito
      completeWorkout();
    }
  }

  // Navegación manual: Siguiente Repetición / Paso
  function nextRep() {
    getAudioContext();
    const config = PHASES_CONFIG[currentPhaseId];

    if (timerState === "REST") {
      skipRest();
      return;
    }

    if (timerState === "TENSION") {
      // Salta a la relajación de la misma repetición
      timerState = "RELAXATION";
      timeRemaining = (config.type === "mixed") ? (mixedSubState === "QUICK" ? config.quickRelaxTime : config.sustainedRelaxTime) : config.relaxTime;
      totalPhaseTime = timeRemaining;
      setupStateTransition("RELAXATION");
    } else {
      // Salta a la siguiente repetición o descanso
      if (config.type === "mixed") {
        if (mixedSubState === "QUICK") {
          if (currentRep < config.quickFlicksCount) {
            currentRep++;
            timerState = "TENSION";
            timeRemaining = config.quickTensionTime;
          } else {
            mixedSubState = "SUSTAINED";
            currentRep = 1;
            timerState = "TENSION";
            timeRemaining = config.sustainedTensionTime;
          }
        } else {
          if (currentRep < config.sustainedCount) {
            currentRep++;
            timerState = "TENSION";
            timeRemaining = config.sustainedTensionTime;
          } else {
            checkSetCompletion();
            updateTimerUI();
            return;
          }
        }
      } else {
        if (currentRep < config.repsPerSet) {
          currentRep++;
          timerState = "TENSION";
          timeRemaining = config.tensionTime;
        } else {
          checkSetCompletion();
          updateTimerUI();
          return;
        }
      }
      totalPhaseTime = timeRemaining;
      setupStateTransition("TENSION");
    }

    updateTimerUI();
  }

  // Navegación manual: Repetición o Paso Anterior
  function prevRep() {
    getAudioContext();
    const config = PHASES_CONFIG[currentPhaseId];

    if (timerState === "RELAXATION") {
      // Regresa a la tensión de la misma repetición
      timerState = "TENSION";
      timeRemaining = (config.type === "mixed") ? (mixedSubState === "QUICK" ? config.quickTensionTime : config.sustainedTensionTime) : config.tensionTime;
      totalPhaseTime = timeRemaining;
      setupStateTransition("TENSION");
    } else if (timerState === "TENSION" && currentRep > 1) {
      // Regresa a la repetición anterior
      currentRep--;
      timeRemaining = (config.type === "mixed") ? (mixedSubState === "QUICK" ? config.quickTensionTime : config.sustainedTensionTime) : config.tensionTime;
      totalPhaseTime = timeRemaining;
      setupStateTransition("TENSION");
    } else if (timerState === "REST") {
      // Vuelve a la última repetición de la serie actual
      currentRep = (config.type === "mixed") ? config.sustainedCount : config.repsPerSet;
      timerState = "TENSION";
      timeRemaining = (config.type === "mixed") ? config.sustainedTensionTime : config.tensionTime;
      totalPhaseTime = timeRemaining;
      setupStateTransition("TENSION");
    }

    updateTimerUI();
  }

  // Saltar descanso entre series
  function skipRest() {
    getAudioContext();
    const config = PHASES_CONFIG[currentPhaseId];
    currentSet++;
    currentRep = 1;
    mixedSubState = "QUICK";
    timerState = "TENSION";
    timeRemaining = (config.type === "mixed") ? config.quickTensionTime : config.tensionTime;
    totalPhaseTime = timeRemaining;
    setupStateTransition("TENSION");
    updateTimerUI();
  }

  function setupStateTransition(newState) {
    if (newState === "TENSION") {
      playSound('tension');
      triggerHaptic([140, 50, 140]);
      updateTimerDisplay("CONTRAE / KEGEL", "tension-mode", "badge-tension", getSublabelForCurrentState("TENSION"));
      if (DOM.btnSkipRest) DOM.btnSkipRest.classList.add('hidden');
    } else if (newState === "RELAXATION") {
      playSound('relax');
      triggerHaptic([70, 70, 70]);
      updateTimerDisplay("RELAJA / KEGEL INVERSO", "relax-mode", "badge-relax", getSublabelForCurrentState("RELAXATION"));
      if (DOM.btnSkipRest) DOM.btnSkipRest.classList.add('hidden');
    } else if (newState === "REST") {
      playSound('rest');
      triggerHaptic([200, 100, 200]);
      updateTimerDisplay("DESCANSO", "rest-mode", "badge-rest", getSublabelForCurrentState("REST"));
      if (DOM.btnSkipRest) {
        DOM.btnSkipRest.classList.remove('hidden');
        DOM.btnSkipRest.textContent = `⏩ Iniciar Serie ${currentSet + 1}`;
      }
    }
    updateCountersUI();
  }

  function updateTimerUI() {
    DOM.countdown.textContent = timeRemaining < 10 ? `0${timeRemaining}` : timeRemaining;
    const ratio = totalPhaseTime > 0 ? timeRemaining / totalPhaseTime : 0;
    setCircleProgress(ratio);
  }

  function updateTimerDisplay(title, modeClass, badgeClass, sublabel) {
    DOM.stateBadge.textContent = title;
    DOM.stateBadge.className = `state-badge ${badgeClass}`;
    DOM.circleProgress.className = `timer-circle-progress ${modeClass}`;
    DOM.sublabel.textContent = sublabel;
    DOM.countdown.textContent = timeRemaining < 10 ? `0${timeRemaining}` : timeRemaining;
  }

  function setCircleProgress(ratio) {
    const offset = CIRCLE_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, ratio)));
    DOM.circleProgress.style.strokeDashoffset = offset;
  }

  function updateCountersUI() {
    const config = PHASES_CONFIG[currentPhaseId];
    let totalRepsDisplay = config.repsPerSet;

    if (config.type === "mixed") {
      totalRepsDisplay = (mixedSubState === "QUICK") ? `${config.quickFlicksCount} (F)` : `${config.sustainedCount} (S)`;
    }

    DOM.repCounter.textContent = `${currentRep} / ${totalRepsDisplay}`;

    if (timerState === "REST") {
      DOM.setCounter.textContent = `${currentSet} / ${config.totalSets}`;
      if (DOM.repSubtext) DOM.repSubtext.textContent = "Descanso entre series";
      if (DOM.setSubtext) DOM.setSubtext.textContent = `Serie ${currentSet} terminada`;
    } else if (timerState === "TENSION") {
      DOM.setCounter.textContent = `${currentSet} / ${config.totalSets}`;
      if (DOM.repSubtext) DOM.repSubtext.textContent = "⚡ Contrayendo";
      if (DOM.setSubtext) DOM.setSubtext.textContent = "En curso";
    } else if (timerState === "RELAXATION") {
      DOM.setCounter.textContent = `${currentSet} / ${config.totalSets}`;
      if (DOM.repSubtext) DOM.repSubtext.textContent = "🌿 Kegel Inverso";
      if (DOM.setSubtext) DOM.setSubtext.textContent = "En curso";
    } else {
      DOM.setCounter.textContent = `${currentSet} / ${config.totalSets}`;
      if (DOM.repSubtext) DOM.repSubtext.textContent = "Listo para iniciar";
      if (DOM.setSubtext) DOM.setSubtext.textContent = "Listo";
    }
  }

  function completeWorkout() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerState = "COMPLETED";

    playSound('complete');
    triggerHaptic([300, 100, 300, 100, 500]);

    const streak = saveCompletedSession(currentPhaseId);

    DOM.modalStreakBadge.textContent = `🔥 Racha Activa: ${streak} ${streak === 1 ? 'día' : 'días'}`;
    DOM.completionModal.classList.remove('hidden');

    resetTimerState();
    loadAndRenderHistory();
  }

  // --------------------------------------------------------------------------
  // 7. GESTIÓN DE PROGRESO & LOCALSTORAGE
  // --------------------------------------------------------------------------
  const STORAGE_KEY_HISTORY = "control_pelvico_history_v1";
  const STORAGE_KEY_SETTINGS = "control_pelvico_settings_v1";

  function saveCompletedSession(phaseId) {
    const history = getHistory();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const newRecord = {
      id: Date.now(),
      date: now.toISOString(),
      dateStr: todayStr,
      phaseId: phaseId,
      phaseName: PHASES_CONFIG[phaseId].name
    };

    history.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));

    return calculateStreak(history);
  }

  function getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function calculateStreak(history) {
    if (!history || history.length === 0) return 0;

    const uniqueDates = Array.from(new Set(history.map(item => item.dateStr))).sort().reverse();
    if (uniqueDates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date(uniqueDates[0] === todayStr ? todayStr : yesterdayStr);

    for (let i = 0; i < uniqueDates.length; i++) {
      const dateToCheckStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.includes(dateToCheckStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function loadAndRenderHistory() {
    const history = getHistory();

    const streak = calculateStreak(history);
    const total = history.length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthCount = history.filter(item => {
      const d = new Date(item.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    DOM.statStreak.textContent = streak;
    DOM.statTotal.textContent = total;
    DOM.statMonth.textContent = monthCount;

    renderActivityGrid(history);
    renderHistoryList(history);
  }

  function renderActivityGrid(history) {
    DOM.activityGrid.innerHTML = '';
    const activeDatesSet = new Set(history.map(item => item.dateStr));

    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const isActive = activeDatesSet.has(dStr);

      const dayCell = document.createElement('div');
      dayCell.className = `activity-day ${isActive ? 'active' : ''}`;
      dayCell.textContent = d.getDate();
      dayCell.title = `${dStr}: ${isActive ? 'Completado' : 'Sin registro'}`;

      DOM.activityGrid.appendChild(dayCell);
    }
  }

  function renderHistoryList(history) {
    DOM.historyList.innerHTML = '';
    if (!history || history.length === 0) {
      DOM.historyList.innerHTML = '<div class="empty-history">No hay sesiones registradas aún. ¡Completa tu primera rutina hoy!</div>';
      return;
    }

    history.slice(0, 15).forEach(item => {
      const d = new Date(item.date);
      const formattedDate = d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';
      itemEl.innerHTML = `
        <div>
          <div class="history-item-date">${formattedDate}</div>
          <div class="history-item-phase">${item.phaseName}</div>
        </div>
        <span class="state-badge badge-relax">✓ OK</span>
      `;
      DOM.historyList.appendChild(itemEl);
    });
  }

  function clearHistory() {
    if (confirm("¿Estás seguro de que deseas borrar todo el historial de entrenamientos?")) {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      loadAndRenderHistory();
    }
  }

  // --------------------------------------------------------------------------
  // 8. PREFERENCIAS DE SONIDO Y HÁPTICA
  // --------------------------------------------------------------------------
  function loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS));
      if (settings) {
        isSoundEnabled = settings.sound !== undefined ? settings.sound : true;
        isHapticEnabled = settings.haptic !== undefined ? settings.haptic : true;
      }
    } catch (e) {
      isSoundEnabled = true;
      isHapticEnabled = true;
    }
    updateSettingsUI();
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({
      sound: isSoundEnabled,
      haptic: isHapticEnabled
    }));
    updateSettingsUI();
  }

  function updateSettingsUI() {
    if (isSoundEnabled) {
      DOM.iconSoundOn.classList.remove('hidden');
      DOM.iconSoundOff.classList.add('hidden');
    } else {
      DOM.iconSoundOn.classList.add('hidden');
      DOM.iconSoundOff.classList.remove('hidden');
    }

    DOM.btnHapticToggle.style.opacity = isHapticEnabled ? '1' : '0.4';
  }

  // --------------------------------------------------------------------------
  // 9. EVENT LISTENERS
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Pestañas SPA
    DOM.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetViewId = btn.getAttribute('data-target');
        
        DOM.navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        DOM.tabViews.forEach(view => {
          if (view.id === targetViewId) {
            view.classList.remove('hidden');
          } else {
            view.classList.add('hidden');
          }
        });
      });
    });

    // Selector de Fase
    DOM.phaseSelect.addEventListener('change', (e) => {
      currentPhaseId = parseInt(e.target.value, 10);
      updatePhaseUI();
    });

    // Controles Principales
    DOM.btnStartPause.addEventListener('click', toggleStartPause);
    DOM.btnReset.addEventListener('click', resetTimerState);

    // Controles Secundarios de Navegación Manual
    if (DOM.btnPrevRep) DOM.btnPrevRep.addEventListener('click', prevRep);
    if (DOM.btnNextRep) DOM.btnNextRep.addEventListener('click', nextRep);
    if (DOM.btnSkipRest) DOM.btnSkipRest.addEventListener('click', skipRest);

    // Toggles de Sonido y Háptica
    DOM.btnSoundToggle.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      saveSettings();
      if (isSoundEnabled) playSound('tension');
    });

    DOM.btnHapticToggle.addEventListener('click', () => {
      isHapticEnabled = !isHapticEnabled;
      saveSettings();
      if (isHapticEnabled) triggerHaptic([100]);
    });

    // Modal
    DOM.btnCloseModal.addEventListener('click', () => {
      DOM.completionModal.classList.add('hidden');
    });

    // Borrar Historial
    DOM.btnClearHistory.addEventListener('click', clearHistory);
  }

  // --------------------------------------------------------------------------
  // 10. CICLO DE VIDA DEL SERVICE WORKER & ACTUALIZACIÓN AUTOMÁTICA
  // --------------------------------------------------------------------------
  function setupServiceWorkerLifecycle() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          console.log('[PWA] Service Worker registrado:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner();
              }
            });
          });
        })
        .catch(err => {
          console.warn('[PWA] Error en Service Worker:', err);
        });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    if (DOM.updateBtn) {
      DOM.updateBtn.addEventListener('click', () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
              window.location.reload();
            }
          });
        } else {
          window.location.reload();
        }
      });
    }
  }

  function showUpdateBanner() {
    if (DOM.updateBanner) {
      DOM.updateBanner.classList.remove('hidden');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
