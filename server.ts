import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRACK_PROMPTS: Record<'CORRIDOR' | 'BOSS', string> = {
  CORRIDOR:
    'Generate a 30-second atmospheric dark sci-fi fantasy synth-orchestral loop for climbing an ancient cosmic spire, crystalline arpeggios, deep sub-bass pulse, mysterious strings, 118 BPM, instrumental only.',
  BOSS:
    'Generate a 30-second intense dark fantasy cosmic horror boss battle theme, driving orchestral brass and strings, heavy industrial synth percussion, urgent 142 BPM tempo, instrumental only.',
};

const bgmCache = new Map<string, { audioDataUrl: string; lyrics: string; model: string }>();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/bgm/generate', async (req, res) => {
    try {
      const trackType: 'CORRIDOR' | 'BOSS' =
        req.body?.trackType === 'BOSS' ? 'BOSS' : 'CORRIDOR';
      const customPrompt =
        typeof req.body?.prompt === 'string' && req.body.prompt.trim().length > 0
          ? req.body.prompt.trim()
          : TRACK_PROMPTS[trackType];
      const cacheKey = `${trackType}::${customPrompt}`;

      if (bgmCache.has(cacheKey)) {
        return res.json({ ok: true, cached: true, ...bgmCache.get(cacheKey)! });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({
          ok: false,
          error: 'GEMINI_API_KEY is not configured. Using procedural Web Audio synth BGM.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const model = 'lyria-3-clip-preview';
      const response = await ai.models.generateContentStream({
        model,
        contents: customPrompt,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        return res.status(502).json({
          ok: false,
          error: 'Lyria returned no audio chunks. Falling back to Web Audio synthesizer.',
        });
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      const payload = {
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        lyrics,
        model,
      };
      bgmCache.set(cacheKey, payload);
      return res.json({ ok: true, cached: false, ...payload });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate Lyria BGM';
      return res.status(500).json({ ok: false, error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Chrono Spire server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
