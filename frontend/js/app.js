const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const micBtn = document.getElementById("micBtn");
const typingIndicator = document.getElementById("typingIndicator");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");
const attachmentStatus = document.getElementById("attachmentStatus");
const toggleSidebar = document.getElementById("toggleSidebar");
const mobileToggle = document.getElementById("mobileToggle");
const sidebar = document.getElementById("sidebar");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("searchChats");
const newChatBtn = document.getElementById("newChatBtn");
const newCallBtn = document.getElementById("newCallBtn");
const settingsBtn = document.getElementById("settingsBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const settingsModal = document.getElementById("settingsModal");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const themeSelect = document.getElementById("themeSelect");
const accentSelect = document.getElementById("accentSelect");
const voiceSelect = document.getElementById("voiceSelect");
const languageSelect = document.getElementById("languageSelect");
const animationToggle = document.getElementById("animationToggle");
const soundToggle = document.getElementById("soundToggle");
const callTrigger = document.getElementById("callTrigger");
const callScreen = document.getElementById("callScreen");
const heroPanel = document.getElementById("heroPanel");
const callStatus = document.getElementById("callStatus");
const callTimer = document.getElementById("callTimer");
const callStateLabel = document.getElementById("callStateLabel");
const muteBtn = document.getElementById("muteBtn");
const endCallBtn = document.getElementById("endCallBtn");
const speakerBtn = document.getElementById("speakerBtn");
const waveform = document.getElementById("waveform");
const callBadge = document.getElementById("callBadge");
const micStatePill = document.getElementById("micStatePill");
const speakerStatePill = document.getElementById("speakerStatePill");

const API_URL = "http://127.0.0.1:8001/chat";
const CONVERSATIONS_STORAGE_KEY = "voice-ai-conversations";
const SETTINGS_STORAGE_KEY = "voice-ai-settings";
const MAX_ATTACHMENT_BYTES = 16 * 1024;
const WELCOME_MESSAGE = "Hello! I’m your premium Voice AI Assistant. Ask me anything or start a live call.";

let isMuted = false;
let isSpeakerOn = true;
let soundEnabled = soundToggle.checked;
let callActive = false;
let callTimerInterval = null;
let callSeconds = 0;
let animationsEnabled = true;
let recognition = null;
let isListening = false;
let isRecognitionStarting = false;
let speechRecognitionPermissionDenied = false;
let speechUtterance = null;
let isProcessingMessage = false;
let pendingAttachments = [];
let conversations = loadConversations();
let activeConversationId = conversations[0].id;

const speechLanguages = {
    en: "en-US",
    ur: "ur-PK",
    fr: "fr-FR",
    de: "de-DE"
};

function createWelcomeConversation() {
    return {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "Welcome Session",
        updatedAt: Date.now(),
        messages: [{ role: "ai", text: WELCOME_MESSAGE }]
    };
}

function loadConversations() {
    try {
        const stored = JSON.parse(localStorage.getItem(CONVERSATIONS_STORAGE_KEY) || "null");
        if (
            Array.isArray(stored) &&
            stored.length > 0 &&
            stored.every(conversation =>
                typeof conversation.id === "string" &&
                typeof conversation.title === "string" &&
                Array.isArray(conversation.messages) &&
                conversation.messages.every(message =>
                    ["ai", "user"].includes(message.role) &&
                    typeof message.text === "string" &&
                    (message.requestText === undefined || typeof message.requestText === "string")
                )
            )
        ) {
            return stored;
        }
    } catch (error) {
        console.error("Could not load saved conversations:", error);
    }
    return [createWelcomeConversation()];
}

function saveConversations() {
    try {
        localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
        console.error("Could not save conversations in this browser:", error);
    }
}

function getActiveConversation() {
    return conversations.find(conversation => conversation.id === activeConversationId);
}

function saveSettings() {
    const settings = {
        theme: themeSelect.value,
        accent: accentSelect.value,
        voice: voiceSelect.value,
        language: languageSelect.value,
        animations: animationToggle.checked,
        sound: soundToggle.checked
    };
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Could not save assistant settings in this browser:", error);
    }
}

function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
        if (["dark", "light"].includes(settings.theme)) {
            themeSelect.value = settings.theme;
        }
        if (["blue", "violet", "cyan"].includes(settings.accent)) {
            accentSelect.value = settings.accent;
        }
        if (["nova", "aria", "atlas"].includes(settings.voice)) {
            voiceSelect.value = settings.voice;
        }
        if (Object.hasOwn(speechLanguages, settings.language)) {
            languageSelect.value = settings.language;
        }
        if (typeof settings.animations === "boolean") {
            animationToggle.checked = settings.animations;
        }
        if (typeof settings.sound === "boolean") {
            soundToggle.checked = settings.sound;
        }
    } catch (error) {
        console.error("Could not load saved assistant settings:", error);
    }
    document.body.classList.toggle("light-mode", themeSelect.value === "light");
    setAccent(accentSelect.value);
    toggleAnimations(animationToggle.checked);
    soundEnabled = soundToggle.checked;
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
}

function formatMessage(text) {
    const escaped = escapeHtml(text);
    const withCodeBlocks = escaped.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    const withInlineCode = withCodeBlocks.replace(/`([^`]+)`/g, "<code>$1</code>");
    const withBold = withInlineCode.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    const withItalic = withBold.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return withItalic.replace(/\n/g, "<br>");
}

function renderHistory() {
    const query = historySearch.value.trim().toLocaleLowerCase();
    historyList.replaceChildren();

    const matches = [...conversations]
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .filter(conversation => {
            const searchable = `${conversation.title} ${conversation.messages.map(message => message.text).join(" ")}`;
            return searchable.toLocaleLowerCase().includes(query);
        });

    matches.forEach(conversation => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = `history-item${conversation.id === activeConversationId ? " active" : ""}`;
            item.textContent = conversation.title;
            item.setAttribute("aria-pressed", String(conversation.id === activeConversationId));
            item.addEventListener("click", () => {
                activeConversationId = conversation.id;
                renderConversation();
                closeMobileSidebar();
            });
            historyList.appendChild(item);
        });
    if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "history-empty";
        empty.textContent = "No chats found.";
        historyList.appendChild(empty);
    }
}

function renderConversation() {
    chatMessages.replaceChildren();
    const conversation = getActiveConversation();
    if (conversation) {
        conversation.messages.forEach(message => {
            addMessage(message.text, message.role, false, { save: false, record: message });
        });
    }
    renderHistory();
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(text, role = "ai", animate = false, options = {}) {
    const conversationId = options.conversationId || activeConversationId;
    const conversation = conversations.find(item => item.id === conversationId);
    const record = options.record || { role, text, feedback: null };
    if (options.save !== false && conversation) {
        conversation.messages.push(record);
        if (role === "user" && conversation.title === "New Chat") {
            conversation.title = text.trim().replace(/\s+/g, " ").slice(0, 36) || "New Chat";
        }
        conversation.updatedAt = Date.now();
        saveConversations();
        renderHistory();
    }

    const messageWrapper = document.createElement("div");
    messageWrapper.className = `message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = role === "user" ? "You • now" : "Nova • now";

    const content = document.createElement("div");
    content.className = "message-content";

    if (animate && role === "ai" && animationsEnabled) {
        const stream = document.createElement("span");
        stream.className = "streaming-text";
        content.appendChild(stream);
        bubble.classList.add("streaming");
        let index = 0;
        const tick = () => {
            if (index < text.length) {
                stream.textContent += text[index];
                index += 1;
                setTimeout(tick, 18);
            } else {
                bubble.classList.remove("streaming");
            }
        };
        tick();
    } else {
        content.innerHTML = formatMessage(text);
    }

    bubble.appendChild(meta);
    bubble.appendChild(content);

    const actions = document.createElement("div");
    actions.className = "message-actions";

    if (role === "ai") {
        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-btn";
        copyBtn.type = "button";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.textContent = "Copied";
                setTimeout(() => {
                    copyBtn.textContent = "Copy";
                }, 1200);
            } catch (error) {
                console.error("Could not copy the assistant reply:", error);
                copyBtn.textContent = "Copy failed";
                setTimeout(() => {
                    copyBtn.textContent = "Copy";
                }, 1800);
            }
        });
        bubble.appendChild(copyBtn);

        const regenBtn = document.createElement("button");
        regenBtn.type = "button";
        regenBtn.textContent = "↺ Regenerate";
        regenBtn.addEventListener("click", () => {
            regenerateLastReply(conversationId);
        });
        actions.appendChild(regenBtn);

        const likeBtn = document.createElement("button");
        likeBtn.type = "button";
        likeBtn.textContent = "👍";
        likeBtn.setAttribute("aria-label", "Like this reply");
        likeBtn.addEventListener("click", () => setMessageFeedback(record, "like", likeBtn, dislikeBtn));
        actions.appendChild(likeBtn);

        const dislikeBtn = document.createElement("button");
        dislikeBtn.type = "button";
        dislikeBtn.textContent = "👎";
        dislikeBtn.setAttribute("aria-label", "Dislike this reply");
        dislikeBtn.addEventListener("click", () => setMessageFeedback(record, "dislike", dislikeBtn, likeBtn));
        actions.appendChild(dislikeBtn);
        likeBtn.classList.toggle("selected", record.feedback === "like");
        dislikeBtn.classList.toggle("selected", record.feedback === "dislike");
        likeBtn.setAttribute("aria-pressed", String(record.feedback === "like"));
        dislikeBtn.setAttribute("aria-pressed", String(record.feedback === "dislike"));
    }

    if (role === "user") {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "✎ Edit";
        editBtn.addEventListener("click", () => {
            messageInput.value = text;
            messageInput.focus();
        });
        actions.appendChild(editBtn);
    }

    bubble.appendChild(actions);
    messageWrapper.appendChild(bubble);
    if (conversationId === activeConversationId) {
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    return messageWrapper;
}

function setMessageFeedback(record, feedback, selectedButton, otherButton) {
    record.feedback = record.feedback === feedback ? null : feedback;
    const selected = record.feedback === feedback;
    selectedButton.classList.toggle("selected", selected);
    selectedButton.setAttribute("aria-pressed", String(selected));
    otherButton.classList.remove("selected");
    otherButton.setAttribute("aria-pressed", "false");
    saveConversations();
}

function regenerateLastReply(conversationId) {
    const conversation = conversations.find(item => item.id === conversationId);
    if (!conversation || isProcessingMessage) {
        return;
    }
    const lastUserMessage = [...conversation.messages].reverse().find(message => message.role === "user");
    if (!lastUserMessage) {
        addMessage("Send a message before regenerating a reply.", "ai", true, { conversationId });
        return;
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage && lastMessage.role === "ai") {
        conversation.messages.pop();
        saveConversations();
        if (conversationId === activeConversationId) {
            renderConversation();
        }
    }
    sendMessage(lastUserMessage.requestText || lastUserMessage.text, { regenerate: true, conversationId });
}

function closeMobileSidebar() {
    if (window.matchMedia("(max-width: 640px)").matches) {
        sidebar.classList.remove("show");
    }
}

function setTyping(isTyping) {
    typingIndicator.classList.toggle("hidden", !isTyping);
    if (isTyping) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function updateTimer() {
    callSeconds += 1;
    const minutes = String(Math.floor(callSeconds / 60)).padStart(2, "0");
    const seconds = String(callSeconds % 60).padStart(2, "0");
    callTimer.textContent = `${minutes}:${seconds}`;
}

function startCallSession() {
    if (callActive) {
        return;
    }

    callActive = true;
    isMuted = false;
    isSpeakerOn = true;
    speechRecognitionPermissionDenied = false;
    heroPanel.classList.add("hidden");
    callScreen.classList.remove("hidden");
    document.getElementById("callTranscript").replaceChildren();
    updateCallControlStatus();
    callTimer.textContent = "00:00";
    callSeconds = 0;
    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(updateTimer, 1000);
    setCallUIState("Listening");
    startVoiceRecognition();
    appendCallTranscript("ai", "Call connected. You can speak now.");
    speakText("Hello, I'm Nova. How can I help you?");
}

function endCallSession() {
    callActive = false;
    clearInterval(callTimerInterval);
    if (recognition && (isListening || isRecognitionStarting)) {
        recognition.stop();
    }
    isListening = false;
    isRecognitionStarting = false;
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    callScreen.classList.add("hidden");
    heroPanel.classList.remove("hidden");
    callTimer.textContent = "00:00";
    setCallUIState("Ready");
    isMuted = false;
    isSpeakerOn = true;
    muteBtn.textContent = "🔇 Mute";
    speakerBtn.textContent = "🔊 Speaker";
    updateCallControlStatus();
}

function setMuteState() {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? "🔈 Unmute" : "🔇 Mute";
    updateCallControlStatus();
    if (isMuted) {
        if (recognition && (isListening || isRecognitionStarting)) {
            recognition.stop();
        }
    } else {
        speechRecognitionPermissionDenied = false;
        startVoiceRecognition();
    }
}

function setSpeakerState() {
    isSpeakerOn = !isSpeakerOn;
    speakerBtn.textContent = isSpeakerOn ? "🔊 Speaker" : "🔈 Speaker";
    if (!isSpeakerOn) {
        cancelSpeech();
    }
    updateCallControlStatus();
}

function updateCallControlStatus() {
    micStatePill.textContent = isMuted ? "🎤 Mic Muted" : "🎤 Mic On";
    micStatePill.classList.toggle("active", !isMuted);
    speakerStatePill.textContent = isSpeakerOn ? "🔊 Speaker On" : "🔇 Speaker Off";
    speakerStatePill.classList.toggle("active", isSpeakerOn);
    if (isMuted) {
        callStatus.textContent = "Muted";
        callStateLabel.textContent = "Muted";
    } else if (!isSpeakerOn) {
        callStatus.textContent = "Speaker Off";
        callStateLabel.textContent = "Speaker Off";
    }
}

function openSettings() {
    closeMobileSidebar();
    settingsModal.classList.remove("hidden");
    settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettings() {
    settingsModal.classList.add("hidden");
    settingsModal.setAttribute("aria-hidden", "true");
}

function setAccent(accent) {
    const root = document.documentElement;
    if (accent === "violet") {
        root.style.setProperty("--accent", "#8a63ff");
        root.style.setProperty("--accent-2", "#4f7cff");
    } else if (accent === "cyan") {
        root.style.setProperty("--accent", "#19c8ff");
        root.style.setProperty("--accent-2", "#4cf0d2");
    } else {
        root.style.setProperty("--accent", "#4f7cff");
        root.style.setProperty("--accent-2", "#8a63ff");
    }
}

function toggleAnimations(enabled) {
    animationsEnabled = enabled;
    document.body.classList.toggle("reduced-motion", !enabled);
}

function setCallUIState(state) {
    if (!callStatus || !callStateLabel || !callBadge || !waveform) {
        return;
    }

    if (state === "Listening") {
        callStatus.textContent = "Listening";
        callStateLabel.textContent = "Listening";
        callBadge.textContent = "LIVE";
        waveform.classList.add("active");
    } else if (state === "Thinking") {
        callStatus.textContent = "Thinking";
        callStateLabel.textContent = "Thinking";
        callBadge.textContent = "THINKING";
        waveform.classList.add("active");
    } else if (state === "Speaking") {
        callStatus.textContent = "Speaking";
        callStateLabel.textContent = "Speaking";
        callBadge.textContent = "SPEAKING";
        waveform.classList.add("active");
    } else {
        callStatus.textContent = "Ready";
        callStateLabel.textContent = "Ready";
        callBadge.textContent = "IDLE";
        waveform.classList.remove("active");
    }
}
function speakText(text) {
    if (!text || !isSpeakerOn || !soundEnabled || !("speechSynthesis" in window)) {
        return;
    }

    if (callActive && recognition && (isListening || isRecognitionStarting)) {
        recognition.stop();
    }

    speechUtterance = new SpeechSynthesisUtterance(text);

    speechUtterance.lang = speechLanguages[languageSelect.value] || "en-US";
    speechUtterance.rate = 1;
    speechUtterance.pitch = 1;
    speechUtterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const voicePreferences = {
        nova: ["google", "natural"],
        aria: ["zira", "jenny", "aria", "female"],
        atlas: ["david", "guy", "mark", "male"]
    };
    const preferredName = voicePreferences[voiceSelect.value] || voicePreferences.nova;
    const preferredVoice =
        voices.find(v => v.lang.toLowerCase().startsWith(speechUtterance.lang.toLowerCase()) &&
            preferredName.some(name => v.name.toLowerCase().includes(name))) ||
        voices.find(v => v.lang.toLowerCase().startsWith(speechUtterance.lang.toLowerCase())) ||
        voices[0];

    if (preferredVoice) {
        speechUtterance.voice = preferredVoice;
    }

    speechUtterance.onstart = () => {
        setCallUIState("Speaking");
    };

    speechUtterance.onend = () => {
        resumeCallListening();
    };

    speechUtterance.onerror = () => {
        resumeCallListening();
    };

    window.speechSynthesis.speak(speechUtterance);
}

function resumeCallListening() {
    setCallUIState(callActive ? "Listening" : "Ready");
    if (callActive && !isMuted && !speechRecognitionPermissionDenied) {
        setTimeout(() => {
            if (
                callActive &&
                !isMuted &&
                !isProcessingMessage &&
                !isListening &&
                !isRecognitionStarting &&
                !isSpeechSynthesisSpeaking()
            ) {
                startVoiceRecognition();
            }
        }, 500);
    }
}

function isSpeechSynthesisSpeaking() {
    return "speechSynthesis" in window && window.speechSynthesis.speaking;
}

function cancelSpeech() {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

function stopVoiceRecognition() {
    isListening = false;
    isRecognitionStarting = false;
    micBtn.classList.remove("listening");
    micBtn.textContent = "🎤";
    messageInput.placeholder = "Ask anything...";
    if (!callActive) {
        setCallUIState("Ready");
    }
}
function startVoiceRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showVoiceError("Voice input is not supported in this browser. Try the latest version of Chrome or Edge.");
        return;
    }

    if (speechRecognitionPermissionDenied || isMuted) {
        return;
    }

    if (isListening || isRecognitionStarting) {
        return;
    }

    recognition = new SpeechRecognition();

    recognition.lang = speechLanguages[languageSelect.value] || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isRecognitionStarting = false;
        isListening = true;
        micBtn.classList.add("listening");
        micBtn.textContent = "🎙️";
        messageInput.placeholder = "Listening...";
        if (callActive) {
            setCallUIState("Listening");
        }
    };

    recognition.onresult = (event) => {
        const changedResults = Array.from(event.results).slice(event.resultIndex);
        const interimTranscript = changedResults
            .filter(result => !result.isFinal)
            .map(result => result[0].transcript)
            .join(" ")
            .trim();
        const finalTranscript = changedResults
            .filter(result => result.isFinal)
            .map(result => result[0].transcript)
            .join(" ")
            .trim();

        if (!callActive && interimTranscript) {
            messageInput.value = interimTranscript;
        }

        if (!finalTranscript) {
            return;
        }

        const command = finalTranscript.toLowerCase();
        if (command.includes("stop listening")) {
            if (callActive && !isMuted) {
                setMuteState();
            } else if (recognition) {
                recognition.stop();
            }
            return;
        }
        if (command.includes("cancel")) {
            messageInput.value = "";
            return;
        }
        if (command.includes("stop speaking")) {
            cancelSpeech();
            return;
        }
        if (command.includes("end call")) {
            endCallSession();
            return;
        }

        messageInput.value = "";
        recognition.stop();
        sendMessage(finalTranscript);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        stopVoiceRecognition();

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            speechRecognitionPermissionDenied = true;
            showVoiceError("Microphone access is blocked. Allow microphone access for this site, then unmute or restart the call.");
        } else if (event.error === "audio-capture" || event.error === "network") {
            speechRecognitionPermissionDenied = true;
            const errorMessage = event.error === "network"
                ? "Browser speech recognition needs an internet connection and is unavailable right now. You can keep the call open and type in the chat box below; replies will still be spoken."
                : "Voice recognition could not access the microphone. Check that it is connected, then unmute to retry.";
            showVoiceError(errorMessage);
        }
    };

    recognition.onend = () => {
        stopVoiceRecognition();
        if (
            callActive &&
            !isMuted &&
            !isProcessingMessage &&
            !speechRecognitionPermissionDenied &&
            !isSpeechSynthesisSpeaking()
        ) {
            setTimeout(() => {
                if (callActive && !isMuted && !isProcessingMessage && !isListening && !isRecognitionStarting) {
                    startVoiceRecognition();
                }
            }, 600);
        }
    };

    try {
        isRecognitionStarting = true;
        recognition.start();
    } catch (error) {
        console.error("Could not start speech recognition:", error);
        stopVoiceRecognition();
        if (callActive) {
            showVoiceError("Could not start the microphone. Allow microphone access for this site and try again.");
        }
    }
}

function appendCallTranscript(role, text) {
    const transcriptBox = document.getElementById("callTranscript");
    const line = document.createElement("div");
    line.className = `transcript-line ${role}`;
    line.textContent = `${role === "user" ? "You" : "AI"}: ${text}`;
    transcriptBox.appendChild(line);
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

function showVoiceError(message) {
    addMessage(message, "ai", true);
    if (callActive) {
        appendCallTranscript("ai", message);
        micStatePill.textContent = "🎤 Mic Unavailable";
        micStatePill.classList.remove("active");
        callStatus.textContent = "Voice Error";
        callStateLabel.textContent = "Check microphone";
        callBadge.textContent = "MIC ERROR";
    }
}

function updateAttachmentStatus() {
    if (!pendingAttachments.length) {
        attachmentStatus.textContent = "";
        attachmentStatus.classList.add("hidden");
        return;
    }
    attachmentStatus.textContent = `Attached: ${pendingAttachments.map(file => file.name).join(", ")} (select more to replace)`;
    attachmentStatus.classList.remove("hidden");
}

async function handleFileSelection() {
    const files = Array.from(fileInput.files || []);
    fileInput.value = "";
    if (!files.length) {
        return;
    }
    pendingAttachments = [];
    updateAttachmentStatus();

    const allowedExtensions = new Set(["txt", "md", "csv", "json", "xml", "html", "css", "js", "ts", "py", "yaml", "yml", "log", "sql"]);
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    const unsupportedFile = files.find(file => {
        const extension = file.name.split(".").pop().toLowerCase();
        return !allowedExtensions.has(extension);
    });
    if (unsupportedFile) {
        addMessage(`"${unsupportedFile.name}" is not a supported text file. Choose a text, code, CSV, or JSON file.`, "ai", true);
        return;
    }
    if (totalBytes > MAX_ATTACHMENT_BYTES) {
        addMessage("Text attachments must total 16 KB or less.", "ai", true);
        return;
    }

    try {
        pendingAttachments = await Promise.all(files.map(async file => ({
            name: file.name,
            text: await file.text()
        })));
        updateAttachmentStatus();
    } catch (error) {
        console.error("Could not read selected text files:", error);
        addMessage("I couldn't read the selected file. Try saving it as plain text and attach it again.", "ai", true);
    }
}

async function sendMessage(messageText, options = {}) {
    const conversationId = options.conversationId || activeConversationId;
    const attachments = options.regenerate ? [] : pendingAttachments;
    const trimmed = messageText.trim() || (attachments.length
        ? "Please review the attached files and help me understand them."
        : "");
    if (!trimmed || isProcessingMessage) {
        return;
    }

    const attachmentPrompt = attachments.length
        ? `\n\nAttached file contents:\n${attachments.map(file => `--- ${file.name} ---\n${file.text}`).join("\n\n")}`
        : "";
    cancelSpeech();

    isProcessingMessage = true;
    if (callActive && recognition && (isListening || isRecognitionStarting)) {
        recognition.stop();
    }

    if (!options.regenerate) {
        const visibleMessage = attachments.length
            ? `${trimmed}\n\nAttached: ${attachments.map(file => file.name).join(", ")}`
            : trimmed;
        addMessage(visibleMessage, "user", false, {
            conversationId,
            record: {
                role: "user",
                text: visibleMessage,
                requestText: `${trimmed}${attachmentPrompt}`,
                feedback: null
            }
        });
    }

    if (callActive) {
        appendCallTranscript("user", trimmed);
    }

    pendingAttachments = [];
    updateAttachmentStatus();
    messageInput.value = "";

    setTyping(true);

    if (callActive) {
        setCallUIState("Thinking");
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `${trimmed}${attachmentPrompt}`
            })
        });

        if (!response.ok) {
            let detail = "";
            try {
                const errorData = await response.json();
                detail = typeof errorData.detail === "string" ? errorData.detail : "";
            } catch (error) {
                console.error("Could not read the assistant error response:", error);
            }
            throw new Error(detail || `Assistant request failed with status ${response.status}.`);
        }

        const data = await response.json();
        if (typeof data.reply !== "string" || !data.reply.trim()) {
            throw new Error("The assistant returned an empty reply.");
        }
        const reply = data.reply.trim();
        addMessage(reply, "ai", true, { conversationId });

        if (callActive) {
            appendCallTranscript("ai", reply);
        }

        speakText(reply);
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error && error.message !== "Failed to fetch"
            ? error.message
            : "Sorry, I couldn't connect to the assistant. Check that the local backend and Ollama are running.";
        addMessage(errorMessage, "ai", true, { conversationId });
        if (callActive) {
            appendCallTranscript("ai", errorMessage);
            speakText(errorMessage);
        }
    } finally {
        isProcessingMessage = false;
        setTyping(false);
        if (callActive && !isSpeechSynthesisSpeaking()) {
            resumeCallListening();
        } else if (!callActive) {
            setCallUIState("Ready");
        }
    }
}
chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(messageInput.value);
});

micBtn.addEventListener("click", () => {
    speechRecognitionPermissionDenied = false;
    if (isListening || isRecognitionStarting) {
        if (recognition) {
            recognition.stop();
        }
    } else {
        startVoiceRecognition();
    }
});

attachBtn.addEventListener("click", () => {
    fileInput.click();
});
fileInput.addEventListener("change", handleFileSelection);

newChatBtn.addEventListener("click", () => {
    const conversation = {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "New Chat",
        updatedAt: Date.now(),
        messages: []
    };
    conversations.push(conversation);
    activeConversationId = conversation.id;
    pendingAttachments = [];
    updateAttachmentStatus();
    messageInput.value = "";
    saveConversations();
    renderConversation();
    addMessage("A fresh conversation is ready. Ask me anything.", "ai", true);
    messageInput.focus();
    closeMobileSidebar();
});

newCallBtn.addEventListener("click", () => {
    startCallSession();
});

callTrigger.addEventListener("click", () => {
    startCallSession();
});

endCallBtn.addEventListener("click", () => {
    endCallSession();
});

muteBtn.addEventListener("click", () => {
    setMuteState();
});

speakerBtn.addEventListener("click", () => {
    setSpeakerState();
});

settingsBtn.addEventListener("click", openSettings);
openSettingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsBackdrop.addEventListener("click", closeSettings);

themeSelect.addEventListener("change", (event) => {
    document.body.classList.toggle("light-mode", event.target.value === "light");
    saveSettings();
});

accentSelect.addEventListener("change", (event) => {
    setAccent(event.target.value);
    saveSettings();
});

voiceSelect.addEventListener("change", () => {
    saveSettings();
});

languageSelect.addEventListener("change", () => {
    if (callActive && recognition && (isListening || isRecognitionStarting)) {
        recognition.stop();
    }
    saveSettings();
});

animationToggle.addEventListener("change", (event) => {
    toggleAnimations(event.target.checked);
    saveSettings();
});

soundToggle.addEventListener("change", (event) => {
    soundEnabled = event.target.checked;
    if (!soundEnabled) {
        cancelSpeech();
    }
    saveSettings();
});

historySearch.addEventListener("input", renderHistory);

function toggleSidebarVisibility() {
    if (window.matchMedia("(max-width: 640px)").matches) {
        sidebar.classList.remove("collapsed");
        sidebar.classList.toggle("show");
    } else {
        sidebar.classList.remove("show");
        sidebar.classList.toggle("collapsed");
    }
}

toggleSidebar.addEventListener("click", toggleSidebarVisibility);
mobileToggle.addEventListener("click", toggleSidebarVisibility);

messageInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        sendMessage(messageInput.value);
    }
    if (event.key === "Escape") {
        messageInput.value = "";
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !settingsModal.classList.contains("hidden")) {
        closeSettings();
    }
});

loadSettings();
saveConversations();
renderConversation();
messageInput.focus();