import { Router } from 'express';

const router = Router();

router.post('/text', async (req, res) => {
  const { text } = req.body;
  const isScam = text.toLowerCase().includes('urgent') || text.toLowerCase().includes('otp') || text.toLowerCase().includes('bank');
  
  res.json({
    cleanedText: text,
    risk: isScam ? 95 : 10,
    language: 'Detected',
    insight: isScam ? 'Potential scam detected via keyword matching.' : 'No immediate risk patterns found.'
  });
});

router.post('/transcribe', async (req, res) => {
  res.json({ text: "Voice transcription currently handled by localized neural link." });
});

export default router;
