/* ==========================================================================
   CONTROL PÉLVICO PWA - LÓGICA PRINCIPAL (APP.JS v3.0)
   1-Click Ultra Simple • Feedback Inmediato (0ms) • Avanza Reps & Series
   ========================================================================== */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. CONFIGURACIÓN CLÍNICA DE LAS FASES DEL PROGRAMA (PFMT)
  // --------------------------------------------------------------------------
  const PHASES_CONFIG = {
    1: {
      name: "Fase 1: Activación y Consciencia",
      weeks: "Semanas 1 a 4",
      daysPerWeek: "4 días / semana",
      scheduleSuggestion: "Días alternos (ej: Lun, Mié, Vie, Dom). 1 día descanso intermedio.",
      summary: "Fase 1: 4 días/sem • Duración: 9m 30s (3 series x 10 reps)",
      description: "50% fuerza de tensión | Aislamiento y relajación profunda.",
      type: "standard",
      tensionTime: 5,
      relaxTime: 10,
      repsPerSet: 10,
      totalSets: 3,
      restBetweenSets: 60,
      postureWarning: false,
      totalDurationFormatted: "9 min 30 s"
    },
    2: {
      name: "Fase 2: Resistencia Veno-Oclusiva",
      weeks: "Semanas 5 a 8",
      daysPerWeek: "5 días / semana",
      scheduleSuggestion: "Lunes a Viernes. Descanso completo el fin de semana.",
      summary: "Fase 2: 5 días/sem • Duración: 15m 30s (3 series x 10 reps)",
      description: "70-80% fuerza de tensión | Fortalecimiento veno-oclusivo sostenido.",
      type: "standard",
      tensionTime: 10,
      relaxTime: 15,
      repsPerSet: 10,
      totalSets: 3,
      restBetweenSets: 90,
      postureWarning: false,
      totalDurationFormatted: "15 min 30 s"
    },
    3: {
      name: "Fase 3: Potencia y Control Reflejo",
      weeks: "Semanas 9 a 12",
      daysPerWeek: "5 días / semana",
      scheduleSuggestion: "Lunes a Viernes. Estímulo fibras rápidas y lentas.",
      summary: "Fase 3: 5 días/sem • Duración: 11m 15s (10 Flicks + 5 Sostenidas x 3 series)",
      description: "Bloque mixto: 10 Flicks rápidos (1s/1s) + 5 Contracciones sostenidas (10s/15s).",
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
      totalDurationFormatted: "11 min 15 s"
    },
    4: {
      name: "Fase 4: Integración Posicional",
      weeks: "Semana 13 en adelante",
      daysPerWeek: "3 días / semana",
      scheduleSuggestion: "Mantenimiento de por vida. Días alternos.",
      summary: "Fase 4: 3 días/sem • Duración: 17m 00s (2 series x 15 reps - De pie/sentado)",
      description: "Tensión Máxima en postura de pie o sentado contra la gravedad.",
      type: "standard",
      tensionTime: 10,
      relaxTime: 20,
      repsPerSet: 15,
      totalSets: 2,
      restBetweenSets: 120,
      postureWarning: true,
      totalDurationFormatted: "17 min 00 s"
    }
  };

  const CIRCLE_CIRCUMFERENCE = 753.98;

  // --------------------------------------------------------------------------
  // 2. ESTADO GLOBAL DE LA APP
  // --------------------------------------------------------------------------
  let currentPhaseId = 1;
  let timerState = "IDLE"; // "IDLE", "TENSION", "RELAXATION", "REST", "PAUSED", "COMPLETED"
  let previousTimerState = null;
  let timerInterval = null;

  let currentSet = 1;
  let currentRep = 1;
  let timeRemaining = 0;
  let totalPhaseTime = 0;
  let mixedSubState = "QUICK"; // "QUICK" o "SUSTAINED" (Fase 3)

  let isSoundEnabled = true;
  let isHapticEnabled = true;
  let audioCtx = null;

  // --------------------------------------------------------------------------
  // 3. CACHÉ DE ELEMENTOS DEL DOM
  // --------------------------------------------------------------------------
  const DOM = {
    // Pestañas de Navegación SPA
    navBtns: document.querySelectorAll('.nav-btn'),
    tabViews: document.querySelectorAll('.tab-view'),

    // Selector Directo de Fases
    phaseTabBtns: document.querySelectorAll('.phase-tab-btn'),
    phaseSummaryText: document.getElementById('phase-summary-text'),
    postureAlert: document.getElementById('posture-alert'),

    // Temporizador Circular
    circleProgress: document.getElementById('timer-circle-progress'),
    stateBadge: document.getElementById('timer-state-badge'),
    countdown: document.getElementById('timer-countdown'),
    sublabel: document.getElementById('timer-sublabel'),

    // Métricas
    repCounter: document.getElementById('rep-counter'),
    setCounter: document.getElementById('set-counter'),
    repSubtext: document.getElementById('rep-subtext'),
    setSubtext: document.getElementById('set-subtext'),

    // Botón Único Principal y Enlaces Rápidos
    btnStartPause: document.getElementById('btn-start-pause'),
    btnHeroIcon: document.getElementById('btn-hero-icon'),
    btnStartText: document.getElementById('btn-start-text'),
    restSkipContainer: document.getElementById('rest-skip-container'),
    btnSkipRest: document.getElementById('btn-skip-rest'),
    btnNextRep: document.getElementById('btn-next-rep'),
    btnNextSet: document.getElementById('btn-next-set'),
    btnReset: document.getElementById('btn-reset'),

    // Header Acciones
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    iconSoundOn: document.getElementById('icon-sound-on'),
    iconSoundOff: document.getElementById('icon-sound-off'),
    btnHapticToggle: document.getElementById('btn-haptic-toggle'),

    // Historial y Estadísticas
    statStreak: document.getElementById('stat-streak'),
    statTotal: document.getElementById('stat-total'),
    statMonth: document.getElementById('stat-month'),
    activityGrid: document.getElementById('activity-grid'),
    historyList: document.getElementById('history-list'),
    btnClearHistory: document.getElementById('btn-clear-history'),

    // Modales y Actualizaciones PWA
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
    selectPhase(1);
    loadAndRenderHistory();
    setupServiceWorkerLifecycle();
  }

  // --------------------------------------------------------------------------
  // 5. AUDIO POTENTE & VIBRACIÓN ANDROID (SIN VOZ)
  // --------------------------------------------------------------------------
  function getAudioContext() {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("Audio Context init error:", e);
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.9, now); // Volumen alto y nítido

      if (type === 'tension') {
        // Tono ascendente potente (contracción enérgica)
        const tones = [
          { freq: 880, start: 0, dur: 0.12 },
          { freq: 1200, start: 0.12, dur: 0.22 }
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
        // Tono descendente suave pero audible (relajación / Kegel Inverso)
        const tones = [
          { freq: 660, start: 0, dur: 0.14 },
          { freq: 440, start: 0.14, dur: 0.28 }
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
        // Triple pitido de descanso entre series
        [587, 587, 784].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);
          gain.gain.setValueAtTime(0.85, now + idx * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.14 + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 0.15);
        });

      } else if (type === 'complete') {
        // Fanfarria triunfal al terminar todas las series
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
  // 6. GESTIÓN DE FASES Y ESTADO
  // --------------------------------------------------------------------------
  function selectPhase(phaseId) {
    currentPhaseId = phaseId;

    // Actualizar botones de pestaña de fase
    DOM.phaseTabBtns.forEach(btn => {
      const p = parseInt(btn.getAttribute('data-phase'), 10);
      if (p === phaseId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const config = PHASES_CONFIG[currentPhaseId];
    if (DOM.phaseSummaryText) {
      DOM.phaseSummaryText.textContent = config.summary;
    }

    if (DOM.postureAlert) {
      if (config.postureWarning) {
        DOM.postureAlert.classList.remove('hidden');
      } else {
        DOM.postureAlert.classList.add('hidden');
      }
    }

    resetTimer();
  }

  function resetTimer() {
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

    // UI Reset
    updateTimerDisplay("CONTRAE / KEGEL", "tension-mode", "badge-tension", getSublabelForState("TENSION"));
    setCircleProgress(1);
    updateCountersUI();

    // Reset Hero Button
    if (DOM.btnHeroIcon) DOM.btnHeroIcon.textContent = "▶";
    if (DOM.btnStartText) DOM.btnStartText.textContent = "INICIAR RUTINA";
    if (DOM.btnStartPause) DOM.btnStartPause.classList.remove('running');

    if (DOM.restSkipContainer) DOM.restSkipContainer.classList.add('hidden');
  }

  function getSublabelForState(state) {
    const config = PHASES_CONFIG[currentPhaseId];
    if (state === "TENSION") {
      if (config.type === "mixed") {
        return mixedSubState === "QUICK" ? "⚡ Contracción rápida (1 segundo)" : "💪 Contracción sostenida (10 segundos)";
      }
      return currentPhaseId === 1 ? "Aprieta suave (50% de fuerza)" : currentPhaseId === 2 ? "Aprieta firme (75-80% fuerza)" : "Aprieta con fuerza máxima (100%)";
    } else if (state === "RELAXATION") {
      return "🌿 Relaja profundamente (Kegel Inverso)";
    } else if (state === "REST") {
      return `☕ Descanso entre series. Respira con calma.`;
    }
    return "";
  }

  // --------------------------------------------------------------------------
  // 7. INICIO CON 1 SOLO CLIC (FEEDBACK INMEDIATO A 0 MS)
  // --------------------------------------------------------------------------
  function toggleStartPause() {
    getAudioContext();

    if (timerState === "IDLE" || timerState === "PAUSED") {
      startTimer();
    } else {
      pauseTimer();
    }
  }

  function startTimer() {
    if (timerState === "IDLE") {
      timerState = "TENSION";
      const config = PHASES_CONFIG[currentPhaseId];
      timeRemaining = (config.type === "mixed") ? config.quickTensionTime : config.tensionTime;
      totalPhaseTime = timeRemaining;

      updateTimerDisplay("CONTRAE / KEGEL", "tension-mode", "badge-tension", getSublabelForState("TENSION"));
      try { playSound('tension'); } catch (e) {}
      try { triggerHaptic([140, 50, 140]); } catch (e) {}
    } else if (timerState === "PAUSED") {
      timerState = previousTimerState || "TENSION";
    }

    // Actualizar botón Hero
    if (DOM.btnHeroIcon) DOM.btnHeroIcon.textContent = "⏸";
    if (DOM.btnStartText) DOM.btnStartText.textContent = "PAUSAR";
    if (DOM.btnStartPause) DOM.btnStartPause.classList.add('running');

    updateCountersUI();
    updateTimerUI();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
  }

  function pauseTimer() {
    previousTimerState = timerState;
    timerState = "PAUSED";
    clearInterval(timerInterval);
    timerInterval = null;

    if (DOM.btnHeroIcon) DOM.btnHeroIcon.textContent = "▶";
    if (DOM.btnStartText) DOM.btnStartText.textContent = "REANUDAR";
    if (DOM.btnStartPause) DOM.btnStartPause.classList.remove('running');
    if (DOM.sublabel) DOM.sublabel.textContent = "Pausado - Toca reanudar para continuar";
  }

  // --------------------------------------------------------------------------
  // 8. CRONÓMETRO Y AVANCE AUTOMÁTICO DE REPETICIONES Y SERIES
  // --------------------------------------------------------------------------
  function tick() {
    timeRemaining--;

    if (timeRemaining < 0) {
      advanceRoutine();
      return;
    }

    updateTimerUI();
  }

  function advanceRoutine() {
    const config = PHASES_CONFIG[currentPhaseId];

    if (timerState === "TENSION") {
      // 1. Pasa a Relajación de la MISMA repetición
      timerState = "RELAXATION";
      if (config.type === "mixed") {
        timeRemaining = (mixedSubState === "QUICK") ? config.quickRelaxTime : config.sustainedRelaxTime;
      } else {
        timeRemaining = config.relaxTime;
      }
      totalPhaseTime = timeRemaining;

      try { playSound('relax'); } catch (e) {}
      try { triggerHaptic([70, 70, 70]); } catch (e) {}
      updateTimerDisplay("RELAJA / KEGEL INVERSO", "relax-mode", "badge-relax", getSublabelForState("RELAXATION"));
      if (DOM.restSkipContainer) DOM.restSkipContainer.classList.add('hidden');

    } else if (timerState === "RELAXATION") {
      // 2. Terminó la relajación -> Avanza la repetición
      if (config.type === "mixed") {
        if (mixedSubState === "QUICK") {
          if (currentRep < config.quickFlicksCount) {
            currentRep++;
            startNextRepetition(config.quickTensionTime);
          } else {
            // Completó los 10 flicks rápidos, pasa a las 5 repeticiones sostenidas
            mixedSubState = "SUSTAINED";
            currentRep = 1;
            startNextRepetition(config.sustainedTensionTime);
          }
        } else {
          // Bloque sostenido
          if (currentRep < config.sustainedCount) {
            currentRep++;
            startNextRepetition(config.sustainedTensionTime);
          } else {
            // Terminó la serie completa de Fase 3
            finishSet();
          }
        }
      } else {
        // Fases 1, 2, 4
        if (currentRep < config.repsPerSet) {
          currentRep++;
          startNextRepetition(config.tensionTime);
        } else {
          finishSet();
        }
      }

    } else if (timerState === "REST") {
      // 3. Terminó el descanso entre series -> Iniciar siguiente serie
      currentSet++;
      currentRep = 1;
      mixedSubState = "QUICK";
      const tensionDuration = (config.type === "mixed") ? config.quickTensionTime : config.tensionTime;
      startNextRepetition(tensionDuration);
    }

    updateCountersUI();
    updateTimerUI();
  }

  function startNextRepetition(duration) {
    timerState = "TENSION";
    timeRemaining = duration;
    totalPhaseTime = timeRemaining;

    try { playSound('tension'); } catch (e) {}
    try { triggerHaptic([140, 50, 140]); } catch (e) {}
    updateTimerDisplay("CONTRAE / KEGEL", "tension-mode", "badge-tension", getSublabelForState("TENSION"));
    if (DOM.restSkipContainer) DOM.restSkipContainer.classList.add('hidden');
  }

  function finishSet() {
    const config = PHASES_CONFIG[currentPhaseId];

    if (currentSet < config.totalSets) {
      // Pasa a descanso entre series
      timerState = "REST";
      timeRemaining = config.restBetweenSets;
      totalPhaseTime = timeRemaining;

      try { playSound('rest'); } catch (e) {}
      try { triggerHaptic([200, 100, 200]); } catch (e) {}
      updateTimerDisplay("DESCANSO", "rest-mode", "badge-rest", `Descanso entre series • Próxima: Serie ${currentSet + 1} de ${config.totalSets}`);

      // Mostrar botón gigante para saltar descanso si el usuario no quiere esperar
      if (DOM.restSkipContainer) {
        DOM.restSkipContainer.classList.remove('hidden');
      }
      if (DOM.btnSkipRest) {
        DOM.btnSkipRest.textContent = `⏩ Iniciar Serie ${currentSet + 1} de ${config.totalSets}`;
      }
    } else {
      // Rutina completada con éxito
      completeWorkout();
    }
  }

  // --------------------------------------------------------------------------
  // 9. NAVEGACIÓN MANUAL (SALTAR REP, SALTAR SERIE, SALTAR DESCANSO)
  // --------------------------------------------------------------------------
  function nextRep() {
    getAudioContext();
    const config = PHASES_CONFIG[currentPhaseId];

    if (timerState === "REST") {
      skipRest();
      return;
    }

    if (timerState === "TENSION") {
      // Salta directamente a relajación
      timerState = "RELAXATION";
      timeRemaining = (config.type === "mixed") ? (mixedSubState === "QUICK" ? config.quickRelaxTime : config.sustainedRelaxTime) : config.relaxTime;
      totalPhaseTime = timeRemaining;
      playSound('relax');
      triggerHaptic([70, 70, 70]);
      updateTimerDisplay("RELAJA / KEGEL INVERSO", "relax-mode", "badge-relax", getSublabelForState("RELAXATION"));
    } else {
      // Salta a la siguiente repetición
      const maxReps = (config.type === "mixed") ? (mixedSubState === "QUICK" ? config.quickFlicksCount : config.sustainedCount) : config.repsPerSet;
      if (currentRep < maxReps) {
        currentRep++;
      } else {
        if (config.type === "mixed" && mixedSubState === "QUICK") {
          mixedSubState = "SUSTAINED";
          currentRep = 1;
        } else if (currentSet < config.totalSets) {
          currentSet++;
          currentRep = 1;
          mixedSubState = "QUICK";
        }
      }
      const tDur = (config.type === "mixed") ? (mixedSubState === "QUICK" ? config.quickTensionTime : config.sustainedTensionTime) : config.tensionTime;
      startNextRepetition(tDur);
    }

    updateCountersUI();
    updateTimerUI();
  }

  function nextSet() {
    getAudioContext();
    const config = PHASES_CONFIG[currentPhaseId];
    if (currentSet < config.totalSets) {
      currentSet++;
      currentRep = 1;
      mixedSubState = "QUICK";
      const tDur = (config.type === "mixed") ? config.quickTensionTime : config.tensionTime;
      startNextRepetition(tDur);
    } else {
      completeWorkout();
    }
    updateCountersUI();
    updateTimerUI();
  }

  function skipRest() {
    getAudioContext();
    const config = PHASES_CONFIG[currentPhaseId];
    if (currentSet < config.totalSets) {
      currentSet++;
    }
    currentRep = 1;
    mixedSubState = "QUICK";
    const tDur = (config.type === "mixed") ? config.quickTensionTime : config.tensionTime;
    startNextRepetition(tDur);
    updateCountersUI();
    updateTimerUI();
  }

  // --------------------------------------------------------------------------
  // 10. DISPLAY DEL TEMPORIZADOR Y CONTADORES
  // --------------------------------------------------------------------------
  function updateTimerUI() {
    if (DOM.countdown) {
      DOM.countdown.textContent = timeRemaining < 10 ? `0${timeRemaining}` : timeRemaining;
    }
    const ratio = totalPhaseTime > 0 ? timeRemaining / totalPhaseTime : 0;
    setCircleProgress(ratio);

    if (timerState === "REST" && DOM.repSubtext) {
      DOM.repSubtext.textContent = `Descanso (${timeRemaining}s)`;
    }
  }

  function updateTimerDisplay(title, modeClass, badgeClass, sublabel) {
    if (DOM.stateBadge) {
      DOM.stateBadge.textContent = title;
      DOM.stateBadge.className = `state-badge ${badgeClass}`;
    }
    if (DOM.circleProgress) {
      DOM.circleProgress.setAttribute('class', `timer-circle-progress ${modeClass}`);
    }
    if (DOM.sublabel) {
      DOM.sublabel.textContent = sublabel;
    }
    if (DOM.countdown) {
      DOM.countdown.textContent = timeRemaining < 10 ? `0${timeRemaining}` : timeRemaining;
    }
  }

  function setCircleProgress(ratio) {
    if (!DOM.circleProgress) return;
    const offset = CIRCLE_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, ratio)));
    DOM.circleProgress.style.strokeDashoffset = offset;
  }

  function updateCountersUI() {
    const config = PHASES_CONFIG[currentPhaseId];
    if (!config) return;

    let totalRepsStr = `${config.repsPerSet}`;
    if (config.type === "mixed") {
      totalRepsStr = (mixedSubState === "QUICK") ? `${config.quickFlicksCount} (Flicks)` : `${config.sustainedCount} (Sost.)`;
    }

    if (DOM.repCounter) {
      DOM.repCounter.textContent = `${currentRep} de ${totalRepsStr}`;
    }
    if (DOM.setCounter) {
      DOM.setCounter.textContent = `${currentSet} de ${config.totalSets}`;
    }

    if (timerState === "TENSION") {
      if (DOM.repSubtext) DOM.repSubtext.textContent = `⚡ Contrayendo`;
      if (DOM.setSubtext) DOM.setSubtext.textContent = `Serie en curso`;
    } else if (timerState === "RELAXATION") {
      if (DOM.repSubtext) DOM.repSubtext.textContent = `🌿 Kegel Inverso`;
      if (DOM.setSubtext) DOM.setSubtext.textContent = `Serie en curso`;
    } else if (timerState === "REST") {
      if (DOM.repSubtext) DOM.repSubtext.textContent = `☕ Descanso (${timeRemaining}s)`;
      if (DOM.setSubtext) DOM.setSubtext.textContent = `Próx: Serie ${currentSet + 1}`;
    } else {
      if (DOM.repSubtext) DOM.repSubtext.textContent = `Listo`;
      if (DOM.setSubtext) DOM.setSubtext.textContent = `Listo`;
    }
  }

  function completeWorkout() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerState = "COMPLETED";

    playSound('complete');
    triggerHaptic([300, 100, 300, 100, 500]);

    const streak = saveCompletedSession(currentPhaseId);

    if (DOM.modalStreakBadge) {
      DOM.modalStreakBadge.textContent = `🔥 Racha Activa: ${streak} ${streak === 1 ? 'día' : 'días'}`;
    }
    if (DOM.completionModal) {
      DOM.completionModal.classList.remove('hidden');
    }

    resetTimer();
    loadAndRenderHistory();
  }

  // --------------------------------------------------------------------------
  // 11. HISTORIAL & LOCALSTORAGE
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

    if (DOM.statStreak) DOM.statStreak.textContent = streak;
    if (DOM.statTotal) DOM.statTotal.textContent = total;
    if (DOM.statMonth) DOM.statMonth.textContent = monthCount;

    renderActivityGrid(history);
    renderHistoryList(history);
  }

  function renderActivityGrid(history) {
    if (!DOM.activityGrid) return;
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
    if (!DOM.historyList) return;
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
        <span class="state-badge badge-relax">✓ Completada</span>
      `;
      DOM.historyList.appendChild(itemEl);
    });
  }

  function clearHistory() {
    if (confirm("¿Deseas reiniciar y borrar el historial de entrenamientos?")) {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      loadAndRenderHistory();
    }
  }

  // --------------------------------------------------------------------------
  // 12. PREFERENCIAS DE SONIDO Y VIBRACIÓN
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
    if (DOM.iconSoundOn && DOM.iconSoundOff) {
      if (isSoundEnabled) {
        DOM.iconSoundOn.classList.remove('hidden');
        DOM.iconSoundOff.classList.add('hidden');
      } else {
        DOM.iconSoundOn.classList.add('hidden');
        DOM.iconSoundOff.classList.remove('hidden');
      }
    }
    if (DOM.btnHapticToggle) {
      DOM.btnHapticToggle.style.opacity = isHapticEnabled ? '1' : '0.4';
    }
  }

  // --------------------------------------------------------------------------
  // 13. EVENT LISTENERS
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Pestañas de Navegación Móvil (Entrenador, Guía, Historial)
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

    // Pestañas directas de Fase (Fase 1, 2, 3, 4)
    DOM.phaseTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const phase = parseInt(btn.getAttribute('data-phase'), 10);
        selectPhase(phase);
      });
    });

    // BOTÓN ÚNICO HERO PRINCIPAL
    if (DOM.btnStartPause) DOM.btnStartPause.addEventListener('click', toggleStartPause);

    // Enlaces de navegación rápida
    if (DOM.btnNextRep) DOM.btnNextRep.addEventListener('click', nextRep);
    if (DOM.btnNextSet) DOM.btnNextSet.addEventListener('click', nextSet);
    if (DOM.btnReset) DOM.btnReset.addEventListener('click', resetTimer);
    if (DOM.btnSkipRest) DOM.btnSkipRest.addEventListener('click', skipRest);

    // Tocar las métricas también avanza
    if (DOM.repCounter) {
      DOM.repCounter.style.cursor = 'pointer';
      DOM.repCounter.addEventListener('click', nextRep);
    }
    if (DOM.setCounter) {
      DOM.setCounter.style.cursor = 'pointer';
      DOM.setCounter.addEventListener('click', nextSet);
    }

    // Toggle Sonido y Háptica
    if (DOM.btnSoundToggle) {
      DOM.btnSoundToggle.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        saveSettings();
        if (isSoundEnabled) playSound('tension');
      });
    }

    if (DOM.btnHapticToggle) {
      DOM.btnHapticToggle.addEventListener('click', () => {
        isHapticEnabled = !isHapticEnabled;
        saveSettings();
        if (isHapticEnabled) triggerHaptic([100]);
      });
    }

    // Modal de finalización
    if (DOM.btnCloseModal) {
      DOM.btnCloseModal.addEventListener('click', () => {
        if (DOM.completionModal) DOM.completionModal.classList.add('hidden');
      });
    }

    // Borrar historial
    if (DOM.btnClearHistory) {
      DOM.btnClearHistory.addEventListener('click', clearHistory);
    }
  }

  // --------------------------------------------------------------------------
  // 14. SERVICE WORKER & ACTUALIZACIÓN INSTANTÁNEA
  // --------------------------------------------------------------------------
  function setupServiceWorkerLifecycle() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (DOM.updateBanner) DOM.updateBanner.classList.remove('hidden');
              }
            });
          });
        })
        .catch(err => console.warn('[PWA] Error SW:', err));
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Solo recargar automáticamente si la app está inactiva para no interrumpir el ejercicio
      if (!refreshing && timerState === "IDLE") {
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

  // Ejecución
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
