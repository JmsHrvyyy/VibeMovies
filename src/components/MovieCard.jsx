import { useNavigate } from "react-router-dom";

const MovieCard = ({ movie, onAddToWatchlist, isWatched }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    // Kung galing sa search or artist credits, may media_type yan (movie or tv)
    const type = movie.media_type === "tv" ? "tv" : "movie";
    navigate(`/${type}/${movie.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative cursor-pointer rounded-[2rem] overflow-hidden border transition-all duration-500 ${
        isWatched
          ? "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
          : "border-white/5 hover:border-blue-500/50"
      }`}
    >
      {isWatched && (
        <div className="absolute top-4 right-4 z-10 bg-green-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase italic shadow-lg">
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
            ? "opacity-60 grayscale-[0.5] group-hover:grayscale-0"
            : "group-hover:scale-110"
        }`}
      />

      {/* Overlay info on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080d17] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
        <h3 className="text-white font-black uppercase italic text-sm truncate tracking-tighter">
          {movie?.title || movie?.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-blue-500 font-black text-[10px]">
            ⭐ {movie?.vote_average?.toFixed(1)}
          </span>
          <span className="text-gray-400 font-bold text-[8px] uppercase tracking-widest">
            {movie?.release_date?.split("-")[0]}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
