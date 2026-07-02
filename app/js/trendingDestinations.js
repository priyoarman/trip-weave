import { appendChatMessage } from "./chat.js";
let selectedDestination = null;
let waitingForTravelDate = false;

export function initializeTrendingDestinations(userInput) {
  const destinationCards = document.querySelectorAll(".destination-card");

  destinationCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectedDestination =
        card.dataset.city || card.querySelector(".city")?.textContent.trim();

      waitingForTravelDate = true;

      appendChatMessage(
        `✈️ Great choice! You're travelling from Copenhagen (CPH) to ${selectedDestination}. When would you like to travel?`,
        "ai",
        true,
      );

      userInput.value = "";
      userInput.focus();
    });
  });
}

export function isWaitingForDate() {
  return waitingForTravelDate;
}

export function createFlightPrompt(date) {
  waitingForTravelDate = false;

  return `Find a flight from Copenhagen to ${selectedDestination} on ${date}`;
}
