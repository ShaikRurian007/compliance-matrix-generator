const axios = require('axios');
const PROMPT = require('./prompt');

const DEFAULT_MODEL = 'gemini-2.0-flash';
const MODEL_ALIASES = {
  flash: 'gemini-2.0-flash',
  '2.0-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'flash-lite': 'gemini-2.0-flash-lite',
  '2.0-flash-lite': 'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
  '1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-flash': 'gemini-1.5-flash'
};

function resolveModelName(input) {
  const normalized = String(input || '').trim().toLowerCase();
  return MODEL_ALIASES[normalized] || null;
}

async function callGemini(pdfBase64, model, apiKey) {
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Send `key <your-key>` first.');
  }

  const resolvedModel = resolveModelName(model) || model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: pdfBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 16384
    }
  };

  try {
    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      maxBodyLength: Infinity,
      timeout: 180000
    });
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No content returned from Gemini. Check your API key or try a different model.');
    }
    return text;
  } catch (error) {
    const apiMessage = error.response?.data?.error?.message;
    throw new Error(apiMessage || error.message || 'Gemini request failed.');
  }
}

module.exports = {
  DEFAULT_MODEL,
  MODEL_ALIASES,
  callGemini,
  resolveModelName
};
