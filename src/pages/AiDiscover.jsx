import { useState } from "react";
import { searchMovies } from "../services/api"; // Ginagamit na natin ito sa ibang pages
import MovieCard from "../components/MovieCard";
import { Lock, Bot, Sparkles, AlertCircle } from "lucide-react";

const AiDiscover = ({ user }) => {
  const [prompt, setPrompt] = useState("");
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setMovies([]);
    setStatusText("Searching for the perfect movie vibe with AI...");

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing Gemini API Key sa iyong .env file!");
      }

      // 1. TATAWAGIN SI GEMINI (Gumagamit ng gemini-2.5-flash dahil napakabilis nito)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert movie recommender system. The user wants to find movies based on this description: "${prompt}". 
                  Provide a list of 5 to 7 real movie titles that best fit. 
                  Return ONLY a valid JSON array of strings containing just the movie titles. Do not include markdown formatting, no code blocks (like \`\`\`json), and no extra text. 
                  Example output format: ["Inception", "The Matrix", "Interstellar"]`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const aiTextResponse =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Linisin ang response kung sakaling naglagay si Gemini ng markdown codeblocks
      const cleanJsonString = aiTextResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // I-parse ang mga titles na binalik ni AI
      const recommendedTitles = JSON.parse(cleanJsonString);

      if (!Array.isArray(recommendedTitles) || recommendedTitles.length === 0) {
        throw new Error("Hindi valid array ang binalik ng AI.");
      }

      {
        /* STATUS / LOADING FEEDBACK SYSTEM */
      }
      {
        statusText && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            {loading ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            ) : (
              // Ito ang lalabas kapag tapos na mag-load pero walang nahanap o nag-error
              <AlertCircle className="w-6 h-6 text-gray-500 stroke-[2]" />
            )}
            <p className="text-sm font-bold text-gray-400 italic tracking-wide">
              {statusText}
            </p>
          </div>
        );
      }

      // 2. IKA-CROSS REFERENCE ANG TITLES SA TMDB API
      const tmdbResults = [];
      for (const title of recommendedTitles) {
        const searchData = await searchMovies(title); // Tinatawag ang search function mo
        if (searchData && searchData.length > 0) {
          // Kukunin natin ang pinakaunang pinakatugmang resulta mula sa search list
          tmdbResults.push(searchData[0]);
        }
      }

      setMovies(tmdbResults);
      if (tmdbResults.length === 0) {
        setStatusText(
          "⚠️ Walang nahanap na tugmang pelikula sa database. Subukang baguhin o detalyehan pa ang iyong description.",
        );
      } else {
        setStatusText("");
      }
    } catch (error) {
      console.error("AI Discovery Error:", error);
      setStatusText(
        "Error in AI discovery. Please try again later or check your input.",
      );
    } finally {
      setLoading(false);
    }
  };

  // BLOCKOUT HARANG KAPAG HINDI NAKA-LOGIN (Same pattern sa profile/watchlist)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-wider text-white">
          Please Log In First!
        </h3>
        <p className="text-gray-500 text-xs mt-2 max-w-xs font-medium">
          You need to be logged in to use the AI Movie Discoverer. Join the
          community and start exploring movies based on your vibe!
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-white p-6 md:p-12 max-w-6xl">
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white flex items-center gap-3">
          <Bot className="w-7 h-7 md:w-8 md:h-8 text-blue-500 stroke-[2.5] drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          AI Movie Discoverer
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Describe the vibe or plot you're looking for, and let AI surprise you
          with movie recommendations!
        </p>
      </div>

      {/* INPUT FORM BOX */}
      <div className="bg-[#0d1527] border border-white/5 rounded-[2.5rem] p-6 md:p-8 shadow-xl mb-10">
        <form onSubmit={handleAiSearch} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
              Describe the movie you are looking for...
            </label>
            <textarea
              required
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Example: "A mind-bending sci-fi movie with a shocking plot twist" or "Romantic comedy with a heartwarming ending"...'
              className="w-full px-5 py-4 bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-2xl text-white text-sm placeholder-gray-600 focus:outline-none font-bold transition-all resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-blue-600/10 w-full sm:w-auto"
          >
            {loading ? "Searching with AI..." : "Ask AI Recommendations"}
          </button>
        </form>
      </div>

      {/* STATUS / LOADING FEEDBACK */}
      {statusText && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {loading && (
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          )}
          <p className="text-sm font-bold text-gray-400 italic tracking-wide">
            {statusText}
          </p>
        </div>
      )}

      {/* RESULTS GRID */}
      {movies.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 pl-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
            AI Recommended Vibes:
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiDiscover;
