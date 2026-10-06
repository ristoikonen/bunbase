import  { sendChatMessage  } from "../handlers/chat";
import type { ChatUIHandlers  } from "../handlers/chat";

// Define your UI callbacks
const uiHandlers: ChatUIHandlers = {
  appendMessage: (sender, text) => {
    // DOM insertion logic here
    console.log(`[${sender}]: ${text}`);
  },
  updateQuotaDisplay: (remaining) => {
    // Update quota badge/counter in UI
    console.log(`Remaining Quota: ${remaining}`);
  }
};

// Triggered on form submit / send button click
async function onSubmit(promptText: string) {
  await sendChatMessage(promptText, uiHandlers);
}