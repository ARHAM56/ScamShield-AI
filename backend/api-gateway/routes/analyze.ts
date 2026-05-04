import { Router } from 'express';
import { GoogleGenAI, Type } from "@google/genai";

const router = Router();

// Lazy load Gemini
let ai: GoogleGenAI | null = null;
const getAi = () => {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

router.post('/text', async (req, res) => {
  try {
    const { text, type = 'phishing' } = req.body;
    if (!text) {
      return res.status(400).json({ error: "MISSING_TEXT" });
    }

    const aiClient = getAi();
    
    const prompt = type === 'phishing' 
      ? `Analyze this content for scam/phishing risk: "${text}". Return JSON with score (0-100), markers (list), and status (SAFE, WARNING, DANGER).`
      : `Deep semantic analysis for markers: "${text}". Return JSON with summary, risk_level, indicators (list), and recommendation.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    const responseText = response.text;
    res.json(JSON.parse(responseText || '{}'));
  } catch (error: any) {
    console.error('[AI_ANALYSIS_FAULT]', error);
    res.status(500).json({ 
      status: "ERROR", 
      error: "AI_SERVICE_UNAVAILABLE",
      message: error.message || "Neural link failed"
    });
  }
});

router.post('/audio', async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "MISSING_AUDIO" });
    }

    const aiClient = getAi();
    
    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [
          { text: "Analyze this audio call snippet. 1. Transcribe the speech accurately. 2. Detect the speaker's TONE (Choose EXACTLY ONE from [ANGRY, STRESSED, CALM, NEUTRAL]). Return JSON: { 'text': string, 'tone': string }. If no speech, text should be '[NO_SPEECH]' and tone 'NEUTRAL'." },
          { inlineData: { mimeType: mimeType || "audio/wav", data: audio } }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });

    const responseText = response.text;
    res.json(JSON.parse(responseText || '{}'));
  } catch (error: any) {
    console.error('[AUDIO_ANALYSIS_FAULT]', error);
    res.status(500).json({ 
      status: "ERROR", 
      error: "AI_SERVICE_UNAVAILABLE",
      message: error.message 
    });
  }
});

router.post('/gpt', async (req, res) => {
  try {
    const { input } = req.body;
    const aiClient = getAi();
    
    const result = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze this content for phishing or social engineering: "${input}"`
        }]
      }],
      config: {
        systemInstruction: "You are a cybersecurity analyst. Assess risk in JSON: summary, risk_level (SAFE, LOW, MEDIUM, HIGH, CRITICAL), indicators (array), recommendation.",
        responseMimeType: "application/json",
      }
    });

    const data = JSON.parse(result.text || '{}');
    res.json(data);
  } catch (error: any) {
    console.error('[GPT_ANALYSIS_FAULT]', error);
    res.status(500).json({ error: "NEURAL_LINK_FAULT", message: error.message });
  }
});

export default router;
