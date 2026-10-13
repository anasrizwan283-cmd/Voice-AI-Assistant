import pytest

from backend.app.services import openai_service
from backend.app.services.ai_errors import AIProviderError


def test_openai_service_sends_chat_completion(monkeypatch):
    request = {}

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "Hello back"}}]}

    def fake_post(url, **kwargs):
        request["url"] = url
        request.update(kwargs)
        return Response()

    monkeypatch.setattr(openai_service, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(openai_service, "OPENAI_MODEL", "test-model")
    monkeypatch.setattr(openai_service.requests, "post", fake_post)

    assert openai_service.get_ai_response("Hello") == "Hello back"
    assert request["url"] == openai_service.OPENAI_CHAT_COMPLETIONS_URL
    assert request["headers"]["Authorization"] == "Bearer test-key"
    assert request["json"]["model"] == "test-model"
    assert request["json"]["messages"][-1] == {"role": "user", "content": "Hello"}


def test_openai_service_rejects_invalid_response(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": []}

    monkeypatch.setattr(openai_service, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(openai_service.requests, "post", lambda *args, **kwargs: Response())

    with pytest.raises(AIProviderError, match="invalid response"):
        openai_service.get_ai_response("Hello")
