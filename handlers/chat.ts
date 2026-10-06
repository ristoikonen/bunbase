import type { ChatApiResponse, ChatRequestPayload } from "../models/chatresponses";


export interface ChatUIHandlers {
  appendMessage: (sender: string, text: string) => void;
  updateQuotaDisplay: (remaining: number) => void;
}


export async function sendChatMessage(
  userPrompt: string,
  ui: ChatUIHandlers,
  apiEndpoint: string = "http://localhost:3000/api/chat"
): Promise<void> {
  ui.appendMessage("User", userPrompt);

  try {
    const payload: ChatRequestPayload = { prompt: userPrompt };

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ChatApiResponse;

    if (data.success) {
      ui.appendMessage("Gemini AI", data.reply);
      ui.updateQuotaDisplay(data.remainingQuota);
    } else {
      ui.appendMessage("System", `Error: ${data.error}`);
    }
  } catch (err) {
    ui.appendMessage("System", "Failed to communicate with Bun backend.");
  }
}


/**
 * Handles communication between the Chattish UI and the Bun AI backend.
 */
export async function sendChatMessageoLD(
  userPrompt: string,
  ui: ChatUIHandlers,
  apiEndpoint: string = "http://localhost:3000/api/chat"
): Promise<void> {
  ui.appendMessage("User", userPrompt);

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": crypto.randomUUID(),
      },
      body: JSON.stringify({ prompt: userPrompt }),
    });

    const data = (await response.json()) as ChatApiResponse;

    if (data.success) {
      ui.appendMessage("Gemini AI", data.reply);
      ui.updateQuotaDisplay(data.remainingQuota);
    } else {
      ui.appendMessage("System", `Error: ${data.error}`);
    }
  } catch (err) {
    ui.appendMessage("System", "Failed to communicate with Bun backend.");
  }
}