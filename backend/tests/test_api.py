from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_endpoint_returns_reply(monkeypatch):
    monkeypatch.setattr("backend.app.api.chat.get_ai_response", lambda message: "Hello back")

    response = client.post(
        "/chat",
        json={"message": "Hello"},
    )
    assert response.status_code == 200
    assert response.json() == {"reply": "Hello back"}


def test_chat_endpoint_reports_ollama_memory_error(monkeypatch):
    import requests

    monkeypatch.setattr("backend.app.api.chat.AI_PROVIDER", "ollama")
    response = requests.Response()
    response.status_code = 500
    response._content = b'{"error":"failed to allocate CPU buffer"}'

    def fail_generation(message):
        raise requests.HTTPError("Ollama returned HTTP 500", response=response)

    monkeypatch.setattr("backend.app.api.chat.get_ai_response", fail_generation)
    result = client.post("/chat", json={"message": "Hello"})

    assert result.status_code == 503
    assert "does not have enough available memory" in result.json()["detail"]


def test_chat_endpoint_reports_missing_provider_key(monkeypatch):
    from backend.app.services.ai_errors import AIConfigurationError

    def fail_generation(message):
        raise AIConfigurationError("GROQ_API_KEY is missing.")

    monkeypatch.setattr("backend.app.api.chat.get_ai_response", fail_generation)
    response = client.post("/chat", json={"message": "Hello"})

    assert response.status_code == 503
    assert response.json() == {"detail": "GROQ_API_KEY is missing."}
