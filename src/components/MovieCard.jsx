import { useNavigate } from "react-router-dom";

const MovieCard = ({ movie, onAddToWatchlist }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/movie/${movie.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer bg-white/5 rounded-[2rem] overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-500"
    >
      {/* Movie Poster */}
      <img
        src={
          movie?.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Image"
        }
        alt={movie?.title || movie?.name}
        className="w-full aspect-[2/3] object-cover group-hover:scale-110 group-hover:rotate-2 transition-transform duration-700"
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
