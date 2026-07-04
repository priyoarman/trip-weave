import { showNotification } from "./ui.js";
import { getAuthToken } from './auth.js';
import { API_BASE } from "./sse.js";
const TYPING_DELAY_MS = 18;

export async function loadChatHistory() {
  const token = getAuthToken();
 const chatHistory = document.querySelector(".chat-history");
 if (!chatHistory) return;

  if (!token) {
    console.log("No token, skipping chat history load.");
    chatHistory.innerHTML = "";
    appendChatMessage("Hi! Where would you like to fly today?", "ai", false);
    return;
  }

  try {
    const convRes = await fetch(
      `${API_BASE}/api/conversations/current`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!convRes.ok) return;

    const convData = await convRes.json();
    const conversationId = convData.id;
    sessionStorage.setItem("conversationId", conversationId);

    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) return;

    const messages = await response.json();
    chatHistory.innerHTML = ""; // Clear only once

    // ONLY show the greeting if there is absolutely no history
    if (messages.length === 0) {
      appendChatMessage("Hi! Where would you like to fly today?", "ai", false);
    }

    // 3. Render private history
    messages.forEach((msg) => {
      // Ensure the role matches your DB/UI expected format
      const uiRole = msg.senderRole === "user" ? "user" : "ai";
      appendChatMessage(msg.textContent, uiRole, false);
    });
  } catch (error) {
    console.error("Failed to load chat history:", error);
  }
}

export async function saveMessageToDB(dbRole, text) {
const token = getAuthToken();
 const conversationId = sessionStorage.getItem("conversationId");

  if (!token || !conversationId) return; // Skip if guest or no chat ID

  try {
    await fetch(
      `${API_BASE}/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ senderRole: dbRole, textContent: text }),
      },
    );
  } catch (error) {
    console.error("Failed to save message to DB:", error);
  }
}

export function appendChatMessage(text, role, saveToDb = false) {
  const chatHistory = document.querySelector(".chat-history");
  if (!chatHistory) return;

  const msgDiv = document.createElement("div");
  msgDiv.className =
    role === "user"
      ? "message user-message bg-blue-600 text-white max-w-[80%] p-3 rounded-2xl rounded-tr-none text-sm shadow-sm ml-auto mb-4"
      : "message ai-message bg-blue-50 text-blue-900 max-w-[80%] p-3 rounded-2xl rounded-tl-none text-sm shadow-sm mb-4";
  msgDiv.innerText = text;
  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  if (saveToDb) {
    const dbRole = role === "user" ? "user" : "assistant";
    saveMessageToDB(dbRole, text);
  }
}

function scrollChatToBottom() {
  const chatHistory = document.querySelector(".chat-history");
  if (chatHistory) chatHistory.scrollTop = chatHistory.scrollHeight;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createStreamingAssistantMessage() {
  const chatHistory = document.querySelector(".chat-history");
  if (!chatHistory) return null;

  const msgDiv = document.createElement("div");
  msgDiv.className =
   "message ai-message streaming-message bg-blue-50 text-blue-900 max-w-[80%] p-3 rounded-2xl rounded-tl-none text-sm shadow-sm mb-4";

  const contentEl = document.createElement("div");
  contentEl.className = "stream-content whitespace-pre-wrap";
  const cursorEl = document.createElement("span");
  cursorEl.className = "stream-cursor";
  cursorEl.setAttribute("aria-hidden", "true");

  msgDiv.append(contentEl, cursorEl);
  chatHistory.appendChild(msgDiv);
  scrollChatToBottom();

  let fullText = "";
  let typingId = 0;
  let currentTypingPromise = Promise.resolve();

  // Simple, direct typing function
  const typeChars = async (text, id) => {
    for (const char of text) {
      if (id !== typingId) return; // Stop immediately if a new message started
      fullText += char;
      contentEl.textContent = fullText;
      scrollChatToBottom();
      await wait(TYPING_DELAY_MS);
    }
  };

  return {
   async appendStatus(text) {
    //fullText += text + "\n";
     
      const statusDiv = document.createElement("div");
      statusDiv.className = "status-text text-blue-900 italic mt-1";
      statusDiv.textContent = text;
      msgDiv.appendChild(statusDiv); 
      msgDiv.appendChild(cursorEl);
      scrollChatToBottom();
    },
    async appendMessage(text) {
     const id = ++typingId;

    let incomingText = text;

   if (fullText.length > 0) {
         const overlap = this.findOverlap(fullText, incomingText);
          if (overlap > 0) {
            console.log("DEBUG: Detected echo overlap of", overlap, "chars. Fixing.");
             fullText = fullText.substring(0, fullText.length - overlap);
             incomingText = incomingText.substring(overlap);
          }
      }
    
    
     const statusElements = msgDiv.querySelectorAll(".status-text");
      statusElements.forEach(el => el.remove());

      fullText += incomingText;
      contentEl.textContent = fullText;
      scrollChatToBottom();
      
    await wait(TYPING_DELAY_MS);
    },
    findOverlap(a, b) {
        // Looks for how much of the end of 'a' matches the start of 'b'
        for (let i = Math.min(a.length, b.length); i > 0; i--) {
            if (a.endsWith(b.substring(0, i))) {
                return i;
            }
        }
        return 0;
    },
    async finish(saveToDb = false) {
     await currentTypingPromise;
      cursorEl.remove();
      msgDiv.classList.remove("streaming-message");
      const isMeaningful = fullText && fullText.trim().length > 2;

     if (saveToDb && isMeaningful) {
        console.log("DEBUG: Saving to DB. Text:", fullText);
        saveMessageToDB("assistant", fullText);
      } else {
        console.warn("Skipping DB save: Message empty or too short.");
      }
    },
    remove() {
      msgDiv.remove();
    },
    getText() {
      return fullText;
    },
  };
}
