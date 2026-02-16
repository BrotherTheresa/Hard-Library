import React, { useState, useMemo, useEffect } from 'react';
import libraryData from './metadata.json';

// Helper to ignore "The", "A", and "An" at the start of strings for sorting
const getSortName = (name) => {
  if (!name) return "";
  return name.replace(/^(the|a|an)\s+/i, "").trim().toLowerCase();
};

const AlbumCard = ({ album, onClick }) => {
  const [cover, setCover] = useState(null);
  const cacheKey = `cover-${album.artist}-${album.title}`;

  const getArt = async (force = false) => {
    if (album.customCover) {
      setCover(album.customCover);
      return;
    }

    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return setCover(cached);
    }

    try {
      await new Promise(r => setTimeout(r, 600)); 
      const searchUrl = `https://musicbrainz.org/ws/2/release/?query=release:${encodeURIComponent(album.title)}%20AND%20artist:${encodeURIComponent(album.artist)}&fmt=json`;
      const res = await fetch(searchUrl, { headers: { 'User-Agent': 'MediaLib/1.0' } });
      const data = await res.json();

      if (data.releases?.[0]) {
        const imgUrl = `https://coverartarchive.org/release/${data.releases[0].id}/front-250`;
        setCover(imgUrl);
        localStorage.setItem(cacheKey, imgUrl);
      }
    } catch (e) { console.error("API Error", e); }
  };

  const handleManualUpdate = (e) => {
    e.stopPropagation();
    const newUrl = prompt("Paste direct image URL (ends in .jpg/.png):");
    if (newUrl && newUrl.startsWith('http')) {
      setCover(newUrl);
      localStorage.setItem(cacheKey, newUrl);
    }
  };

  useEffect(() => { getArt(); }, [album.artist, album.title]);

  return (
    <div className="album-card" onClick={() => onClick(album)}>
      <div className="album-art-container">
        <div className="art-controls">
          <button className="control-btn" onClick={(e) => { e.stopPropagation(); getArt(true); }} title="Auto-Refresh">↻</button>
          <button className="control-btn" onClick={handleManualUpdate} title="Paste URL">✎</button>
        </div>
        {cover ? (
          <img src={cover} alt={album.title} loading="lazy" />
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
          customCover: track.coverUrl || null,
          tracks: [] 
        };
      }
      albumMap[albumKey].tracks.push(track);
    });

    // Alphabetize Artists ignoring "The/A/An"
    const sortedArtists = Array.from(artistSet).sort((a, b) => 
      getSortName(a).localeCompare(getSortName(b))
    );

    // Alphabetize Albums AND sort tracks within each album
    const sortedAlbums = Object.values(albumMap)
      .map(album => ({
        ...album,
        // Sort tracks by track number before returning
        tracks: album.tracks.sort((a, b) => (a.track || 0) - (b.track || 0))
      }))
      .sort((a, b) => 
        getSortName(a.title).localeCompare(getSortName(b.title))
      );

    return { artists: sortedArtists, albums: sortedAlbums };
  }, []);

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
                <img src={localStorage.getItem(`cover-${selectedAlbum.artist}-${selectedAlbum.title}`) || selectedAlbum.customCover} alt="" />
              </div>
              <div>
                <h2>{selectedAlbum.title}</h2>
                <p className="accent-text">{selectedAlbum.artist}</p>
              </div>
            </div>
            <div className="track-list">
              {selectedAlbum.tracks.map((t, i) => (
                <div key={i} className="track-row">
                  <span className="track-number">{i + 1}</span>
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