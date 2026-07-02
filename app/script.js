import { appendChatMessage, loadChatHistory } from "./js/chat.js";
import { testLiveFlightSearch } from "./js/flights.js";
import { updateNavUI, submitAuthForm, toggleAuthMode } from "./js/auth.js";
import { toggleDrawer } from "./js/ui.js";
import {
  initializeTrendingDestinations,
  isWaitingForDate,
  createFlightPrompt,
} from "./js/trendingDestinations.js";
window.toggleDrawer = toggleDrawer;
window.submitAuthForm = submitAuthForm;
window.toggleAuthMode = toggleAuthMode;

window.closeAuthModal = () => {
  document.getElementById("authModal").classList.add("hidden");
};

window.openAuthModal = () => {
  document.getElementById("authModal").classList.remove("hidden");
};

// ==========================================
// 1. CUSTOM NOTIFICATIONS (TOASTS)
// ==========================================
function showNotification(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  const variantClass = type === "success" ? "toast-success" : "toast-error";
  const icon = type === "success" ? "✅" : "⚠️";

  toast.className = `toast ${variantClass}`;
  toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="toast-close">&times;</button>
    `;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// 2. UI INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  updateNavUI();
  loadChatHistory();

  const sendBtn = document.getElementById("sendBtn");
  const userInput = document.getElementById("userInput");
  initializeTrendingDestinations(userInput);

  sendBtn?.addEventListener("click", () => handleSend(userInput));

  userInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSend(userInput);
    }
  });
});
function handleSend(userInput) {
  const message = userInput.value.trim();

  if (!message) return;

  appendChatMessage(message, "user", true);

  userInput.value = "";

  if (isWaitingForDate()) {
    const searchPrompt = createFlightPrompt(message);
    testLiveFlightSearch(searchPrompt);
    return;
  }

  testLiveFlightSearch(message);
}
