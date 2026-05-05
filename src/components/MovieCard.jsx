const MovieCard = ({ movie }) => {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-all group relative">
      <img 
        src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750'} 
        className="w-full h-[400px] object-cover"
        alt={movie.title}
      />
      
      {/* Overlay para sa Watchlist Button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="bg-blue-600 p-2 rounded-full hover:bg-blue-700 shadow-lg">
          {/* Plus Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white truncate">{movie.title}</h3>
        <p className="text-gray-400 text-sm">{movie.release_date?.split('-')[0]}</p>
      </div>
    </div>
  );
};

export default MovieCard;