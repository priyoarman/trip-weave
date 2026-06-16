import mockFlights from "../data/mock-flights.json" with { type: "json" };
const USE_MOCK = true;
export const searchFlights = async (payload) => {
  try {
    const response = await fetch("https://api.duffel.com/air/offer_requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DUFFEL_TOKEN}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: payload,
      }),
    });

    const responseBody = await response.json();
    if (!response.ok) {
      throw new Error(JSON.stringify(responseBody));
    }
    return responseBody;
  } catch (error) {
    if (error.message.includes("fetch failed") && USE_MOCK) {
      console.log("No internet connection. Using mock data.");
      return mockFlights;
    }
    throw error;
  }
};
