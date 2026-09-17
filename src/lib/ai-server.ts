/**
 * Server-side AI gateway client.
 *
 * Every model call goes through the authenticated Django endpoint
 * POST /api/ai/completion (see backend/apps/api/ai.py), which holds the
 * VLY integration key server-side. The key is never shipped to the browser.
 * The axios client adds the JWT and handles token refresh automatically.
 */
import { apiClient, apiErrorMessage } from "./api-helpers";

export interface AIServerMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AICompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Ask the AI gateway for a chat completion and return the text content.
 * Throws an Error with a human-friendly message on any failure.
 */
export async function aiCompletion(opts: {
  model?: string;
  messages: AIServerMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  try {
    const { data } = await apiClient.post<AICompletionResponse>(
      "/ai/completion",
      {
        model: opts.model ?? "gpt-4o-mini",
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens,
      },
    );
    const content = data?.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new Error("AI service returned an empty response.");
    }
    return content;
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }
}
