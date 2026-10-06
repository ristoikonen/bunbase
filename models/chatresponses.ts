
export interface ChatRequestPayload {
  prompt: string;
}

interface ChatSuccessResponse {
  success: true;
  reply: string;
  remainingQuota: number;
  visitorHash: string;
}

interface ChatErrorResponse {
  success: false;
  error: string;
}

export type ChatApiResponse = ChatSuccessResponse | ChatErrorResponse;

export type MessageSender = "User" | "Gemini AI" | "System";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string; // AS ISO 8601 UTC
}

export interface ChatUIHandlers {
  appendMessage: (sender: MessageSender, text: string) => void;
  updateQuotaDisplay: (remaining: number) => void;
}