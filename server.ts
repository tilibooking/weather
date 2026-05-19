import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// Simple in-memory cache
let weatherCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000 * 60; // 60 minutes

// API endpoint to get "Improved" weather via Gemini
app.get("/api/weather", async (req, res) => {
  // Return cached data if fresh (within 1 hour)
  const now = Date.now();
  if (weatherCache && (now - weatherCache.timestamp < CACHE_DURATION)) {
    return res.json(weatherCache.data);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Search for the real-time current weather and hourly forecast for the next 12 hours in Northern Virginia (NoVa), MD, and DC area. Focus on accuracy for the next few hours (especially 3 PM and 4 PM). Provide data in WMO weather code format (0: clear, 1-3: partly cloudy, 45-48: fog, 51-67: rain/drizzle, 71-77: snow, 80-82: rain showers, 95: thunderstorm).",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            current: {
              type: Type.OBJECT,
              properties: {
                temp: { type: Type.NUMBER, description: "Current temperature in Celsius" },
                weatherCode: { type: Type.INTEGER, description: "WMO weather code" },
                time: { type: Type.STRING, description: "Current ISO time" }
              },
              required: ["temp", "weatherCode", "time"]
            },
            hourly: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of ISO strings for the next 12 hours" },
                temp: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Array of temperatures in Celsius" },
                weatherCode: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "Array of WMO codes" },
                precipProb: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Array of precipitation probabilities" }
              },
              required: ["time", "temp", "weatherCode", "precipProb"]
            }
          },
          required: ["current", "hourly"]
        }
      }
    });

    const weatherData = JSON.parse(response.text || "{}");
    
    // Update cache
    if (weatherData.current && weatherData.hourly) {
      weatherCache = { data: weatherData, timestamp: now };
    }

    res.json(weatherData);
  } catch (error: any) {
    // Check if it's a quota error (429)
    const isQuotaError = error.status === 429 || (error.message && error.message.includes("429"));
    
    if (isQuotaError) {
      console.warn("Gemini Quota Exceeded. Using fallback mechanism.");
      // If we have any cache at all (even old), use it as fallback
      if (weatherCache) {
        return res.json(weatherCache.data);
      }
      return res.status(429).json({ error: "Quota exceeded", fallback: true });
    }

    console.error("Gemini Weather Error:", error);
    
    if (weatherCache) {
      return res.json(weatherCache.data);
    }

    res.status(error.status || 500).json({ error: "Failed to fetch AI weather" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
