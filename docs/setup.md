# Windows setup

Install [Ollama](https://ollama.com/download), then open a terminal and download the local model:

```powershell
ollama pull llama3.2:3b
```

From the project root, create the Python environment and install the backend dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

The browser-based assistant does not require LiveKit. To install the optional LiveKit agent dependencies, run:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-livekit.txt
```

Start the backend in one terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8001
```

Start the existing static frontend in a second terminal:

```powershell
python -m http.server 5500 --directory frontend
```

Open <http://127.0.0.1:5500>. The backend runs on <http://127.0.0.1:8001> to avoid conflicting with another service on port 8000. Chats and settings are saved in this browser. Search and select a saved chat in the sidebar to reopen it; plain-text/code attachments (up to 16 KB total) are sent to the local model.

## Choose an AI provider

The default provider is local Ollama. To use Groq, get an API key from [Groq Console](https://console.groq.com/keys), then set these values in the project `.env` file:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=your-groq-key
GROQ_MODEL=openai/gpt-oss-20b
```

Keep the real key only in `.env`; never commit it or share it in chat. Restart the backend after changing `.env`. Chat text and recognized voice transcripts are sent to the selected provider for replies. Groq's model availability and usage limits depend on the Groq account.

GPT is also available through the OpenAI API and requires a separate OpenAI API key and account with API usage enabled. To use it, set `AI_PROVIDER=openai`, `OPENAI_API_KEY=your-openai-key`, and `OPENAI_MODEL=gpt-4o-mini` in `.env`. API usage may incur charges. Without a valid key for the selected provider, the backend reports a configuration error instead of silently switching providers.

Select **Urdu** in Settings if you want to speak Urdu, then choose **Start Voice Call** and allow microphone access when prompted. The call screen listens, shows a live transcript, speaks the assistant's replies, and resumes listening after each reply. Mute and Speaker control the microphone and spoken replies. Voice input uses the browser's Web Speech API (supported best in current Chrome or Edge); browser speech recognition may require internet access. Speech output uses an installed system voice for the selected language. The call runs in the browser; it is not a connection to a telephone number.

Ollama generation runs locally. Its installed model must fit in available system memory; the app limits context and batch size to reduce memory use. If Ollama reports that it cannot allocate memory, close memory-heavy applications and retry. For a smaller model, install one (for example `ollama pull llama3.2:1b`), then set `$env:OLLAMA_MODEL = "llama3.2:1b"` in the backend terminal before starting Uvicorn. If `/api/generate` says `llama-server binary not found`, repair or reinstall Ollama; pulling the model alone does not repair an incomplete Ollama installation.

The optional LiveKit agent additionally needs the existing LiveKit project credentials and compatible inference access configured in the environment before running `backend/app/agent.py`. Do not commit those secrets.