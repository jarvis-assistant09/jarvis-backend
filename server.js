import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    status: "online",
    assistant: "JARVIS"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "API key not configured"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: "You are JARVIS, a helpful personal AI assistant. Be friendly, intelligent and concise."
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message.trim() }]
          }]
        }),
        signal: AbortSignal.timeout(55000)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gemini API failed",
        details: result.error?.message || "Unknown error"
      });
    }

    const reply = result.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "No reply generated"
      });
    }

    res.json({ reply });

  } catch (error) {
    res.status(500).json({
      error: "Backend error",
      details: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("JARVIS backend running on port " + PORT);
});
