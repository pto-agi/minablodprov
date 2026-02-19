import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3-flash-preview';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    return;
  }

  try {
    const { prompt, text, markers } = req.body || {};
    if (!prompt || !text || !Array.isArray(markers)) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        { text: String(prompt) },
        { text: `Analyze this text:\n\n${String(text)}` },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const rawJson = response.text;
    if (!rawJson) {
      res.status(502).json({ error: 'No response from AI' });
      return;
    }

    const data = JSON.parse(rawJson);
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
