// services/api.js

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// Function para sa Trending Movies (Yung ginawa natin kanina)
export const getTrendingMovies = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`,
    );
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching movies:", error);
    return [];
  }
};

// // Function for Searching Movies
export const searchMovies = async (query) => {
  try {
    // Ginagamit ang 'search/movie' endpoint at pinapasa ang 'query' (yung tinype ng user)
    const response = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`,
    );
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error searching movies:", error);
    return [];
  }
};

export const getRecommendations = async (movieId) => {
  const response = await fetch(
    `${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}`,
  );
  const data = await response.json();
  return data.results;
};

export const getNowPlaying = async () => {
  const response = await fetch(
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}`,
  );
  const data = await response.json();
  return data.results;
};

export const getMovieDetails = async (movieId) => {
  const response = await fetch(
    `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,videos`
  );
  return await response.json();
};