import { showNotification } from "./ui.js";
import { getAuthToken } from './auth.js';

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
      `http://localhost:5500/api/conversations/current`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!convRes.ok) return;

    const convData = await convRes.json();
    const conversationId = convData.id;
    sessionStorage.setItem("conversationId", conversationId);

    const response = await fetch(
      `http://localhost:5500/api/conversations/${conversationId}/messages`,
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
      `http://localhost:5500/api/conversations/${conversationId}/messages`,
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
      const id = ++typingId;
    if (fullText) {
        fullText += "\n" + text;
      } else {
        fullText = text;
      }
      contentEl.textContent = fullText;
      scrollChatToBottom();
    },
    async appendMessage(text) {
      const id = ++typingId; // Increment ID to kill previous typing loops
      
      // Force clear the state for the new message
      contentEl.textContent = "";
      fullText = "";
      
      // Remove any lingering status indicators if you had them
      const statusElements = msgDiv.querySelectorAll(".status-text");
      statusElements.forEach(el => el.remove());
      
      // Start typing new message immediately
      await typeChars(text.trimStart(), id);
    },
    async finish(saveToDb = false) {
      cursorEl.remove();
      msgDiv.classList.remove("streaming-message");
      if (saveToDb && fullText) {
        saveMessageToDB("assistant", fullText);
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
