/**
 * settings.js — Companion phone config app for EvenHub Fasting Tracker.
 * Self-contained vanilla JS. Reads preset/translation data from window globals
 * embedded in settings.html. Persists config via localStorage key 'even-fasting-config'.
 */

(function () {
  'use strict';

  // ── Data from HTML embedded scripts ──────────────────────────────────────
  const PRESETS = window.__FASTING_PRESETS || [];
  const TRANSLATIONS = window.__TRANSLATIONS || { en: {}, fr: {} };

  const DEFAULT_CONFIG = {
    presetId: '16:8',
    schedule: { fastStart: '20:00', fastEnd: '12:00' },
    displayMode: 'text',
    lang: 'en',
    bgColor: 0,
    textColor: 12
  };

  // ── State ────────────────────────────────────────────────────────────────
  let currentConfig = { ...DEFAULT_CONFIG };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function tr(key) {
    const lang = currentConfig.lang || 'en';
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'] || {};
    return dict[key] || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || key;
  }

  /** Map a preset id to the translation key prefix used in TRANSLATIONS. */
  function presetKey(id) {
    // e.g. '16:8' → 'preset_16_8', '5:2-week' → 'preset_5_2_week', 'adf' → 'preset_adf'
    return 'preset_' + id.replace(/[:-]/g, '_').toLowerCase();
  }

  function presetName(id) {
    const pk = presetKey(id);
    return tr(pk + '_name') || id;
  }

  function presetDesc(id) {
    const pk = presetKey(id);
    return tr(pk + '_desc') || '';
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  function loadConfig() {
    try {
      const raw = localStorage.getItem('even-fasting-config');
      if (raw) {
        const parsed = JSON.parse(raw);
        currentConfig = { ...DEFAULT_CONFIG, ...parsed };
        return;
      }
    } catch (e) { /* ignore corrupt data */ }
    currentConfig = { ...DEFAULT_CONFIG };
  }

  function saveConfig() {
    localStorage.setItem('even-fasting-config', JSON.stringify(currentConfig));
  }

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const langToggle = document.getElementById('langToggle');
  const presetGrid = document.getElementById('presetGrid');
  const fastStartInput = document.getElementById('fastStart');
  const fastEndInput = document.getElementById('fastEnd');
  const modeSelector = document.getElementById('modeSelector');
  const btnSave = document.getElementById('btnSave');
  const btnCancel = document.getElementById('btnCancel');

  // ── Rendering ────────────────────────────────────────────────────────────

  /** Update every element with a data-i18n attribute. */
  function updateAllText() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      el.textContent = tr(key);
    });
    // Re-render preset cards since names/descs are language-dependent
    renderPresetGrid();
    // Update page title
    document.title = tr('appTitle');
  }

  /** Build and insert preset cards into the grid. */
  function renderPresetGrid() {
    if (!presetGrid) return;
    presetGrid.innerHTML = '';

    PRESETS.forEach(function (preset) {
      const card = document.createElement('div');
      card.className = 'preset-card';
      if (currentConfig.presetId === preset.id) {
        card.classList.add('active');
      }
      card.setAttribute('data-preset-id', preset.id);

      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.backgroundColor = preset.color;

      const info = document.createElement('div');
      info.className = 'info';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'name';
      nameSpan.textContent = presetName(preset.id);

      const descSpan = document.createElement('span');
      descSpan.className = 'desc';
      descSpan.textContent = presetDesc(preset.id);

      info.appendChild(nameSpan);
      info.appendChild(descSpan);
      card.appendChild(dot);
      card.appendChild(info);

      card.addEventListener('click', function () {
        handlePresetClick(preset.id);
      });

      presetGrid.appendChild(card);
    });

    // Custom card
    const customCard = document.createElement('div');
    customCard.className = 'preset-card';
    if (currentConfig.presetId === 'custom') {
      customCard.classList.add('active');
    }
    customCard.setAttribute('data-preset-id', 'custom');

    const customDot = document.createElement('div');
    customDot.className = 'dot custom';

    const customInfo = document.createElement('div');
    customInfo.className = 'info';

    const customName = document.createElement('span');
    customName.className = 'name';
    customName.textContent = tr('custom');

    const customDesc = document.createElement('span');
    customDesc.className = 'desc';
    customDesc.textContent = tr('customDesc');

    customInfo.appendChild(customName);
    customInfo.appendChild(customDesc);
    customCard.appendChild(customDot);
    customCard.appendChild(customInfo);

    customCard.addEventListener('click', function () {
      handlePresetClick('custom');
    });

    presetGrid.appendChild(customCard);
  }

  function renderTimeInputs() {
    if (fastStartInput) fastStartInput.value = currentConfig.schedule.fastStart;
    if (fastEndInput) fastEndInput.value = currentConfig.schedule.fastEnd;
  }

  function renderLanguageToggle() {
    if (!langToggle) return;
    const buttons = langToggle.querySelectorAll('button');
    buttons.forEach(function (btn) {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === currentConfig.lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderModeSelector() {
    if (!modeSelector) return;
    const buttons = modeSelector.querySelectorAll('button');
    buttons.forEach(function (btn) {
      const mode = btn.getAttribute('data-mode');
      if (mode === currentConfig.displayMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /** Full UI refresh from current state. */
  function renderUI() {
    renderLanguageToggle();
    renderPresetGrid();
    renderTimeInputs();
    renderModeSelector();
    updateAllText();
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  function handlePresetClick(presetId) {
    if (presetId === 'custom') {
      currentConfig.presetId = 'custom';
      // Keep current time values
    } else {
      var preset = PRESETS.find(function (p) { return p.id === presetId; });
      if (preset) {
        currentConfig.presetId = preset.id;
        currentConfig.schedule.fastStart = preset.fastStart;
        currentConfig.schedule.fastEnd = preset.fastEnd;
      }
    }
    renderUI();
  }

  function handleTimeChange() {
    // Manual time edit → switch to custom
    currentConfig.presetId = 'custom';
    currentConfig.schedule.fastStart = fastStartInput ? fastStartInput.value : currentConfig.schedule.fastStart;
    currentConfig.schedule.fastEnd = fastEndInput ? fastEndInput.value : currentConfig.schedule.fastEnd;
    renderPresetGrid();
  }

  function handleSave() {
    // Pull latest values from inputs
    if (fastStartInput) currentConfig.schedule.fastStart = fastStartInput.value;
    if (fastEndInput) currentConfig.schedule.fastEnd = fastEndInput.value;

    // Basic validation
    if (!currentConfig.schedule.fastStart || !currentConfig.schedule.fastEnd) {
      alert(tr('fastStart') + ' / ' + tr('fastEnd') + ': ' + (currentConfig.lang === 'fr' ? 'champs requis' : 'both fields required'));
      return;
    }

    saveConfig();
    alert(currentConfig.lang === 'fr' ? 'Configuration enregistrée !' : 'Settings saved!');
  }

  function handleCancel() {
    // Revert to saved config
    loadConfig();
    renderUI();
  }

  function handleLanguageChange(lang) {
    if (lang !== 'en' && lang !== 'fr') return;
    currentConfig.lang = lang;
    // Also update html lang attribute for accessibility
    document.documentElement.lang = lang;
    renderUI();
  }

  // ── Event wiring ─────────────────────────────────────────────────────────

  function setupEventListeners() {
    // Language toggle
    if (langToggle) {
      langToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var lang = btn.getAttribute('data-lang');
        if (lang) handleLanguageChange(lang);
      });
    }

    // Time inputs — switch to custom on manual edit
    if (fastStartInput) {
      fastStartInput.addEventListener('input', handleTimeChange);
    }
    if (fastEndInput) {
      fastEndInput.addEventListener('input', handleTimeChange);
    }

    // Display mode selector
    if (modeSelector) {
      modeSelector.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var mode = btn.getAttribute('data-mode');
        if (mode === 'text' || mode === 'timeline') {
          currentConfig.displayMode = mode;
          renderModeSelector();
        }
      });
    }

    // Save / Cancel
    if (btnSave) btnSave.addEventListener('click', handleSave);
    if (btnCancel) btnCancel.addEventListener('click', handleCancel);
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  loadConfig();
  setupEventListeners();
  renderUI();
})();
