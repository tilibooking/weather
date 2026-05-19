/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Clock, CloudRain, Thermometer, Wind, Droplets } from "lucide-react";

interface WeatherData {
  current: {
    temp: number;
    weatherCode: number;
    time: string;
  };
  hourly: {
    time: string[];
    temp: number[];
    precipProb: number[];
    weatherCode: number[];
  };
}

export default function App() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationName = "NoVa, MD & DC";

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        // Try to get AI-improved weather from our server
        const response = await fetch('/api/weather');
        if (!response.ok) throw new Error("Server error");
        
        const json = await response.json();
        setData(json);
        setLoading(false);
      } catch (err) {
        console.warn("Gemini weather failed, falling back to Open-Meteo", err);
        // Fallback to standard Open-Meteo
        try {
          const fbResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,precipitation,weathercode&current_weather=true&timezone=auto&forecast_days=1`
          );
          const json = await fbResponse.json();

          setData({
            current: {
              temp: json.current_weather.temperature,
              weatherCode: json.current_weather.weathercode,
              time: json.current_weather.time,
            },
            hourly: {
              time: json.hourly.time,
              temp: json.hourly.temperature_2m,
              precipProb: json.hourly.precipitation_probability,
              weatherCode: json.hourly.weathercode,
            },
          });
          setLoading(false);
        } catch (fallbackErr) {
          setError("Failed to fetch weather data");
          setLoading(false);
        }
      }
    };

    // Default to DMV area (Washington DC center)
    fetchWeather(38.8951, -77.0364);
  }, []);

  const getWeatherEmoji = (code: number) => {
    if (code === 0) return "☀️";
    if (code <= 3) return "🌤️";
    if (code <= 48) return "🌫️";
    if (code <= 55) return "🌧️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌧️";
    if (code <= 86) return "❄️";
    if (code >= 95) return "⛈️";
    return "⛅";
  };

  const formatHour = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", { hour: "numeric", hour12: true });
  };

  const getWeatherColors = (code: number) => {
    if (code === 0 || code === 1) return "from-amber-50/60 via-orange-50/40 to-amber-50/60";
    if (code <= 3) return "from-blue-50/60 via-sky-50/40 to-blue-50/60";
    if (code <= 48) return "from-slate-100/60 via-gray-100/40 to-slate-100/60";
    if (code <= 67 || (code >= 80 && code <= 82)) return "from-indigo-100/60 via-blue-100/40 to-indigo-100/60";
    if (code <= 77 || (code >= 85 && code <= 86)) return "from-blue-50/60 via-white to-blue-50/60";
    if (code >= 95) return "from-purple-100/60 via-slate-200/40 to-purple-100/60";
    return "from-white via-blue-50/30 to-white";
  };

  if (error && !data) {
    return (
      <motion.div 
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="flex flex-col items-center justify-center p-6 text-center bg-linear-to-r from-red-50/50 via-white to-red-50/50 backdrop-blur-sm rounded-xl border border-slate-200/60"
        style={{ backgroundSize: '200% 200%' }}
      >
        <div className="text-orange-500 mb-4 text-4xl">⚠️</div>
        <p className="text-sm font-medium opacity-80 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold text-sm uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div 
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="flex items-center justify-center p-8 bg-linear-to-r from-white via-blue-50/30 to-white backdrop-blur-sm rounded-xl border border-slate-200/60"
        style={{ backgroundSize: '200% 200%' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </motion.div>
    );
  }

  const currentHourIndex = data ? data.hourly.time.findIndex(t => new Date(t) >= new Date(data.current.time)) : 0;
  const weatherColors = data ? getWeatherColors(data.current.weatherCode) : "from-white via-blue-50/30 to-white";

  const forecastItems = data ? data.hourly.time.slice(currentHourIndex, currentHourIndex + 8).map((time, i) => {
    const idx = currentHourIndex + i;
    return {
      time: i === 0 ? "Now" : formatHour(time),
      emoji: getWeatherEmoji(data.hourly.weatherCode[idx]),
    };
  }) : [];

  return (
    <div className="w-full font-sans antialiased overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
        }}
        transition={{ 
          opacity: { duration: 0.5 },
          y: { duration: 0.5 },
          backgroundPosition: { duration: 15, repeat: Infinity, ease: "linear" }
        }}
        className={`w-full bg-linear-to-r ${weatherColors} overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-y border-slate-200/60 flex flex-col lg:flex-row items-center h-auto lg:h-20 relative`}
        style={{ backgroundSize: '200% 200%' }}
      >
        {/* Hourly Forecast Section */}
        <div className="flex-grow w-full overflow-hidden">
          <div className="flex overflow-x-auto no-scrollbar px-4 py-3 lg:py-0 justify-around lg:justify-between items-center transition-all relative">
            {forecastItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`flex flex-col items-center flex-1 min-w-[62px] lg:min-w-0 group px-1 ${i >= 5 ? 'hidden lg:flex' : 'flex'}`}
              >
                <span className="text-[10px] font-semibold text-slate-900 uppercase mb-1 tracking-tight">{item.time}</span>
                <span className="text-2xl group-hover:scale-110 transition-transform cursor-default drop-shadow-sm">{item.emoji}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Clock/Time Info */}
        <div className="hidden xl:flex flex-col items-end px-8 border-l border-slate-50 py-1">
          <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mb-1 italic">Last Updated</span>
          <span className="text-sm font-semibold text-slate-900 border-b-2 border-blue-500/20">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
