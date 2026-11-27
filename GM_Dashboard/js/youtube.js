window.YoutubeRegie = (() => {
  const STORAGE_KEY = "mj_youtube_presets_v1";
  const VOLUME_KEY = "mj_youtube_volume_v1";

  const DEFAULT_PRESETS = [
    { label: "Taverne médiévale", id: "roABNwbjZf4", isPlaylist: false },
    { label: "Exploration & Forêt", id: "xNN7iTA57jM", isPlaylist: false },
    { label: "Combat épique", id: "pFS4zYWxzNA", isPlaylist: false }
  ];

  let presets = [];
  let player = null;
  let isApiReady = false;
  let isLooping = true;
  let volume = Number(localStorage.getItem(VOLUME_KEY)) || 70;

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

  function setStatus(text, isError = false) {
    const el = document.getElementById("yt-now-playing");
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "var(--accent-red)" : "var(--accent-gold)";
  }

  function parseYoutubeInput(input) {
    const trimmed = input.trim();
    const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) return { id: listMatch[1], isPlaylist: true };

    const videoMatch = trimmed.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (videoMatch) return { id: videoMatch[1], isPlaylist: false };

    return { id: trimmed, isPlaylist: trimmed.startsWith("PL") || trimmed.startsWith("OLAK") };
  }

  function playMedia(preset) {
    if (!player || !isApiReady) return;
    setStatus(`Chargement : ${preset.label}…`);

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

  function bindDeckControls() {
    const playBtn = document.getElementById("btn-yt-play");
    const prevBtn = document.getElementById("btn-yt-prev");
    const nextBtn = document.getElementById("btn-yt-next");
    const loopBtn = document.getElementById("btn-yt-loop");
    const volSlider = document.getElementById("yt-volume");
    const volVal = document.getElementById("yt-volume-val");
    const toggleVideoBtn = document.getElementById("btn-toggle-video");
    const wrapper = document.getElementById("youtube-wrapper");

    volSlider.value = volume;
    volVal.textContent = `${volume} %`;

    playBtn.addEventListener("click", () => {
      if (!player || !isApiReady) return;
      const state = player.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    });

    prevBtn.addEventListener("click", () => {
      if (player && isApiReady) player.previousVideo();
    });

    nextBtn.addEventListener("click", () => {
      if (player && isApiReady) player.nextVideo();
    });

    loopBtn.addEventListener("click", () => {
      isLooping = !isLooping;
      loopBtn.classList.toggle("active", isLooping);
      if (player && isApiReady && typeof player.setLoop === "function") {
        player.setLoop(isLooping);
      }
    });

    volSlider.addEventListener("input", e => {
      volume = Number(e.target.value);
      volVal.textContent = `${volume} %`;
      localStorage.setItem(VOLUME_KEY, volume);
      if (player && isApiReady) player.setVolume(volume);
    });

    toggleVideoBtn.addEventListener("click", () => {
      const hidden = wrapper.classList.toggle("video-hidden");
      toggleVideoBtn.textContent = hidden ? "👁 Vidéo" : "🙈 Masquer";
    });
  }

  function init() {
    loadPresets();
    renderPresets();
    bindDeckControls();

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      player = new YT.Player("yt-player", {
        videoId: presets[0]?.id || "roABNwbjZf4",
        playerVars: { autoplay: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            isApiReady = true;
            player.setVolume(volume);
          },
          onStateChange: e => {
            const playBtn = document.getElementById("btn-yt-play");
            const title = player.getVideoData?.()?.title;

            if (e.data === YT.PlayerState.PLAYING) {
              playBtn.textContent = "⏸ Pause";
              if (title) setStatus(`🎵 ${title}`);
            } else if (e.data === YT.PlayerState.PAUSED) {
              playBtn.textContent = "▶ Lecture";
            } else if (e.data === YT.PlayerState.ENDED && isLooping) {
              player.seekTo(0);
              player.playVideo();
            }
          },
          onError: () => {
            setStatus("⚠️ Titre bloqué par YouTube (lecture externe interdite)", true);
          }
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