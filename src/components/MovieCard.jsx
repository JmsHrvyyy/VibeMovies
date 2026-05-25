import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Star, CheckCircle2 } from "lucide-react";

const MovieCard = ({ movie, onAddToWatchlist }) => {
  const navigate = useNavigate();
  const [isWatched, setIsWatched] = useState(false);

  // AUTOMATED WATCHED DETECTION STREAM
  useEffect(() => {
    // Kumuha ng kasalukuyang naka-log in na user mula sa Firebase Auth
    const currentUser = auth.currentUser;
    if (!currentUser || !movie?.id) {
      setIsWatched(false);
      return;
    }

    // Pakinggan kung umiiral ang movie id na ito sa loob ng 'watchedMovies' sub-collection ng user
    const watchedDocRef = doc(
      db,
      "users",
      currentUser.uid,
      "watchedMovies",
      String(movie.id),
    );

    const unsubscribe = onSnapshot(
      watchedDocRef,
      (docSnap) => {
        setIsWatched(docSnap.exists());
      },
      (error) => {
        console.warn(
          "Watched badge detection suppressed safely:",
          error.message,
        );
      },
    );

    return () => unsubscribe();
  }, [movie?.id]);

  const handleCardClick = () => {
    const type = movie.media_type === "tv" ? "tv" : "movie";
    navigate(`/${type}/${movie.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative cursor-pointer rounded-[2rem] overflow-hidden border transition-all duration-500 bg-[#0d1527]/30 ${
        isWatched
          ? "border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)] bg-emerald-950/5"
          : "border-white/5 hover:border-blue-500/50"
      }`}
    >
      {/* Dynamic Watched Neon Badge */}
      {isWatched && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-md text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider italic shadow-lg shadow-emerald-500/20 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="w-3 h-3 text-black stroke-[3]" />
          Watched
        </div>
      )}

      {/* Movie Poster */}
      <img
        src={
          movie?.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "https://placehold.co/500x750/1a2235/666?text=No+Poster"
        }
        alt={movie?.title || movie?.name}
        className={`w-full aspect-[2/3] object-cover transition-all duration-700 ${
          isWatched
            ? "opacity-50 grayscale-[0.3] group-hover:grayscale-0 group-hover:opacity-80 group-hover:scale-105"
            : "group-hover:scale-105"
        }`}
      />

      {/* Overlay info on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080d17] via-[#080d17]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5">
        <h3 className="text-white font-black uppercase italic text-xs tracking-tighter leading-snug truncate">
          {movie?.title || movie?.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-blue-500 font-black text-[10px] flex items-center gap-1">
            <Star className="w-3 h-3 fill-blue-500" /> TMDB Media
          </span>
          {isWatched && (
            <span className="text-emerald-400 font-bold text-[9px] uppercase tracking-wide">
              • Viewed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
