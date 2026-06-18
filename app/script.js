// ==========================================
// 1. GLOBAL STATE & MOCK DATA
// ==========================================
let isLoginMode = true;

// Silent Fallback Data
const backupDatabase = [
    { origin: "CPH", destination: "BCN", price: 1200, airline: "MockAir", departure_time: "2026-07-15T08:00:00Z" },
    { origin: "LHR", destination: "JFK", price: 4500, airline: "TestFlights Inc", departure_time: "2026-07-15T14:30:00Z" },
    { origin: "HND", destination: "CDG", price: 8200, airline: "Global Mock", departure_time: "2026-08-01T09:15:00Z" }
];

// ==========================================
// 2. MODALS, DRAWERS & AUTHENTICATION
// ==========================================
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.toggle('hidden');
}

function toggleDrawer() {
    const drawer = document.getElementById('savedFlightsDrawer');
    if (drawer) drawer.classList.toggle('translate-x-full');
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    
    document.getElementById('modalTitle').innerText = isLoginMode ? 'Login to TripWeave' : 'Create Your Account';
    document.getElementById('authSwitchText').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    document.getElementById('authSwitchBtn').innerText = isLoginMode ? "Sign Up" : "Login";
    
    const submitBtn = document.querySelector('#loginModal .space-y-4 button');
    if (submitBtn) submitBtn.innerText = isLoginMode ? 'Submit' : 'Sign Up';
}

async function submitAuthForm() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        alert("Please fill out all fields.");
        return;
    }
    
    console.log(`[Offline Mode]: Bypassing backend auth since routes are not built yet.`);
    localStorage.setItem('userToken', 'fake_demo_token_123');
    alert(`${isLoginMode ? 'Login' : 'Registration'} successful!`);
    toggleModal('loginModal');
    
    const signInBtn = document.querySelector('button[onclick="toggleModal(\'loginModal\')"]');
    if (signInBtn) {
        signInBtn.innerText = "Log Out";
        signInBtn.onclick = () => {
            localStorage.removeItem('userToken');
            alert("Logged out successfully!");
            location.reload();
        };
    }
}

// ==========================================
// 3. FRONTEND BRIDGE (GROQ -> DUFFEL)
// ==========================================
async function testLiveFlightSearch(userPrompt) {
    if (!navigator.onLine) {
        alert("⚠️ You are currently offline! Showing saved backup flights.");
        renderFlightsToScreen(backupDatabase);
        return; // This stops the rest of the function from running
    }
    const container = document.getElementById('flightsContainer');
    if (container) {
        container.innerHTML = '<div class="text-center text-gray-500 py-16"><p class="text-lg font-medium animate-pulse">Searching global flights...</p></div>';
    }

    try {
        console.log("1. Sending prompt to Groq API...");
        const groqResponse = await fetch('http://localhost:5050/api/groq/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userPrompt })
        });
        
        const groqData = await groqResponse.json();
        if (!groqData.success) throw new Error("AI failed to extract flight details.");
        
        const extracted = groqData.data;
        console.log("2. Extracted parameters:", extracted);

        const duffelPayload = {
            data: {
                slices: [
                    {
                        origin: extracted.origin_airport || "LHR", 
                        destination: extracted.destination_airport || "JFK",
                        departure_date: extracted.departure_date || "2026-07-15"
                    }
                ],
                passengers: [{ type: "adult" }],
                cabin_class: "economy"
            }
        };

        console.log("3. Fetching live flights from Duffel...");
        const flightResponse = await fetch('http://localhost:5050/api/flights/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duffelPayload)
        });
        
        const flightData = await flightResponse.json();

        if (flightData.data && flightData.data.data && flightData.data.data.offers.length > 0) {
            console.log("🎉 Live Test Flights Found!");
            renderFlightsToScreen(flightData.data.data.offers); 
        } else {
            console.warn("⚠️ No flights returned. Triggering Mock Fallback.");
            renderFlightsToScreen(backupDatabase);
        }

    } catch (error) {
        console.error("🚨 Search Error:", error);
        renderFlightsToScreen(backupDatabase);
    }
}

// ==========================================
// 4. UI RENDERING
// ==========================================
function appendChatMessage(text, role) {
    const chatHistory = document.querySelector('.chat-history');
    if (!chatHistory) return;

    const msgDiv = document.createElement('div');
    
    // Style differently based on who is talking
    if (role === 'user') {
        msgDiv.className = "message user-message bg-blue-600 text-white max-w-[80%] p-3 rounded-2xl rounded-tr-none text-sm shadow-sm ml-auto";
    } else {
        msgDiv.className = "message ai-message bg-blue-50 text-blue-900 max-w-[80%] p-3 rounded-2xl rounded-tl-none text-sm shadow-sm";
    }
    
    msgDiv.innerText = text;
    chatHistory.appendChild(msgDiv);
    
    // Automatically scroll to the bottom of the chat
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function renderFlightsToScreen(flightsArray) {
    const container = document.getElementById('flightsContainer');
    if (!container) return;

    container.innerHTML = ''; 

    flightsArray.forEach((flight, index) => {
        // DEBUGGER: Print the very first flight to the console so we can see its exact shape!
        if (index === 0) {
            console.log("🕵️ Inspecting the raw flight object from the backend:", flight);
        }

        // Ultra-robust extraction catching multiple possible Duffel data shapes
        const origin = 
            flight.origin || 
            flight?.slices?.[0]?.origin?.iata_code || 
            (typeof flight?.slices?.[0]?.origin === 'string' ? flight.slices[0].origin : null) ||
            flight?.slices?.[0]?.segments?.[0]?.origin?.iata_code || 
            "LHR"; // Fallback for demo

        const destination = 
            flight.destination || 
            flight?.slices?.[0]?.destination?.iata_code || 
            (typeof flight?.slices?.[0]?.destination === 'string' ? flight.slices[0].destination : null) ||
            flight?.slices?.[0]?.segments?.[0]?.destination?.iata_code || 
            "JFK"; // Fallback for demo

        const price = flight.total_amount || flight.price || "0.00";
        const currency = flight.total_currency || flight.currency || "USD";

        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition";
        card.innerHTML = `
            <div>
                <h3 class="font-bold text-gray-800 text-lg">${origin} ✈️ ${destination}</h3>
                <p class="text-xs text-gray-500 mt-1">Departure: ${flight?.slices?.[0]?.segments?.[0]?.departing_at?.split('T')[0] || "See details"}</p>
            </div>
            <div class="text-right">
                <p class="font-bold text-xl text-blue-600 mb-2">${price} ${currency}</p>
                <button class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 hover:text-white transition">Save Offer</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 5. EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');

    if (sendBtn && userInput) {
        function handleSend() {
            const prompt = userInput.value;
            if (prompt.trim() !== "") {
                appendChatMessage(prompt, 'user'); // 1. Draw it on the screen
                userInput.value = '';              // 2. Clear the input box
                testLiveFlightSearch(prompt);      // 3. Send to the backend API
            }
        }

        sendBtn.addEventListener('click', handleSend);

        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
});