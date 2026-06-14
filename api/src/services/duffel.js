export const searchFlights = async (payload) => {
  const DUFFEL_TOKEN = process.env.DUFFEL_TOKEN;

  if (!DUFFEL_TOKEN) {
    throw new Error(
      "Missing DUFFEL_TOKEN environment variable. Make sure .env is loaded before starting the server.",
    );
  }

  try {
    const payload = {
      data: {
        slices,
        passengers,
        cabin_class: "business",
      },
    };

    const response = await fetch("https://api.duffel.com/air/offer_requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DUFFEL_TOKEN}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const responseBody = responseText ? JSON.parse(responseText) : null;

    if (!response.ok) {
      const details = responseBody
        ? JSON.stringify(responseBody)
        : responseText;
      throw new Error(
        `Duffel API Error: ${response.status} ${response.statusText} - ${details}`,
      );
    }

    return responseBody;
  } catch (error) {
    console.error("Duffel service error:", error.message);
    throw error;
  }
};
