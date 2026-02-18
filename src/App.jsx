import React, { useState, useMemo, useEffect } from 'react';

// Helper to ignore "The", "A", and "An" at the start of strings for sorting
const getSortName = (name) => {
  if (!name) return "";
  return name.replace(/^(the|a|an)\s+/i, "").trim().toLowerCase();
};

// Simplified AlbumCard: Just displays the cover provided by the metadata
const AlbumCard = ({ album, onClick }) => {
  return (
    <div className="album-card" onClick={() => onClick(album)}>
      <div className="album-art-container">
        {album.cover ? (
          <img src={album.cover} alt={album.title} loading="lazy" />
        ) : (
          <div className="placeholder-art"><span>{album.title[0]}</span></div>
        )}
      </div>
      <div className="album-info">
        <h3>{album.title}</h3>
        <p>{album.artist}</p>
      </div>
    </div>
  );
};

const MusicLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('All');
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [libraryData, setLibraryData] = useState([]);

  // Fetch the metadata.json from the server (handled by your Docker volume)
  useEffect(() => {
    fetch('./metadata.json')
      .then(res => res.json())
      .then(data => setLibraryData(data))
      .catch(err => console.error("Error loading library metadata:", err));
  }, []);

  const { artists, albums } = useMemo(() => {
    const artistSet = new Set();
    const albumMap = {};

    libraryData.forEach(track => {
      if (track.artist) artistSet.add(track.artist);
      const albumKey = `${track.artist} - ${track.album}`;
      
      if (!albumMap[albumKey]) {
        albumMap[albumKey] = { 
          title: track.album, 
          artist: track.artist, 
          cover: track.coverUrl || null, // URL from your FLAC COVERURL tag
          tracks: [] 
        };
      }
      // If we haven't found a cover yet, but this track has one, grab it
      if (!albumMap[albumKey].cover && track.coverUrl) {
        albumMap[albumKey].cover = track.coverUrl;
      }
      
      albumMap[albumKey].tracks.push(track);
    });

    const sortedArtists = Array.from(artistSet).sort((a, b) => 
      getSortName(a).localeCompare(getSortName(b))
    );

    const sortedAlbums = Object.values(albumMap)
      .map(album => ({
        ...album,
        tracks: album.tracks.sort((a, b) => (a.track || 0) - (b.track || 0))
      }))
      .sort((a, b) => 
        getSortName(a.title).localeCompare(getSortName(b.title))
      );

    return { artists: sortedArtists, albums: sortedAlbums };
  }, [libraryData]);

  const filteredAlbums = albums.filter(album => {
    const matchesArtist = selectedArtist === 'All' || album.artist === selectedArtist;
    const matchesSearch = album.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          album.artist.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesArtist && matchesSearch;
  });

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">GET HARD</div>
          <input 
            type="text" 
            placeholder="Search library..." 
            className="search-bar"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={() => setSelectedArtist('All')}
            className={`artist-item all-btn ${selectedArtist === 'All' ? 'active' : ''}`}
          >
            All Music
          </button>
          <div className="sidebar-divider" />
        </div>
        <nav className="artist-list">
          <p className="section-label">Artists</p>
          {artists.map(artist => (
            <button 
              key={artist}
              onClick={() => setSelectedArtist(artist)}
              className={`artist-item ${selectedArtist === artist ? 'active' : ''}`}
            >
              {artist}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-viewport">
        <header className="view-header">
          <h2>{selectedArtist}</h2>
          <span>{filteredAlbums.length} Albums Found</span>
        </header>

        <div className="album-grid">
          {filteredAlbums.map(album => (
            <AlbumCard 
              key={`${album.artist}-${album.title}`} 
              album={album} 
              onClick={setSelectedAlbum} 
            />
          ))}
        </div>
      </main>

      {selectedAlbum && (
        <div className="modal-overlay" onClick={() => setSelectedAlbum(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-art-mini">
                <img src={selectedAlbum.cover} alt={selectedAlbum.title} />
              </div>
              <div>
                <h2>{selectedAlbum.title}</h2>
                <p className="accent-text">{selectedAlbum.artist}</p>
              </div>
            </div>
            <div className="track-list">
              {selectedAlbum.tracks.map((t, i) => (
                <div key={i} className="track-row">
                  <span className="track-number">{t.track || i + 1}</span>
                  <span className="track-title">{t.title}</span>
                </div>
              ))}
            </div>
            <button className="close-btn" onClick={() => setSelectedAlbum(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicLibrary;