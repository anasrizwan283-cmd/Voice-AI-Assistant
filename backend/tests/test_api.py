from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_endpoint_returns_reply():
    response = client.post(
        "/chat",
        json={"message": "Hello"},
    )
    assert response.status_code == 200
    assert "reply" in response.json()
