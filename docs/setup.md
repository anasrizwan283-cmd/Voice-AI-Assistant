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

Open <http://127.0.0.1:5500>. The backend runs on <http://127.0.0.1:8001> to avoid conflicting with another service on port 8000. The browser voice input works in browsers that support the Web Speech API; allow microphone access when prompted. Browser speech output uses the system's available speech voices.

The optional LiveKit agent additionally needs the existing LiveKit project credentials and compatible inference access configured in the environment before running `backend/app/agent.py`. Do not commit those secrets.