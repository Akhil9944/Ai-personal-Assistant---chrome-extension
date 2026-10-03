const BACKEND_URL = "http://localhost:8000";


export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, { method: "GET" });
    return res.ok;
  } catch (err) {
    return false;
  }
}


export async function streamChatMessage({
  prompt,
  imageBase64 = null,
  model = "gemini-1.5-flash",
  sessionId = null,
  onChunk,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_base64: imageBase64,
        model,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk && onChunk) {
        onChunk(chunk);
      }
    }

    if (onDone) onDone();
  } catch (err) {
    console.error("Stream error:", err);
    if (onError) onError(err.message || "Failed to communicate with AI backend.");
  }
}


export async function fetchSessions() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/sessions`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}