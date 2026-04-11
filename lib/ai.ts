import { OpenRouter } from "@openrouter/sdk";

let openrouter: OpenRouter | null = null;

export function getOpenRouter() {
  if (!openrouter) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables");
    }
    openrouter = new OpenRouter({ apiKey });
  }
  return openrouter;
}

export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const client = getOpenRouter();

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const response = await client.chat.send({
    chatRequest: {
      model: OPENROUTER_MODEL,
      messages: messages as any,
      stream: false,
    },
  });

  return response.choices?.[0]?.message?.content ?? "No response generated";
}

export async function callAIStream(
  prompt: string,
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const client = getOpenRouter();

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const stream = await client.chat.send({
    chatRequest: {
      model: OPENROUTER_MODEL,
      messages: messages as any,
      stream: true,
    },
  });

  let fullResponse = "";
  for await (const chunk of stream as any) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      onChunk?.(content);
    }
  }

  return fullResponse;
}
