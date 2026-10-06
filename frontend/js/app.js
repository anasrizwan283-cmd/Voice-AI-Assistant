const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const typingIndicator = document.getElementById("typingIndicator");
const attachBtn = document.getElementById("attachBtn");
const toggleSidebar = document.getElementById("toggleSidebar");
const mobileToggle = document.getElementById("mobileToggle");
const sidebar = document.getElementById("sidebar");
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
const searchChats = document.getElementById("searchChats");
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

const API_URL = "http://127.0.0.1:8001/chat";

let isMuted = false;
let isSpeakerOn = true;
let callActive = false;
let callTimerInterval = null;
let callSeconds = 0;
let animationsEnabled = true;
let recognition = null;
let isListening = false;
let speechRecognitionPermissionDenied = false;
let speechUtterance = null;

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

function addMessage(text, role = "ai", animate = false) {
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
                copyBtn.textContent = "Retry";
            }
        });
        bubble.appendChild(copyBtn);

        const regenBtn = document.createElement("button");
        regenBtn.type = "button";
        regenBtn.textContent = "↺ Regenerate";
        regenBtn.addEventListener("click", () => {
            sendMessage(text);
        });
        actions.appendChild(regenBtn);

        const likeBtn = document.createElement("button");
        likeBtn.type = "button";
        likeBtn.textContent = "👍";
        likeBtn.addEventListener("click", () => {
            likeBtn.textContent = "👍";
        });
        actions.appendChild(likeBtn);

        const dislikeBtn = document.createElement("button");
        dislikeBtn.type = "button";
        dislikeBtn.textContent = "👎";
        actions.appendChild(dislikeBtn);
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
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    callActive = true;
    heroPanel.classList.add("hidden");
    callScreen.classList.remove("hidden");
    callTimer.textContent = "00:00";
    callSeconds = 0;
    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(updateTimer, 1000);
    setCallUIState("Listening");
}

function endCallSession() {
    callActive = false;
    clearInterval(callTimerInterval);
    callScreen.classList.add("hidden");
    heroPanel.classList.remove("hidden");
    callTimer.textContent = "00:00";
    setCallUIState("Ready");
    isMuted = false;
    isSpeakerOn = true;
    muteBtn.textContent = "🔇 Mute";
    speakerBtn.textContent = "🔊 Speaker";
}

function setMuteState() {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? "🔈 Unmute" : "🔇 Mute";
    callStatus.textContent = isMuted ? "Muted" : "Listening";
    callStateLabel.textContent = isMuted ? "Muted" : "Listening";
}

function setSpeakerState() {
    isSpeakerOn = !isSpeakerOn;
    speakerBtn.textContent = isSpeakerOn ? "🔊 Speaker" : "🔈 Speaker";
    callStatus.textContent = isSpeakerOn ? "Speaking" : "Speaker Off";
    callStateLabel.textContent = isSpeakerOn ? "Speaking" : "Speaker Off";
}

function openSettings() {
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
    if (!text || !("speechSynthesis" in window)) {
        return;
    }

    // Stop previous voice if already speaking
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    speechUtterance = new SpeechSynthesisUtterance(text);

    speechUtterance.lang = "en-US";
    speechUtterance.rate = 1;
    speechUtterance.pitch = 1;
    speechUtterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const preferredVoice =
        voices.find(v => v.name.includes("Google")) ||
        voices.find(v => v.lang.startsWith("en")) ||
        voices[0];

    if (preferredVoice) {
        speechUtterance.voice = preferredVoice;
    }

    speechUtterance.onstart = () => {
        setCallUIState("Speaking");
    };

    speechUtterance.onend = () => {
        setCallUIState(callActive ? "Listening" : "Ready");

        // Auto listen again after AI finishes speaking
        if (callActive && !speechRecognitionPermissionDenied) {
            setTimeout(() => {
                if (!isListening && !speechRecognitionPermissionDenied) {
                    startVoiceRecognition();
                }
            }, 500);
        }
    };

    speechUtterance.onerror = () => {
        setCallUIState(callActive ? "Listening" : "Ready");

        if (callActive && !speechRecognitionPermissionDenied) {
            setTimeout(() => {
                if (!isListening && !speechRecognitionPermissionDenied) {
                    startVoiceRecognition();
                }
            }, 500);
        }
    };

    window.speechSynthesis.speak(speechUtterance);
}

function stopVoiceRecognition() {
    isListening = false;
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
        addMessage("Voice input is not supported in this browser.", "ai", true);
        return;
    }

    if (speechRecognitionPermissionDenied) {
        return;
    }

    if (isListening) {
        return;
    }

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add("listening");
        micBtn.textContent = "🎙️";
        messageInput.placeholder = "Listening...";
        setCallUIState("Listening");
    };

    recognition.onresult = (event) => {

        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(" ")
            .trim();

        if (transcript) {
            messageInput.value = transcript;
        }

        const latest = event.results[event.results.length - 1];

        if (latest.isFinal && transcript) {

            // Voice Commands
            const command = transcript.toLowerCase();

            if (command.includes("stop listening")) {
                recognition.stop();
                return;
            }

            if (command.includes("cancel")) {
                messageInput.value = "";
                return;
            }

            if (command.includes("stop speaking")) {
                window.speechSynthesis.cancel();
                return;
            }

            if (command.includes("end call")) {
                endCallSession();
                return;
            }

            sendMessage(transcript);
        }

    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        stopVoiceRecognition();

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            speechRecognitionPermissionDenied = true;
            addMessage(
                "Microphone access is blocked. Allow microphone access for this site in your browser settings, then try again.",
                "ai",
                true
            );
        }

    };

    recognition.onend = () => {

        stopVoiceRecognition();

        // Auto restart while call is active
        if (callActive && !speechRecognitionPermissionDenied) {

            setTimeout(() => {

                if (!isListening && !speechRecognitionPermissionDenied) {

                    startVoiceRecognition();

                }

            }, 600);

        }

    };

    try {

        recognition.start();

    } catch (e) {

        stopVoiceRecognition();

    }

}
async function sendMessage(messageText) {

    const trimmed = messageText.trim();

    if (!trimmed) {
        return;
    }

    // Agar AI bol rahi ho to usko stop kar do
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    addMessage(trimmed, "user");

    // Live Transcript
    const transcriptBox = document.getElementById("callTranscript");
    if (transcriptBox) {
        transcriptBox.innerHTML += `
            <div class="transcript-line user">
                You: ${trimmed}
            </div>
        `;
        transcriptBox.scrollTop = transcriptBox.scrollHeight;
    }

    messageInput.value = "";

    setTyping(true);

    setCallUIState("Thinking");

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: trimmed
            })

        });

        const data = await response.json();

      const reply = data.reply || "Sorry, I couldn't get a response.";
        addMessage(reply, "ai", true);

        // Live Transcript
        if (transcriptBox) {

            transcriptBox.innerHTML += `
                <div class="transcript-line ai">
                    AI: ${reply}
                </div>
            `;

            transcriptBox.scrollTop =
                transcriptBox.scrollHeight;

        }

        // AI Voice
        speakText(reply);

    }

    catch (error) {

        console.error(error);

        addMessage(
            "Sorry, I couldn't connect to the assistant.",
            "ai",
            true
        );

    }

    finally {

        setTyping(false);

        if (!callActive) {

            setCallUIState("Ready");

        }

    }

}
chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(messageInput.value);
});

sendBtn.addEventListener("click", () => {
    sendMessage(messageInput.value);
});

micBtn.addEventListener("click", () => {
    speechRecognitionPermissionDenied = false;
    startVoiceRecognition();
});

attachBtn.addEventListener("click", () => {
    addMessage("Attachment support is ready for future enhancement.", "ai", true);
});

newChatBtn.addEventListener("click", () => {
    chatMessages.innerHTML = "";
    addMessage("A fresh conversation is ready. Ask me anything.", "ai", true);
});

newCallBtn.addEventListener("click", () => {
    startCallSession();
    addMessage("Voice call mode activated. The telephony backend can be connected here later.", "ai", true);
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
});

accentSelect.addEventListener("change", (event) => {
    setAccent(event.target.value);
});

voiceSelect.addEventListener("change", () => {
    addMessage("Voice profile updated for the next session.", "ai", true);
});

languageSelect.addEventListener("change", () => {
    addMessage("Language preference updated.", "ai", true);
});

animationToggle.addEventListener("change", (event) => {
    toggleAnimations(event.target.checked);
});

soundToggle.addEventListener("change", () => {
    addMessage("Sound preferences updated.", "ai", true);
});

searchChats.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    document.querySelectorAll(".history-item").forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? "block" : "none";
    });
});

toggleSidebar.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});

mobileToggle.addEventListener("click", () => {
    sidebar.classList.toggle("show");
});

messageInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        sendMessage(messageInput.value);
    }
    if (event.key === "Escape") {
        messageInput.value = "";
    }
});

messageInput.focus();