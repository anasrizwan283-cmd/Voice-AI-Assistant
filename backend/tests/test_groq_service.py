import pytest

from backend.app.services import groq_service
from backend.app.services.ai_errors import AIProviderError


def test_groq_service_sends_chat_completion(monkeypatch):
    request = {}

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "Salam"}}]}

    def fake_post(url, **kwargs):
        request["url"] = url
        request.update(kwargs)
        return Response()

    monkeypatch.setattr(groq_service, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(groq_service, "GROQ_MODEL", "test-model")
    monkeypatch.setattr(groq_service.requests, "post", fake_post)

    assert groq_service.get_ai_response("salam") == "Salam"
    assert request["url"] == groq_service.GROQ_CHAT_COMPLETIONS_URL
    assert request["headers"]["Authorization"] == "Bearer test-key"
    assert request["json"]["model"] == "test-model"
    assert request["json"]["max_completion_tokens"] == 1024
    assert request["json"]["messages"][-1] == {"role": "user", "content": "salam"}


def test_groq_service_rejects_invalid_response(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": []}

    monkeypatch.setattr(groq_service, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(groq_service.requests, "post", lambda *args, **kwargs: Response())

    with pytest.raises(AIProviderError, match="invalid response"):
        groq_service.get_ai_response("Hello")
