const API_URL = "http://127.0.0.1:8001";

async function sendMessage(message) {
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });

        return await response.json();

    } catch (error) {
        console.error(error);
    }
}