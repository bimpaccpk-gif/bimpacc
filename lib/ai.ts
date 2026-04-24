export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
};

type OpenRouterStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }
  return apiKey;
}

function extractTextContent(
  content: string | Array<{ text?: string }> | undefined
): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? "")
      .join("");
  }

  return "";
}

async function createOpenRouterRequest(
  messages: AIChatMessage[],
  stream: boolean
): Promise<Response> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } };
      throw new Error(parsed.error?.message || errorText || "OpenRouter request failed");
    } catch {
      throw new Error(errorText || `OpenRouter request failed with status ${response.status}`);
    }
  }

  return response;
}

function buildMessages(prompt: string, systemPrompt?: string): AIChatMessage[] {
  const messages: AIChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });
  return messages;
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await createOpenRouterRequest(buildMessages(prompt, systemPrompt), false);
  const data = (await response.json()) as OpenRouterResponse;

  return extractTextContent(data.choices?.[0]?.message?.content) || "No response generated";
}

export async function* streamOpenRouterText(
  messages: AIChatMessage[]
): AsyncGenerator<string, void, void> {
  const response = await createOpenRouterRequest(messages, true);

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundaryIndex = buffer.indexOf("\n\n");
    while (boundaryIndex !== -1) {
      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      for (const rawLine of rawEvent.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) {
          continue;
        }

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data) as OpenRouterStreamChunk;
          const content = extractTextContent(parsed.choices?.[0]?.delta?.content);
          if (content) {
            yield content;
          }
        } catch {
          // Ignore malformed stream chunks and continue reading.
        }
      }

      boundaryIndex = buffer.indexOf("\n\n");
    }
  }
}

export async function callAIStream(
  prompt: string,
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  let fullResponse = "";

  for await (const chunk of streamOpenRouterText(buildMessages(prompt, systemPrompt))) {
    fullResponse += chunk;
    onChunk?.(chunk);
  }

  return fullResponse;
}
