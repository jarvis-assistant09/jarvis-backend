import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const VOICE_ID = "dfsWmmgleAAdssZ0Spld";

app.get("/", (req, res) => {
  res.json({
    status: "online",
    assistant: "JARVIS"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;
     const memory = req.body.memory || "";
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key not configured"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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

    let audio = null;

    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const voiceResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": process.env.ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg"
            },
            body: JSON.stringify({
              text: reply,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.55,
                similarity_boost: 0.8,
                style: 0.3,
                use_speaker_boost: true
              }
            }),
            signal: AbortSignal.timeout(55000)
          }
        );

        if (voiceResponse.ok) {
          const audioBuffer = await voiceResponse.arrayBuffer();
          audio = Buffer.from(audioBuffer).toString("base64");
        } else {
          console.error(
            "ElevenLabs error:",
            voiceResponse.status,
            await voiceResponse.text()
          );
        }
      } catch (voiceError) {
        console.error("Voice generation error:", voiceError.message);
      }
    }

    res.json({ reply, audio });

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
