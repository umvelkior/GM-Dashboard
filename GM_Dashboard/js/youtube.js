window.YoutubeRegie = (() => {
    const STORAGE_KEY = "mj_youtube_presets_v1";
    const DEFAULT_PRESETS = [
      { label: "Taverne médiévale", id: "roABNwbjZf4", isPlaylist: false },
      { label: "Exploration & Forêt", id: "xNN7iTA57jM", isPlaylist: false },
      { label: "Combat épique", id: "pFS4zYWxzNA", isPlaylist: false }
    ];
  
    let presets = [];
    let player = null;
    let isApiReady = false;
  
    function loadPresets() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          presets = JSON.parse(raw);
          return;
        } catch (e) {}
      }
      presets = [...DEFAULT_PRESETS];
    }
  
    function savePresets() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }
  
    function parseYoutubeInput(input) {
      const trimmed = input.trim();
      const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (listMatch) return { id: listMatch[1], isPlaylist: true };
  
      const videoMatch = trimmed.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (videoMatch) return { id: videoMatch[1], isPlaylist: false };
  
      return { id: trimmed, isPlaylist: trimmed.startsWith("PL") };
    }
  
    function playMedia(preset) {
      if (!player || !isApiReady) return;
      if (preset.isPlaylist) {
        player.loadPlaylist({ list: preset.id, listType: "playlist" });
      } else {
        player.loadVideoById(preset.id);
      }
    }
  
    function renderPresets() {
      const container = document.getElementById("youtube-presets");
      container.innerHTML = "";
  
      presets.forEach((preset, idx) => {
        const row = document.createElement("div");
        row.className = "preset-item";
        row.innerHTML = `
          <button class="preset-play-btn">▶ ${preset.label}</button>
          <button class="btn-danger btn-sm" title="Supprimer">✕</button>
        `;
  
        row.querySelector(".preset-play-btn").addEventListener("click", () => playMedia(preset));
        row.querySelector(".btn-danger").addEventListener("click", () => {
          presets.splice(idx, 1);
          savePresets();
          renderPresets();
        });
  
        container.appendChild(row);
      });
    }
  
    function init() {
      loadPresets();
      renderPresets();
  
      // Chargement asynchrone de l'API IFrame YouTube
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
  
      window.onYouTubeIframeAPIReady = () => {
        player = new YT.Player("yt-player", {
          videoId: presets[0]?.id || "roABNwbjZf4",
          playerVars: { autoplay: 0, modestbranding: 1, rel: 0 },
          events: {
            onReady: () => { isApiReady = true; }
          }
        });
      };
  
      document.getElementById("add-preset-form").addEventListener("submit", e => {
        e.preventDefault();
        const label = document.getElementById("preset-label").value.trim();
        const parsed = parseYoutubeInput(document.getElementById("preset-url").value);
        if (!label || !parsed.id) return;
  
        presets.push({ label, ...parsed });
        savePresets();
        renderPresets();
        e.target.reset();
      });
    }
  
    return { init };
  })();