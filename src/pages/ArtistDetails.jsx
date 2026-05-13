import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getArtistDetails } from "../services/api";
import MovieCard from "../components/MovieCard";

const ArtistDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const data = await getArtistDetails(id);
        setArtist(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtist();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center text-white font-black italic">
        LOADING ARTIST...
      </div>
    );
  if (!artist)
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center text-white">
        Artist not found.
      </div>
    );

  const topMovies = artist.combined_credits?.cast
    ? artist.combined_credits.cast
        // 1. Siguraduhin na pelikula o TV show ito at may poster
        .filter((media) => media.poster_path !== null)
        // 2. I-sort by popularity para yung pinakasikat ang mauna
        .sort((a, b) => b.popularity - a.popularity)
        // 3. Limitahan lang sa top 10 o 15 para hindi sabog ang layout
        .slice(0, 10)
    : [];

  return (
    <div className="min-h-screen bg-[#080d17] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="mb-10 flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors font-black text-[10px] uppercase tracking-[0.3em]"
        >
          <span className="text-lg">←</span> Back to Profile
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-20">
          {/* SIDEBAR: PORTRAIT IMAGE */}
          <div className="md:col-span-4 lg:col-span-4">
            <div className="bg-[#1a2235] p-4 rounded-[3rem] border border-white/5 shadow-2xl sticky top-12">
              <img
                src={`https://image.tmdb.org/t/p/w500${artist.profile_path}`}
                className="w-full aspect-[2/3] object-cover rounded-[2.5rem]"
                alt={artist.name}
              />

              <div className="mt-8 space-y-6 px-4 pb-4">
                <div>
                  <p className="text-gray-600 font-black uppercase text-[9px] tracking-[0.2em] mb-1">
                    Birthday
                  </p>
                  <p className="text-white font-bold text-sm">
                    {artist.birthday || "Not available"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-black uppercase text-[9px] tracking-[0.2em] mb-1">
                    Place of Birth
                  </p>
                  <p className="text-white font-bold text-sm leading-snug">
                    {artist.place_of_birth || "Not available"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT: BIOGRAPHY & FILMOGRAPHY */}
          <div className="md:col-span-8 lg:col-span-8 pt-4">
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-2 leading-none">
              {artist.name}
            </h1>
            <p className="text-red-600 font-black uppercase tracking-[0.5em] text-xs mb-12 flex items-center gap-3">
              <span className="w-10 h-[2px] bg-red-600" />
              {artist.known_for_department}
            </p>

            {/* BIOGRAPHY BOX */}
            <div className="bg-white/5 border border-white/5 rounded-[3rem] p-8 md:p-12 mb-16">
              <h3 className="text-white font-black uppercase italic mb-6 tracking-widest text-lg">
                Biography
              </h3>
              <p className="text-gray-400 leading-relaxed font-medium text-lg">
                {artist.biography || "No biography available for this artist."}
              </p>
            </div>

            {/* FILMOGRAPHY SECTION */}
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-2.5 h-10 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                    Known For
                  </h3>
                </div>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                  Featured Filmography
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistDetails;
