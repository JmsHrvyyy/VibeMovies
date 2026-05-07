const MovieCard = ({ movie }) => {
  return (
    <div className="group relative bg-white/5 backdrop-blur-md rounded-[2rem] p-3 border border-white/10 hover:bg-white/10 transition-all duration-500 shadow-2xl">
      <div className="relative overflow-hidden rounded-[1.5rem]">
        <img
          src={
            movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : "https://via.placeholder.com/500x750"
          }
          className="w-full h-[320px] object-cover group-hover:scale-110 transition-transform duration-500"
          alt={movie.title}
        />
        {/* Rating Badge sa loob ng image */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
          <span className="text-yellow-400 text-xs">⭐</span>
          <span className="text-xs font-bold">
            {movie.vote_average?.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="mt-4 px-2 pb-2">
        <h3 className="font-bold text-white text-lg truncate group-hover:text-blue-400 transition-colors">
          {movie.title}
        </h3>
        <div className="flex justify-between items-center mt-1">
          <p className="text-gray-400 text-sm">
            {movie.release_date?.split("-")[0]}
          </p>
          <button className="bg-white/10 hover:bg-blue-600 p-2 rounded-full transition-all border border-white/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
