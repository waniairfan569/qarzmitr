const { env } = require('../config/env');

const DASHSCOPE_URL = `${env.dashscopeBaseUrl}/chat/completions`;
const STRUCTURE_MODEL = 'qwen-plus';
const STRUCTURE_SYSTEM_PROMPT = `You are a financial data assistant. You will receive raw, messy text extracted from a handwritten shopkeeper ledger written in Urdu, English, or a mix. Convert it into a structured JSON array of transactions.

Each transaction must have:
- "type": one of "sale", "expense", "credit_given", "repayment"
- "amount": a number (PKR, no currency symbol)
- "customer_name": string or null if not mentioned
- "date": string in YYYY-MM-DD if a date is present, else null
- "note": short English summary of what the line meant

Rules:
- If a line mentions giving goods/money to a customer without immediate payment, classify as "credit_given"
- If a line mentions a customer paying back previously owed money, classify as "repayment"
- If unclear, make your best reasonable inference and lower-case flag it in "note" as "uncertain: ..."
- Output ONLY valid JSON, no explanation, no markdown formatting.`;
const REQUEST_TIMEOUT_MS = 45_000;

class StructureServiceError extends Error {
  constructor(message, { cause, code, rawOutput } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'StructureServiceError';
    this.code = code;
    this.rawOutput = rawOutput;
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

function stripCodeFences(output) {
  const trimmed = output.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseStructuredTransactions(rawOutput) {
  const jsonText = stripCodeFences(rawOutput);

  try {
    const transactions = JSON.parse(jsonText);
    if (!Array.isArray(transactions)) {
      throw new TypeError('The model output is not a JSON array.');
    }
    return transactions;
  } catch (error) {
    throw new StructureServiceError('DashScope returned malformed transaction JSON.', {
      cause: error,
      code: 'MALFORMED_MODEL_OUTPUT',
      rawOutput
    });
  }
}

async function structureLedgerText(rawOcrText) {
  if (!env.dashscopeApiKey) {
    return {
      status: 'skipped',
      transactions: [],
      reason: 'DASHSCOPE_API_KEY is not configured.'
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.dashscopeApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: STRUCTURE_MODEL,
        messages: [
          { role: 'system', content: STRUCTURE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Here is the raw ledger text:\n"""\n${rawOcrText}\n"""`
          }
        ]
      }),
      signal: controller.signal
    });

    let responseBody;
    try {
      responseBody = await response.json();
    } catch (error) {
      throw new StructureServiceError('DashScope returned an invalid API response.', {
        cause: error,
        code: 'INVALID_API_RESPONSE'
      });
    }

    if (!response.ok) {
      const providerMessage = responseBody?.error?.message || `HTTP ${response.status}`;
      throw new StructureServiceError(`DashScope rejected the structuring request: ${providerMessage}`, {
        code: 'DASHSCOPE_REJECTED'
      });
    }

    const rawOutput = readResponseText(responseBody);
    if (!rawOutput) {
      throw new StructureServiceError('DashScope returned no transaction data.', {
        code: 'EMPTY_MODEL_OUTPUT'
      });
    }

    return {
      status: 'completed',
      transactions: parseStructuredTransactions(rawOutput),
      reason: null
    };
  } catch (error) {
    if (error instanceof StructureServiceError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new StructureServiceError('DashScope structuring request timed out.', {
        cause: error,
        code: 'DASHSCOPE_TIMEOUT'
      });
    }
    throw new StructureServiceError('DashScope structuring request failed.', {
      cause: error,
      code: 'DASHSCOPE_REQUEST_FAILED'
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  STRUCTURE_MODEL,
  StructureServiceError,
  parseStructuredTransactions,
  structureLedgerText
};