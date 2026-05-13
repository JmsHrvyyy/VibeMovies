import { useNavigate } from "react-router-dom";

const ArtistCard = ({ artist }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/artist/${artist.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer bg-white/5 rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-red-500/50 transition-all duration-500"
    >
      {/* Artist Photo - Laging Colored na ito */}
      <img
        src={
          artist.profile_path || artist.image
            ? `https://image.tmdb.org/t/p/w500${artist.profile_path || artist.image}`
            : "https://via.placeholder.com/500x750?text=No+Image"
        }
        alt={artist.name}
        className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-700"
      />

      {/* Info Overlay - Visible Full Name */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6">
        <h3 className="text-white font-black uppercase italic text-sm leading-tight tracking-tighter group-hover:text-red-500 transition-colors">
          {/* Tinanggal ang 'truncate' para mag-wrap ang text kung mahaba ang name */}
          {artist.name}
        </h3>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">
            {artist.known_for_department || "Artist"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;
