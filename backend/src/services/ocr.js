const { env } = require('../config/env');

const DASHSCOPE_URL = `${env.dashscopeBaseUrl}/chat/completions`;
const OCR_SYSTEM_PROMPT = 'You are an OCR assistant specialized in reading handwritten Urdu and mixed Urdu-English shopkeeper ledgers. Extract all visible text exactly as written, preserving line breaks. Do not translate. Do not summarize. If a word is unclear, mark it as [unclear] rather than guessing.';
const OCR_USER_PROMPT = 'Extract all text from this ledger page.';
const REQUEST_TIMEOUT_MS = 45_000;

class OcrServiceError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'OcrServiceError';
  }
}

function readResponseText(responseBody) {
  const content = responseBody?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n')
      .trim();
  }

  return '';
}

async function extractLedgerText({ buffer, mimeType }) {
  if (!env.dashscopeApiKey) {
    return {
      status: 'skipped',
      text: null,
      reason: 'DASHSCOPE_API_KEY is not configured.'
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const imageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  try {
    const response = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.dashscopeApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [
          { role: 'system', content: OCR_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_USER_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ]
      }),
      signal: controller.signal
    });

    let responseBody;
    try {
      responseBody = await response.json();
    } catch (error) {
      throw new OcrServiceError('DashScope returned an invalid response.', error);
    }

    if (!response.ok) {
      const providerMessage = responseBody?.error?.message || `HTTP ${response.status}`;
      throw new OcrServiceError(`DashScope rejected the OCR request: ${providerMessage}`);
    }

    const text = readResponseText(responseBody);
    if (!text) {
      throw new OcrServiceError('DashScope returned no OCR text.');
    }

    return {
      status: 'completed',
      text,
      reason: null
    };
  } catch (error) {
    if (error instanceof OcrServiceError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new OcrServiceError('DashScope OCR request timed out.', error);
    }
    throw new OcrServiceError('DashScope OCR request failed.', error);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  OcrServiceError,
  extractLedgerText
};