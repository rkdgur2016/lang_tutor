// App State Variables
let currentLang = 'en'; // 'en' or 'ja'
let apiKeyState = '';
let vocabularyCache = []; // Live cache for vocab items
let isBackendConnected = false; // Check if backend is active
let totalSessionTokens = 0; // Active session token accumulator
let showRubyPronunciation = true; // State for showing Kanji pronunciation (ruby tags)

// Speech Recognition State
let recognition = null;
let isRecording = false;
let micLanguage = 'ko-KR'; // Default to Korean for voice input

// Dom Elements
const currentLangTitle = document.getElementById('currentLangTitle');
const currentLangDesc = document.getElementById('currentLangDesc');
const btnClearChat = document.getElementById('btnClearChat');
const messagesContainer = document.getElementById('messagesContainer');
const typingIndicator = document.getElementById('typingIndicator');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const vocabList = document.getElementById('vocabList');
const langButtons = document.querySelectorAll('.lang-btn');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnDownloadChat = document.getElementById('btnDownloadChat');
const lblLastTokens = document.getElementById('lblLastTokens');
const lblTotalTokens = document.getElementById('lblTotalTokens');

// Modal Elements
const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseModal = document.getElementById('btnCloseModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnSaveKey = document.getElementById('btnSaveKey');
const btnDeleteKey = document.getElementById('btnDeleteKey');

// Initial Setup
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Load ruby pronunciation setting
  const savedRuby = localStorage.getItem('lingotutor_show_ruby');
  if (savedRuby !== null) {
    showRubyPronunciation = savedRuby === 'true';
  }
  updateRubyToggleUI();

  // Check if we are running from the backend server
  await checkBackendStatus();

  // Load API Key
  await loadApiKey();

  // Load language settings & initial messages
  switchLanguage(currentLang);

  // Setup Event Listeners
  setupEventListeners();

  // Initialize Speech Recognition support check
  initSpeechRecognition();
});

// Load API Key from localStorage or Server
async function loadApiKey() {
  let savedKey = localStorage.getItem('lingotutor_gemini_key');
  
  if (!savedKey && isBackendConnected) {
    try {
      const res = await fetch('/api/key');
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) {
          savedKey = data.apiKey;
          localStorage.setItem('lingotutor_gemini_key', savedKey);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch API key from server", e);
    }
  }

  if (savedKey) {
    apiKeyState = savedKey;
    apiKeyInput.value = savedKey;
    enableChatInput(true);
  } else {
    apiKeyState = '';
    apiKeyInput.value = '';
    enableChatInput(false);
    // Show modal automatically on first load if API Key is missing
    openSettingsModal();
  }
}

// Check if Backend server is running
async function checkBackendStatus() {
  try {
    const res = await fetch('/api/vocab/en');
    if (res.status === 200) {
      isBackendConnected = true;
      console.log("Connected to LingoTutor Backend Server.");
    }
  } catch (err) {
    isBackendConnected = false;
    console.warn("Backend server not detected. Falling back to local browser storage.");
  }
}

// Enable/Disable chat text area and send button
function enableChatInput(enable) {
  const btnMic = document.getElementById('btnMic');
  const btnMicLang = document.getElementById('btnMicLang');

  if (enable) {
    chatInput.removeAttribute('disabled');
    chatInput.placeholder = currentLang === 'en' 
      ? "오늘 있었던 일을 적어보세요. (예: 오늘 친구와 '맛집'에 갔다.)" 
      : "오늘 있었던 일을 적어보세요. (예: 오늘 '점심'으로 라면을 먹었다.)";
    btnSend.removeAttribute('disabled');
    if (btnMic) btnMic.removeAttribute('disabled');
    if (btnMicLang) btnMicLang.removeAttribute('disabled');
  } else {
    chatInput.setAttribute('disabled', 'true');
    chatInput.placeholder = "API 키를 먼저 등록해 주세요.";
    btnSend.setAttribute('disabled', 'true');
    if (btnMic) btnMic.setAttribute('disabled', 'true');
    if (btnMicLang) btnMicLang.setAttribute('disabled', 'true');
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Modal toggle
  btnOpenSettings.addEventListener('click', openSettingsModal);
  btnCloseModal.addEventListener('click', closeSettingsModal);
  
  // Save/Delete API Key
  btnSaveKey.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('lingotutor_gemini_key', key);
      apiKeyState = key;
      enableChatInput(true);
      closeSettingsModal();
      showSystemAlert("API 키가 저장되었습니다.", "success");
      // Reload initial welcome message if chat was empty
      if (getChatHistory().length === 0) {
        initWelcomeMessage();
      }
    } else {
      showSystemAlert("유효한 API 키를 입력해 주세요.", "error");
    }
  });

  btnDeleteKey.addEventListener('click', () => {
    localStorage.removeItem('lingotutor_gemini_key');
    apiKeyState = '';
    apiKeyInput.value = '';
    enableChatInput(false);
    closeSettingsModal();
    showSystemAlert("API 키가 삭제되었습니다. 다시 사용하려면 설정창을 이용하세요.", "warning");
  });

  // Language selectors
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-lang');
      if (selected !== currentLang) {
        // Remove active class from other buttons
        langButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchLanguage(selected);
      }
    });
  });

  // Send message events
  btnSend.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Microphone events
  const btnMic = document.getElementById('btnMic');
  const btnMicLang = document.getElementById('btnMicLang');
  if (btnMic) {
    btnMic.addEventListener('click', () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }
  if (btnMicLang) {
    btnMicLang.addEventListener('click', () => {
      toggleMicLanguage();
    });
  }

  // Translator Event
  const btnTranslate = document.getElementById('btnTranslate');
  const translatorInput = document.getElementById('translatorInput');
  const translatorResult = document.getElementById('translatorResult');
  const translateDirection = document.getElementById('translateDirection');

  const translatorResultContainer = document.getElementById('translatorResultContainer');
  const btnTranslateTts = document.getElementById('btnTranslateTts');

  if (btnTranslate) {
    btnTranslate.addEventListener('click', async () => {
      const text = translatorInput.value.trim();
      if (!text) {
        showSystemAlert("번역할 텍스트를 입력해 주세요.", "warning");
        return;
      }

      btnTranslate.innerText = "번역 중...";
      btnTranslate.setAttribute('disabled', 'true');
      translatorInput.setAttribute('disabled', 'true');
      if (translatorResultContainer) translatorResultContainer.style.display = 'none';

      try {
        const direction = translateDirection.value;
        const result = await callFreeTranslateApi(text, direction);
        translatorResult.innerText = result;
        if (translatorResultContainer) translatorResultContainer.style.display = 'flex';
      } catch (err) {
        console.error(err);
        showSystemAlert(`번역 에러: ${err.message}`, "error");
      } finally {
        btnTranslate.innerText = "번역하기";
        btnTranslate.removeAttribute('disabled');
        translatorInput.removeAttribute('disabled');
      }
    });
  }

  if (btnTranslateTts) {
    btnTranslateTts.addEventListener('click', () => {
      const resultText = translatorResult.innerText.trim();
      if (!resultText) return;

      const direction = translateDirection.value;
      const targetLangCode = direction === 'ko-to-target' ? currentLang : 'ko';

      playTts(resultText, targetLangCode);
    });
  }

  // Clear chat history
  btnClearChat.addEventListener('click', () => {
    if (confirm("현재 언어의 모든 대화 기록과 단어장이 초기화됩니다. 계속하시겠습니까?")) {
      clearSessionHistory();
    }
  });

  // Export CSV Click Event
  btnExportCsv.addEventListener('click', handleExportCsv);

  // Download Chat History Event
  btnDownloadChat.addEventListener('click', handleDownloadChat);

  // Toggle ruby pronunciation guide
  const btnToggleRuby = document.getElementById('btnToggleRuby');
  if (btnToggleRuby) {
    btnToggleRuby.addEventListener('click', () => {
      showRubyPronunciation = !showRubyPronunciation;
      localStorage.setItem('lingotutor_show_ruby', showRubyPronunciation);
      updateRubyToggleUI();
    });
  }
}

function openSettingsModal() {
  settingsModal.classList.add('active');
}

function closeSettingsModal() {
  settingsModal.classList.remove('active');
}

// Helper to switch learning language
async function switchLanguage(lang) {
  currentLang = lang;
  
  if (lang === 'en') {
    currentLangTitle.innerText = "영어 학습 모드 (English)";
    currentLangDesc.innerText = "오늘 있었던 일이나 하고 싶은 이야기를 자유롭게 영어와 한국어를 섞어가며 일기처럼 써보세요.";
    chatInput.placeholder = "오늘 있었던 일을 적어보세요. (예: 오늘 친구와 '맛집'에 갔다.)";
  } else if (lang === 'ja') {
    currentLangTitle.innerText = "일본어 학습 모드 (日本語)";
    currentLangDesc.innerText = "오늘 있었던 일이나 하고 싶은 이야기를 자유롭게 일본어와 한국어를 섞어가며 일기처럼 써보세요.";
    chatInput.placeholder = "오늘 있었던 일을 적어보세요. (예: 오늘 친구와 '맛집'에 갔다.)";
  }

  // Update microphone elements when switching language
  const btnMicLang = document.getElementById('btnMicLang');
  if (btnMicLang) {
    micLanguage = 'ko-KR';
    btnMicLang.innerText = 'KO';
  }

  // Update translation options in dropdown
  const translateDirection = document.getElementById('translateDirection');
  if (translateDirection) {
    if (lang === 'en') {
      translateDirection.innerHTML = `
        <option value="ko-to-target">한 ➡️ 영 (KO to EN)</option>
        <option value="target-to-ko">영 ➡️ 한 (EN to KO)</option>
      `;
    } else {
      translateDirection.innerHTML = `
        <option value="ko-to-target">한 ➡️ 일 (KO to JA)</option>
        <option value="target-to-ko">일 ➡️ 한 (JA to KO)</option>
      `;
    }
  }

  // Load chat history & load vocabularies
  renderChatHistory();
  await loadVocabulary();
  loadTokenCount(); // Load token counts for this language session
}

// Helper to retrieve chat history from LocalStorage
function getChatHistory() {
  const historyKey = `lingotutor_chat_${currentLang}`;
  const data = localStorage.getItem(historyKey);
  return data ? JSON.parse(data) : [];
}

// Helper to save chat history to LocalStorage
function saveChatHistory(history) {
  const historyKey = `lingotutor_chat_${currentLang}`;
  localStorage.setItem(historyKey, JSON.stringify(history));
}

// Load vocabulary from server (or fallback to LocalStorage)
async function loadVocabulary() {
  if (isBackendConnected) {
    try {
      const res = await fetch(`/api/vocab/${currentLang}`);
      if (res.ok) {
        vocabularyCache = await res.json();
      }
    } catch (e) {
      console.error("Failed to fetch vocabulary from backend, switching to fallback localStorage.", e);
      loadVocabFromLocalStorage();
    }
  } else {
    loadVocabFromLocalStorage();
  }
  
  renderVocabularyUI();
}

function loadVocabFromLocalStorage() {
  const vocabKey = `lingotutor_vocab_${currentLang}`;
  const data = localStorage.getItem(vocabKey);
  vocabularyCache = data ? JSON.parse(data) : [];
}

// Render vocabulary list in right sidebar from cache
function renderVocabularyUI() {
  vocabList.innerHTML = '';
  
  if (vocabularyCache.length === 0) {
    vocabList.innerHTML = `
      <div class="vocab-empty">
        대화에 참여하면 자동으로 단어가 정리됩니다.
      </div>
    `;
    return;
  }
  
  // Show list in reverse chronological order (newest first)
  const reversedList = [...vocabularyCache].reverse();
  
  reversedList.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    
    const header = document.createElement('div');
    header.className = 'vocab-header';
    
    const word = document.createElement('span');
    word.className = 'vocab-word';
    word.innerHTML = renderRubyTags(item.translated);
    header.appendChild(word);
    
    const pron = document.createElement('span');
    pron.className = 'vocab-pronounce';
    pron.innerText = item.pronunciation ? `[${item.pronunciation}]` : '';
    header.appendChild(pron);
    
    card.appendChild(header);
    
    const meaning = document.createElement('div');
    meaning.className = 'vocab-meaning';
    meaning.innerText = item.korean;
    card.appendChild(meaning);
    
    if (item.example) {
      const example = document.createElement('div');
      example.className = 'vocab-example';
      example.innerHTML = renderRubyTags(item.example);
      card.appendChild(example);
    }
    
    vocabList.appendChild(card);
  });
}

// Add new vocabulary items to server or localStorage
async function addVocabulary(newItems) {
  if (!newItems || !Array.isArray(newItems) || newItems.length === 0) return;
  
  if (isBackendConnected) {
    try {
      const res = await fetch(`/api/vocab/${currentLang}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItems)
      });
      if (res.ok) {
        const json = await res.json();
        vocabularyCache = json.data;
      }
    } catch (e) {
      console.error("Backend error saving vocab, applying locally:", e);
      saveVocabToLocalStorage(newItems);
    }
  } else {
    saveVocabToLocalStorage(newItems);
  }

  renderVocabularyUI();
}

function saveVocabToLocalStorage(newItems) {
  const vocabKey = `lingotutor_vocab_${currentLang}`;
  const localData = localStorage.getItem(vocabKey);
  let db = localData ? JSON.parse(localData) : [];
  
  newItems.forEach(item => {
    const exists = db.some(existing => 
      existing.korean.trim().toLowerCase() === item.korean.trim().toLowerCase() ||
      existing.translated.trim().toLowerCase() === item.translated.trim().toLowerCase()
    );
    
    if (!exists) {
      db.push({
        ...item,
        createdAt: new Date().toISOString()
      });
    }
  });
  
  localStorage.setItem(vocabKey, JSON.stringify(db));
  vocabularyCache = db;
}

// Clear current session (chat history and vocabulary)
async function clearSessionHistory() {
  // Clear chat history locally
  localStorage.removeItem(`lingotutor_chat_${currentLang}`);
  
  // Clear vocabulary on Server/localStorage
  if (isBackendConnected) {
    try {
      await fetch(`/api/vocab/${currentLang}/clear`, { method: 'POST' });
      vocabularyCache = [];
    } catch (e) {
      console.error(e);
      localStorage.removeItem(`lingotutor_vocab_${currentLang}`);
      vocabularyCache = [];
    }
  } else {
    localStorage.removeItem(`lingotutor_vocab_${currentLang}`);
    vocabularyCache = [];
  }

  // Clear tokens locally
  localStorage.removeItem(`lingotutor_tokens_${currentLang}`);
  localStorage.removeItem(`lingotutor_last_tokens_${currentLang}`);
  totalSessionTokens = 0;
  updateTokenUI(0, 0);

  initWelcomeMessage();
  renderVocabularyUI();
}

// Initialize welcome message when history is empty
function initWelcomeMessage() {
  let initialMsg = '';
  if (currentLang === 'en') {
    initialMsg = JSON.stringify({
      reply: "Hi there! I'm your English tutor. How was your day? Tell me about what you did, or feel free to share your diary. If you don't know a word, just write it in Korean (like [사과] or 사과) and I'll explain it!",
      corrections: [],
      vocabulary: []
    });
  } else {
    initialMsg = JSON.stringify({
      reply: "こんにちは！日本語(にほんご/니혼고) 튜터입니다. 오늘 있었던 일이나 하고 싶은 이야기를 자유롭게 일본어와 한국어를 섞어가며 써보세요. 모르는 단어는 한국어로 써 주시면 제가 정리(せいり/세이리)해 드릴게요! 오늘(きょう/쿄우)은 어떤 하루(いちにち/이치니치)를 보내셨나요?",
      corrections: [],
      vocabulary: []
    });
  }

  const welcomeHistory = [
    { role: 'model', parts: [{ text: initialMsg }] }
  ];
  saveChatHistory(welcomeHistory);
  renderChatHistory();
}

// Handle Exporting to CSV
function handleExportCsv() {
  if (vocabularyCache.length === 0) {
    showSystemAlert("다운로드할 단어가 단어장에 없습니다.", "warning");
    return;
  }

  // 1. If backend server is active, redirect to backend CSV export endpoint
  if (isBackendConnected) {
    window.location.href = `/api/vocab/${currentLang}/csv`;
    showSystemAlert("CSV 파일 다운로드를 시작합니다.", "success");
  } 
  // 2. If running standalone (pure HTML file without backend), generate CSV in frontend
  else {
    try {
      let csvContent = '\ufeff'; // UTF-8 BOM
      csvContent += '원어(한국어),번역(학습어),발음,예문\n';

      vocabularyCache.forEach(item => {
        const escapeCsv = (text) => {
          if (!text) return '';
          const stringified = String(text).replace(/"/g, '""');
          return stringified.includes(',') || stringified.includes('\n') || stringified.includes('"') 
            ? `"${stringified}"` 
            : stringified;
        };

        const row = [
          escapeCsv(item.korean),
          escapeCsv(formatRubyForTxt(item.translated)),
          escapeCsv(item.pronunciation),
          escapeCsv(formatRubyForTxt(item.example))
        ].join(',');

        csvContent += row + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `lingotutor_vocab_${currentLang}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSystemAlert("로컬 CSV 파일 다운로드를 시작합니다.", "success");
    } catch (e) {
      showSystemAlert("CSV 다운로드 중 오류가 발생했습니다.", "error");
      console.error(e);
    }
  }
}

// Print system notification on interface
function showSystemAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.style.position = 'fixed';
  alertDiv.style.bottom = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.background = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444';
  alertDiv.style.color = '#fff';
  alertDiv.style.padding = '1rem 1.5rem';
  alertDiv.style.borderRadius = '10px';
  alertDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  alertDiv.style.fontSize = '0.9rem';
  alertDiv.style.fontWeight = '600';
  alertDiv.style.zIndex = '999';
  alertDiv.style.opacity = '0';
  alertDiv.style.transition = 'opacity 0.3s ease';
  alertDiv.innerText = message;
  
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.style.opacity = '1', 50);
  setTimeout(() => {
    alertDiv.style.opacity = '0';
    setTimeout(() => alertDiv.remove(), 300);
  }, 3000);
}

// Helper to convert Kanji(Furigana/Korean) or HTML ruby tags to HTML ruby elements
function renderRubyTags(text) {
  if (!text) return "";
  
  // 1. Create a safe HTML escaped version of the text
  const tempDiv = document.createElement('div');
  tempDiv.innerText = text;
  let html = tempDiv.innerHTML;
  
  // 2. Restore any raw <ruby> / <rt> tags safely if they were generated/used
  html = html.replace(/&lt;ruby&gt;/gi, '<ruby>')
             .replace(/&lt;\/ruby&gt;/gi, '</ruby>')
             .replace(/&lt;rt&gt;/gi, '<rt>')
             .replace(/&lt;\/rt&gt;/gi, '</rt>');
             
  // 3. Convert Kanji(Pronunciation) patterns to ruby tags
  // Matches Kanji characters followed by parentheses containing pronunciation
  const kanjiRegex = /([\u4e00-\u9faf々〆]+)[(（]([^)）]+)[)）]/g;
  html = html.replace(kanjiRegex, '<ruby>$1<rt>$2</rt></ruby>');
  
  return html;
}

// Helper to convert ruby tags back to text representation for txt/csv downloads
function formatRubyForTxt(text) {
  if (!text) return '';
  let formatted = text.replace(/<ruby>([\s\S]*?)<rt>([\s\S]*?)<\/rt><\/ruby>/gi, '$1($2)');
  return formatted;
}

// Render entire chat list from memory
function renderChatHistory() {
  messagesContainer.innerHTML = '';
  const history = getChatHistory();
  
  if (history.length === 0) {
    initWelcomeMessage();
    return;
  }

  history.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const textContent = msg.parts[0].text;
    
    const messageNode = document.createElement('div');
    messageNode.className = `message ${isUser ? 'user' : 'ai'}`;
    
    const avatarNode = document.createElement('div');
    avatarNode.className = 'avatar';
    avatarNode.innerText = isUser ? '👤' : '🤖';
    messageNode.appendChild(avatarNode);
    
    const contentNode = document.createElement('div');
    contentNode.className = 'message-content';
    
    const textNode = document.createElement('div');
    textNode.className = 'message-text';
    
    if (isUser) {
      textNode.innerText = textContent;
      contentNode.appendChild(textNode);
      
      // Memo note area
      const noteArea = document.createElement('div');
      noteArea.className = 'user-note-area';
      
      const hasNote = msg.note && msg.note.trim() !== "";
      
      // Display block
      const displayDiv = document.createElement('div');
      displayDiv.className = 'user-note-display';
      displayDiv.style.display = hasNote ? 'flex' : 'none';
      
      const noteText = document.createElement('span');
      noteText.className = 'user-note-text';
      noteText.innerText = `📝 ${msg.note || ""}`;
      displayDiv.appendChild(noteText);
      
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-edit-note';
      editBtn.title = '메모 수정/삭제';
      editBtn.innerHTML = `<i data-lucide="pencil" style="width: 11px; height: 11px;"></i>`;
      displayDiv.appendChild(editBtn);
      
      noteArea.appendChild(displayDiv);

      // Add/Edit button trigger
      const addBtn = document.createElement('button');
      addBtn.className = 'user-note-trigger';
      addBtn.style.display = hasNote ? 'none' : 'inline-flex';
      addBtn.innerHTML = `<i data-lucide="pencil" style="width: 11px; height: 11px;"></i> 메모 작성`;
      noteArea.appendChild(addBtn);

      // Editor block
      const editorDiv = document.createElement('div');
      editorDiv.className = 'user-note-editor';
      editorDiv.style.display = 'none';
      
      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.className = 'user-note-input';
      noteInput.placeholder = '알게 된 단어나 피드백 메모...';
      noteInput.value = msg.note || "";
      editorDiv.appendChild(noteInput);
      
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'user-note-buttons';
      
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-save-note';
      saveBtn.innerText = '저장';
      buttonsDiv.appendChild(saveBtn);
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-cancel-note';
      cancelBtn.innerText = '취소';
      buttonsDiv.appendChild(cancelBtn);
      
      editorDiv.appendChild(buttonsDiv);
      noteArea.appendChild(editorDiv);

      // Toggle editor functions
      const startEditing = () => {
        displayDiv.style.display = 'none';
        addBtn.style.display = 'none';
        editorDiv.style.display = 'flex';
        noteInput.focus();
      };

      const stopEditing = () => {
        editorDiv.style.display = 'none';
        if (msg.note && msg.note.trim() !== "") {
          displayDiv.style.display = 'flex';
          addBtn.style.display = 'none';
        } else {
          displayDiv.style.display = 'none';
          addBtn.style.display = 'inline-flex';
        }
      };

      // Find the index of this message in getChatHistory()
      const msgIdx = idx;

      addBtn.addEventListener('click', startEditing);
      editBtn.addEventListener('click', startEditing);
      cancelBtn.addEventListener('click', stopEditing);
      
      saveBtn.addEventListener('click', () => {
        const newNote = noteInput.value.trim();
        updateMessageNote(msgIdx, newNote);
      });
      
      noteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const newNote = noteInput.value.trim();
          updateMessageNote(msgIdx, newNote);
        } else if (e.key === 'Escape') {
          stopEditing();
        }
      });
      
      contentNode.appendChild(noteArea);
    } else {
      try {
        const parsed = JSON.parse(textContent);
        
        // 1. Reply in target language
        textNode.innerHTML = renderRubyTags(parsed.reply || "");
        contentNode.appendChild(textNode);

        // 2. Action Buttons (Translation & TTS Audio)
        const actionRow = document.createElement('div');
        actionRow.className = 'message-actions-row';

        // 2a. Korean Translation Accordion Trigger
        let transContent = null;
        if (parsed.translation) {
          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'translation-toggle';
          toggleBtn.innerHTML = `<i data-lucide="languages" style="width: 12px; height: 12px; display: inline-block;"></i> 번역 보기`;
          
          transContent = document.createElement('div');
          transContent.className = 'translation-content';
          transContent.innerText = parsed.translation;

          toggleBtn.addEventListener('click', () => {
            const isActive = transContent.classList.toggle('active');
            toggleBtn.innerHTML = isActive 
              ? `<i data-lucide="eye-off" style="width: 12px; height: 12px; display: inline-block;"></i> 번역 접기`
              : `<i data-lucide="languages" style="width: 12px; height: 12px; display: inline-block;"></i> 번역 보기`;
            lucide.createIcons();
          });

          actionRow.appendChild(toggleBtn);
        }

        // 2b. TTS Voice Speaker Button
        if (parsed.reply) {
          const ttsBtn = document.createElement('button');
          ttsBtn.className = 'tts-button';
          ttsBtn.innerHTML = `<i data-lucide="volume-2" style="width: 12px; height: 12px; display: inline-block;"></i> 듣기`;
          
          ttsBtn.addEventListener('click', () => {
            playTts(parsed.reply, currentLang);
          });
          
          actionRow.appendChild(ttsBtn);
        }

        contentNode.appendChild(actionRow);

        // Append Translation box separately below actions
        if (transContent) {
          contentNode.appendChild(transContent);
        }
        
        // 3. Corrections (if any)
        if (parsed.corrections && parsed.corrections.length > 0) {
          const correctionBlock = document.createElement('div');
          correctionBlock.className = 'corrections-container';
          
          const title = document.createElement('div');
          title.className = 'correction-title';
          title.innerHTML = `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i> 교정 및 피드백`;
          correctionBlock.appendChild(title);
          
          parsed.corrections.forEach(corr => {
            const item = document.createElement('div');
            item.className = 'correction-item';
            
            const originalDiv = document.createElement('div');
            originalDiv.className = 'original';
            originalDiv.innerHTML = `✍️ ${renderRubyTags(corr.original)}`;
            item.appendChild(originalDiv);
            
            const fixedDiv = document.createElement('div');
            fixedDiv.className = 'fixed';
            fixedDiv.innerHTML = `✨ ${renderRubyTags(corr.corrected)}`;
            item.appendChild(fixedDiv);
            
            if (corr.explanation) {
              const explainDiv = document.createElement('div');
              explainDiv.className = 'explain';
              explainDiv.innerHTML = renderRubyTags(corr.explanation);
              item.appendChild(explainDiv);
            }
            
            correctionBlock.appendChild(item);
          });
          
          contentNode.appendChild(correctionBlock);
        }
      } catch (e) {
        textNode.innerHTML = renderRubyTags(textContent);
        contentNode.appendChild(textNode);
      }
    }
    
    messageNode.appendChild(contentNode);
    messagesContainer.appendChild(messageNode);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  lucide.createIcons();
}

// Update note content of a specific message in chat history
function updateMessageNote(idx, noteText) {
  const history = getChatHistory();
  if (history[idx]) {
    if (noteText && noteText.trim() !== "") {
      history[idx].note = noteText;
    } else {
      delete history[idx].note;
    }
    saveChatHistory(history);
    renderChatHistory();
  }
}

// Toggle Ruby pronunciation visibility in the chat container
function updateRubyToggleUI() {
  const messagesContainer = document.getElementById('messagesContainer');
  const btnToggleRuby = document.getElementById('btnToggleRuby');
  
  if (showRubyPronunciation) {
    if (messagesContainer) messagesContainer.classList.add('show-ruby');
    if (btnToggleRuby) {
      btnToggleRuby.classList.add('active');
      btnToggleRuby.title = "한자 발음 숨기기";
      btnToggleRuby.style.color = "var(--accent-color)";
    }
  } else {
    if (messagesContainer) messagesContainer.classList.remove('show-ruby');
    if (btnToggleRuby) {
      btnToggleRuby.classList.remove('active');
      btnToggleRuby.title = "한자 발음 보기";
      btnToggleRuby.style.color = "";
    }
  }
}

// Generate the System Prompt based on selected language
function getSystemPrompt() {
  if (currentLang === 'en') {
    return `You are a friendly, highly supportive English language tutor named LingoTutor. 
The user is learning English. They will write their daily diary entries or describe what they did today.
Sometimes they will put Korean words/sentences they don't know in single quotes like '사과', double quotes like "사과", brackets like '[사과]', or naturally mix Korean words in their sentences because they don't know the English equivalent.

Your tasks are:
1. Respond to the user naturally in friendly English. Keep your reply simple, supportive, and active. 
   - CRITICAL: Keep your conversational response (reply) concise, strictly within 2 to 3 sentences, to keep the conversation light and easy to read.
   - You MUST always end your response with an engaging, friendly follow-up question related to the user's topic so that the conversation continues naturally.
2. Provide a Korean translation of your English response (reply) so the user can crosscheck if they cannot understand.
3. Look at their input. If there are grammatical errors, typos, unnatural phrasing, or if they have written Korean words/sentences wrapped in quotes (' ' or " ") because they don't know them, you MUST provide corrections. Even if the rest of the sentence is grammatically correct, treat any sentence containing quoted Korean words as needing correction. For each quoted Korean expression, you MUST explain in the "explanation" field: "'[한글 표현]'은(는) 영어로 '[영어 번역 표현]'라고 표현합니다." (e.g., "'맛집'은 영어로 'popular restaurant' 또는 'famous restaurant'라고 표현합니다.")
4. Automatically translate any Korean words (whether they are in single quotes like '단어', double quotes like "단어", brackets like [단어], or naturally written in the text) into English. Provide:
   - "korean": The original Korean word (remove quotes or brackets if present, e.g., '사과' -> 사과)
   - "translated": The translated English word/phrase
   - "pronunciation": A Korean phonetic pronunciation guide (e.g., Apple is [애플], Walk is [워크])
   - "example": A simple English example sentence using the translated word

You MUST respond strictly in a valid JSON object matching the JSON schema below. DO NOT include any markdown code blocks outside of the raw JSON.
JSON Schema:
{
  "reply": "Your conversational response in English ending with a question",
  "translation": "Literal Korean translation of your English reply",
  "corrections": [
    {
      "original": "unnatural or incorrect sentence from user (including the Korean words in quotes)",
      "corrected": "corrected English sentence with the Korean words translated",
      "explanation": "Detailed explanation of the correction and translations in Korean (e.g., \"'맛집'은 영어로 'popular restaurant'라고 표현합니다. ...\")"
    }
  ],
  "vocabulary": [
    {
      "korean": "Korean word",
      "translated": "English translation",
      "pronunciation": "Phonetics in Korean",
      "example": "Simple example sentence using the translated word"
    }
  ]
}`;
  } else {
    return `You are a friendly, highly supportive Japanese language tutor named LingoTutor. 
The user is learning Japanese specifically to practice spoken Japanese conversation (일본어 회화).
They will write their daily diary entries or describe what they did today.
Sometimes they will put Korean words/sentences they don't know in single quotes like '사과', double quotes like "사과", brackets like '[사과]', or naturally mix Korean words in their sentences because they don't know the Japanese equivalent.

Your tasks are:
1. Respond to the user naturally in polite, friendly Japanese (using polite forms: です/ます). Keep your reply simple, natural, and friendly. 
   - CRITICAL: Keep your conversational response (reply) concise, strictly within 2 to 3 sentences, to prevent the user from being overwhelmed by long text.
   - CRITICAL: Since the user is learning Japanese, if there are Kanji (한자) characters in your response ("reply"), you MUST append their pronunciation in parentheses immediately after each Kanji word. Format it as: Kanji(Furigana/Korean pronunciation). For example: 今日(きょう/쿄우), 勉強(べんきょう/벤쿄우), 日本語(にほんご/니혼고). Do this for ALL Kanji characters in the "reply" so that the user can read and pronounce them easily.
   - You MUST always end your response with an engaging, easy-to-answer follow-up question in Japanese, also formatting any Kanji with pronunciation.
2. Provide a Korean translation of your Japanese response (reply) so the user can crosscheck if they cannot understand.
3. Look at their input. If there are grammatical errors, typos, unnatural/stiff/textbook phrasing, or if they have written Korean words/sentences wrapped in quotes (' ' or " ") because they don't know them, you MUST provide corrections. Even if the user's sentence is grammatically correct, if it sounds textbookish, stiff, or unnatural for daily conversation, correct it to natural daily-life conversational expressions that native Japanese speakers actually use (일본인들이 일상생활에서 실제로 사용하는 자연스럽고 구어체적인 회화 표현).
   - CRITICAL: For the corrected Japanese sentences in "corrected", you MUST also format any Kanji with their pronunciation in parentheses, e.g., 散歩(さんぽ/산포).
   - For each correction, explain in the "explanation" field in Korean:
      - Why the original was unnatural or textbookish.
      - The nuances of the suggested daily-life conversational expression.
      - For quoted Korean words: "'[한글 표현]'은(는) 일본어 일상 회화에서 '[일본어 번역 표현]'라고 표현합니다." (e.g., "'점심'은 일본어로 'お昼(ひる/오히루)' 또는 'ランチ'라고 표현합니다.")
4. Automatically translate any Korean words (whether they are in single quotes like '단어', double quotes like "단어", brackets like [단어], or naturally written in the text) into Japanese. Provide:
   - "korean": The original Korean word (remove quotes or brackets if present, e.g., '사과' -> 사과)
   - "translated": The translated Japanese word (using appropriate Kanji/Kana). If it contains Kanji, append its Furigana/Korean pronunciation in parentheses, e.g., 散歩(さんぽ/산포).
   - "pronunciation": The Furigana (Hiragana) and its Korean phonetic spelling (e.g., りんご [링고], 散歩 [산포])
   - "example": A simple Japanese example sentence using the translated word. You MUST include Furigana and Korean pronunciation inside parentheses for Kanji, like "公園(こうえん/코우엔)을 散歩(さん포/산포)했습니다".

You MUST respond strictly in a valid JSON object matching the JSON schema below. DO NOT include any markdown code blocks outside of the raw JSON.
JSON Schema:
{
  "reply": "Your conversational response in Japanese (Kanji formatted with pronunciation: Kanji(Furigana/Korean pronunciation)) ending with a question",
  "translation": "Literal Korean translation of your Japanese reply",
  "corrections": [
    {
      "original": "unnatural, stiff, textbookish, or incorrect sentence from user (including the Korean words in quotes)",
      "corrected": "corrected natural daily-life conversational Japanese sentence (Kanji formatted with pronunciation: Kanji(Furigana/Korean pronunciation))",
      "explanation": "Detailed explanation of why the correction is more natural in daily conversation, and translations in Korean (e.g., \"이 표현은 문법적으로는 맞지만, 일본인들이 일상 회화에서는 'お昼'나 'ランチ'라는 표현을 훨씬 더 자주 씁니다. ...\")"
    }
  ],
  "vocabulary": [
    {
      "korean": "Korean word",
      "translated": "Japanese translation (with Kanji pronunciation in parentheses if applicable)",
      "pronunciation": "Furigana & Korean pronunciation",
      "example": "Simple example sentence with Kanji pronunciation guide in parentheses"
    }
  ]
}`;
  }
}

// Call Gemini API and return response
async function callGeminiApi(history) {
  if (!apiKeyState) {
    throw new Error("Gemini API key is missing. Please set it in the settings modal.");
  }

  const contents = history.map(item => ({
    role: item.role,
    parts: [{ text: item.parts[0].text }]
  }));

  const systemPrompt = getSystemPrompt();
  
  const requestBody = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7
    }
  };

  // Multiple fallback endpoints & model configurations
  const attemptConfigs = [
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-1.5-flash-latest' },
    { version: 'v1', model: 'gemini-1.5-flash-latest' },
    { version: 'v1beta', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-2.5-flash' }
  ];

  let lastError = null;

  for (const config of attemptConfigs) {
    try {
      const url = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${apiKeyState}`;
      console.log(`Attempting Gemini API call: Version=${config.version}, Model=${config.model}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          console.log(`Gemini API connection successful using model: ${config.model} (${config.version})`);
          return {
            text: data.candidates[0].content.parts[0].text,
            usage: data.usageMetadata || null
          };
        }
      } else {
        const errorData = await response.json();
        console.warn(`Failed configuration: ${config.model} (${config.version}) - ${errorData.error?.message}`);
        lastError = new Error(errorData.error?.message || "GenerateContent failed");
      }
    } catch (err) {
      console.warn(`Network error for configuration: ${config.model} (${config.version}) - ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to contact Gemini API with all fallback configurations.");
}

// Handle sending message
async function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  const history = getChatHistory();
  history.push({
    role: 'user',
    parts: [{ text: text }]
  });
  
  saveChatHistory(history);
  renderChatHistory();
  
  chatInput.value = '';
  chatInput.style.height = '48px';
  chatInput.setAttribute('disabled', 'true');
  btnSend.setAttribute('disabled', 'true');
  
  typingIndicator.style.display = 'flex';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const result = await callGeminiApi(history);
    const aiRawResponse = result.text;
    const usage = result.usage;

    if (usage) {
      updateTokenUsage(usage);
    }
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiRawResponse);
    } catch (e) {
      console.warn("API response was not clean JSON, trying to clean up markdown blocks.", e);
      const cleanedText = aiRawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResponse = JSON.parse(cleanedText);
    }

    history.push({
      role: 'model',
      parts: [{ text: JSON.stringify(parsedResponse) }]
    });
    saveChatHistory(history);
    
    // Extract new vocab and save to Server/localStorage
    if (parsedResponse.vocabulary && parsedResponse.vocabulary.length > 0) {
      await addVocabulary(parsedResponse.vocabulary);
    }

    renderChatHistory();

  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    showSystemAlert(`에러 발생: ${error.message}`, "error");
  } finally {
    typingIndicator.style.display = 'none';
    enableChatInput(true);
    chatInput.focus();
  }
}

// Speech Synthesis (TTS) Player Function
let currentUtterance = null;
function playTts(text, langCode) {
  // If already speaking, stop it (toggle play/stop)
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (currentUtterance && currentUtterance._originalText === text) {
      currentUtterance = null;
      return;
    }
  }

  // Preprocess text to strip contents inside parentheses (e.g. 公園(こうえん) -> 公園)
  // This avoids TTS spelling out the Hiragana/Furigana helper readings.
  let cleanText = text;
  // Strip HTML ruby tags and keep only the base text
  cleanText = cleanText.replace(/<ruby>([\s\S]*?)<rt>[\s\S]*?<\/rt><\/ruby>/gi, '$1');

  if (langCode === 'ja') {
    cleanText = cleanText
      .replace(/\([^\)]*\)/g, '')    // Remove standard brackets (こうえん)
      .replace(/（[^）]*）/g, '')    // Remove Japanese full-width brackets （こうえん）
      .replace(/\[[^\]]*\]/g, '');   // Remove square brackets [단어]
  } else {
    // English cleanup for translations or bracket explanations
    cleanText = cleanText.replace(/\[[^\]]*\]/g, '');
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance._originalText = text; // Cache original text for toggle-stop comparison
  
  if (langCode === 'en') {
    utterance.lang = 'en-US';
  } else if (langCode === 'ja') {
    utterance.lang = 'ja-JP';
  } else if (langCode === 'ko') {
    utterance.lang = 'ko-KR';
  }

  // Load and search voices
  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find(voice => 
    voice.lang.startsWith(utterance.lang) && 
    (voice.name.includes("Google") || voice.name.includes("Natural"))
  ) || voices.find(voice => voice.lang.startsWith(utterance.lang));

  if (targetVoice) {
    utterance.voice = targetVoice;
  }

  // Study rate (slightly slower for clear articulation)
  utterance.rate = 0.92;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

// Load/Save Token counters per language session
function loadTokenCount() {
  const savedTotal = localStorage.getItem(`lingotutor_tokens_${currentLang}`);
  totalSessionTokens = savedTotal ? parseInt(savedTotal, 10) : 0;
  
  const savedLast = localStorage.getItem(`lingotutor_last_tokens_${currentLang}`);
  const lastTokens = savedLast ? parseInt(savedLast, 10) : 0;
  
  updateTokenUI(lastTokens, totalSessionTokens);
}

function updateTokenUI(last, total) {
  if (lblLastTokens) lblLastTokens.innerText = `${last.toLocaleString()} tkn`;
  if (lblTotalTokens) lblTotalTokens.innerText = `${total.toLocaleString()} / 1M`;
}

function updateTokenUsage(usage) {
  const lastTokens = usage.totalTokenCount || 0; // Total tokens in the latest API transaction
  
  // Since we send the entire chat history in each stateless request, 
  // the latest API call's totalTokenCount IS the cumulative session token usage!
  totalSessionTokens = lastTokens; 
  
  localStorage.setItem(`lingotutor_tokens_${currentLang}`, totalSessionTokens);
  localStorage.setItem(`lingotutor_last_tokens_${currentLang}`, lastTokens);
  
  updateTokenUI(lastTokens, totalSessionTokens);
}

// Generate and Download Human-readable Chat Diary File (.txt)
function handleDownloadChat() {
  const history = getChatHistory();
  if (history.length <= 1) {
    showSystemAlert("백업할 대화 기록이 충분하지 않습니다.", "warning");
    return;
  }

  const modeName = currentLang === 'en' ? '영어 학습 모드' : '일본어 학습 모드';
  const now = new Date();
  const dateStr = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
                  String(now.getMinutes()).padStart(2, '0');

  // Build File Header
  let fileContent = '';
  fileContent += `==================================================\n`;
  fileContent += ` 📝 LingoTutor 대화 및 학습 일기장 백업 (${modeName})\n`;
  fileContent += ` 백업 일시: ${dateStr} ${timeStr}\n`;
  fileContent += `==================================================\n\n`;

  history.forEach((msg, idx) => {
    // Skip the system welcome prompt if we want, but keeping welcome message is fine.
    const isUser = msg.role === 'user';
    
    if (isUser) {
      fileContent += `[나] ---------------------------------------------\n`;
      fileContent += `${msg.parts[0].text}\n`;
      if (msg.note) {
        fileContent += `📝 메모: ${msg.note}\n`;
      }
      fileContent += `\n`;
    } else {
      fileContent += `[AI 튜터 🤖] --------------------------------------\n`;
      try {
        const parsed = JSON.parse(msg.parts[0].text);
        
        // 1. Reply
        fileContent += `${formatRubyForTxt(parsed.reply || "")}\n\n`;
        
        // 2. Translation
        if (parsed.translation) {
          fileContent += `* 한국어 번역:\n  ${formatRubyForTxt(parsed.translation)}\n\n`;
        }

        // 3. Corrections
        if (parsed.corrections && parsed.corrections.length > 0) {
          fileContent += `* 문법 교정 및 피드백:\n`;
          parsed.corrections.forEach(corr => {
            fileContent += `  - 원래 문장: ${formatRubyForTxt(corr.original)}\n`;
            fileContent += `  - 교정 문장: ${formatRubyForTxt(corr.corrected)}\n`;
            if (corr.explanation) {
              fileContent += `  - 설명: ${formatRubyForTxt(corr.explanation)}\n`;
            }
            fileContent += `\n`;
          });
        }

        // 4. Vocabulary
        if (parsed.vocabulary && parsed.vocabulary.length > 0) {
          fileContent += `* 오늘 등장한 추천 단어:\n`;
          parsed.vocabulary.forEach(vocab => {
            fileContent += `  - ${formatRubyForTxt(vocab.translated)} (${vocab.korean}) ${vocab.pronunciation ? `[${vocab.pronunciation}]` : ''}\n`;
            if (vocab.example) {
              fileContent += `    예문: ${formatRubyForTxt(vocab.example)}\n`;
            }
          });
          fileContent += `\n`;
        }

      } catch (e) {
        // Fallback for raw text response
        fileContent += `${formatRubyForTxt(msg.parts[0].text)}\n\n`;
      }
      fileContent += `==================================================\n\n`;
    }
  });

  // Trigger File Download in Browser
  try {
    // UTF-8 BOM is prepended to ensure Notepad handles Korean/Japanese characters without encoding glitches
    const blob = new Blob(['\ufeff' + fileContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const safeModeName = currentLang === 'en' ? 'english' : 'japanese';
    link.setAttribute('download', `lingotutor_diary_${safeModeName}_${dateStr.replace(/-/g, '')}.txt`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSystemAlert("대화 기록 백업 파일(.txt)이 저장되었습니다.", "success");
  } catch (err) {
    showSystemAlert("백업 파일 생성에 실패했습니다.", "error");
    console.error(err);
  }
}

// Speech Recognition (STT) Functions
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech Recognition API is not supported in this browser.");
    const btnMic = document.getElementById('btnMic');
    const btnMicLang = document.getElementById('btnMicLang');
    if (btnMic) btnMic.style.display = 'none';
    if (btnMicLang) btnMicLang.style.display = 'none';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = micLanguage;

  recognition.onstart = () => {
    isRecording = true;
    const btnMic = document.getElementById('btnMic');
    if (btnMic) {
      btnMic.classList.add('recording');
      btnMic.innerHTML = `<i data-lucide="mic-off" style="width: 18px; height: 18px;"></i>`;
      lucide.createIcons();
    }
    const currentLangText = micLanguage === 'ko-KR' ? '한국어' : (currentLang === 'en' ? '영어' : '일본어');
    showSystemAlert(`음성 인식을 시작합니다 (${currentLangText}). 말씀해 주세요.`, "success");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript) {
      const startPos = chatInput.selectionStart;
      const endPos = chatInput.selectionEnd;
      const originalText = chatInput.value;
      
      const newText = originalText.substring(0, startPos) + transcript + originalText.substring(endPos);
      chatInput.value = newText;
      
      // Auto resize textarea
      chatInput.style.height = 'auto';
      chatInput.style.height = chatInput.scrollHeight + 'px';
      
      chatInput.selectionStart = chatInput.selectionEnd = startPos + transcript.length;
      chatInput.focus();
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (event.error === 'not-allowed') {
      showSystemAlert("마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.", "error");
    } else if (event.error !== 'no-speech') {
      showSystemAlert(`음성 인식 오류: ${event.error}`, "error");
    }
    stopRecording();
  };

  recognition.onend = () => {
    stopRecording();
  };
}

function startRecording() {
  if (!recognition) {
    initSpeechRecognition();
  }
  if (!recognition) return;

  recognition.lang = micLanguage;
  try {
    recognition.start();
  } catch (err) {
    console.error("Failed to start speech recognition:", err);
  }
}

function stopRecording() {
  isRecording = false;
  const btnMic = document.getElementById('btnMic');
  if (btnMic) {
    btnMic.classList.remove('recording');
    btnMic.innerHTML = `<i data-lucide="mic" style="width: 18px; height: 18px;"></i>`;
    lucide.createIcons();
  }
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      // already stopped
    }
  }
}

function toggleMicLanguage() {
  const btnMicLang = document.getElementById('btnMicLang');
  if (!btnMicLang) return;

  if (currentLang === 'en') {
    if (micLanguage === 'ko-KR') {
      micLanguage = 'en-US';
      btnMicLang.innerText = 'EN';
      showSystemAlert("음성 인식 언어가 영어(US)로 설정되었습니다.", "success");
    } else {
      micLanguage = 'ko-KR';
      btnMicLang.innerText = 'KO';
      showSystemAlert("음성 인식 언어가 한국어로 설정되었습니다.", "success");
    }
  } else if (currentLang === 'ja') {
    if (micLanguage === 'ko-KR') {
      micLanguage = 'ja-JP';
      btnMicLang.innerText = 'JA';
      showSystemAlert("음성 인식 언어가 일본어로 설정되었습니다.", "success");
    } else {
      micLanguage = 'ko-KR';
      btnMicLang.innerText = 'KO';
      showSystemAlert("음성 인식 언어가 한국어로 설정되었습니다.", "success");
    }
  }
}

// Real-time Free Translator API (Uses MyMemory API, 0 Gemini tokens consumed!)
async function callFreeTranslateApi(text, direction) {
  let langpair = "";
  if (direction === 'ko-to-target') {
    langpair = currentLang === 'en' ? 'ko|en' : 'ko|ja';
  } else {
    langpair = currentLang === 'en' ? 'en|ko' : 'ja|ko';
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.responseData && data.responseData.translatedText) {
      // Decode HTML entities if returned
      const parser = new DOMParser();
      const decodedText = parser.parseFromString(data.responseData.translatedText, 'text/html').body.textContent;
      return decodedText;
    } else {
      throw new Error("Translation content not found in response.");
    }
  } catch (err) {
    console.error("Free Translation API Error, falling back to Google Translate web link:", err);
    const targetLangCode = currentLang === 'en' ? 'en' : 'ja';
    const sourceLang = direction === 'ko-to-target' ? 'ko' : targetLangCode;
    const targetLang = direction === 'ko-to-target' ? targetLangCode : 'ko';
    const fallbackUrl = `https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate`;
    return `[무료 API 호출 한계 초과 등으로 번역 실패]\n대신 아래 구글 번역 링크를 클릭하여 확인하실 수 있습니다:\n\n👉 구글 번역에서 보기: ${fallbackUrl}`;
  }
}
