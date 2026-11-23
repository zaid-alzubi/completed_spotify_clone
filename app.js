"use strict";
const audio = document.getElementById("audio"),
  playBtn = document.getElementById("playBtn"),
  likeBtn = document.getElementById("playerLike");
let currentIndex = 0;
const getLikes = () => {
  try {
    return JSON.parse(localStorage.getItem("spotifyLikes") || "[]");
  } catch {
    return [];
  }
};
const liked = (id) => getLikes().includes(id);
const fmt = (time) =>
  Number.isFinite(time)
    ? `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`
    : "0:00";
// Store song durations to avoid loading them repeatedly
const songDurations = new Map();
const loadingDurations = new Set();

function getSongDuration(song) {
  if (songDurations.has(song.id) || loadingDurations.has(song.id)) {
    return;
  }

  loadingDurations.add(song.id);

  const tempAudio = new Audio();
  tempAudio.preload = "metadata";

  tempAudio.addEventListener(
    "loadedmetadata",
    () => {
      songDurations.set(song.id, fmt(tempAudio.duration));
      loadingDurations.delete(song.id);

      document.querySelectorAll(".song-row").forEach((row) => {
        if (Number(row.dataset.songId) === song.id) {
          const durationElement = row.querySelector(".duration");

          if (durationElement) {
            durationElement.textContent = songDurations.get(song.id);
          }
        }
      });
    },
    { once: true },
  );

  tempAudio.addEventListener(
    "error",
    () => {
      songDurations.set(song.id, "--:--");
      loadingDurations.delete(song.id);

      document.querySelectorAll(".song-row").forEach((row) => {
        if (Number(row.dataset.songId) === song.id) {
          const durationElement = row.querySelector(".duration");

          if (durationElement) {
            durationElement.textContent = "--:--";
          }
        }
      });
    },
    { once: true },
  );

  tempAudio.src = song.src;
}
function renderSongs() {
  const list = document.getElementById("songList");
  if (!list) return;
  let shown = songs;
  if (document.body.dataset.page === "liked")
    shown = songs.filter((s) => liked(s.id));
  if (document.body.dataset.page === "search") {
    const q = (document.getElementById("searchInput")?.value || "")
      .trim()
      .toLowerCase();
    shown = songs.filter((s) =>
      (s.title + " " + s.artist).toLowerCase().includes(q),
    );
    document.getElementById("resultCount").textContent =
      `${shown.length} result${shown.length === 1 ? "" : "s"} • Demo tracks`;
  }
  if (!shown.length) {
    list.innerHTML =
      '<p class="empty-state">No songs found. Try a different search or add songs to your favorites.</p>';
    return;
  }
  list.replaceChildren(
    ...shown.map((song) => {
      const row = document.createElement("div");
      row.className =
        "song-row" +
        (songs[currentIndex].id === song.id && !audio.paused ? " current" : "");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", "Play " + song.title);
      row.dataset.songId = song.id;
      const num = document.createElement("span");
      num.textContent = String(song.id);
      const img = document.createElement("img");
      img.src = song.cover;
      img.alt = "";
      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "song-name";
      title.textContent = song.title;
      const artist = document.createElement("div");
      artist.className = "song-artist";
      artist.textContent = song.artist;
      info.append(title, artist);
      const dur = document.createElement("span");
      dur.className = "duration";

      dur.textContent = songDurations.get(song.id) || "--:--";

      getSongDuration(song);
      const heart = document.createElement("button");
      heart.className = "icon-btn heart-btn" + (liked(song.id) ? " liked" : "");
      heart.textContent = liked(song.id) ? "♥" : "♡";
      heart.setAttribute("aria-label", liked(song.id) ? "Unlike" : "Like");
      heart.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLike(song.id);
      });
      row.append(num, img, info, dur, heart);
      row.addEventListener("click", () => selectSong(song.id, true));
      row.addEventListener("keydown", (e) => {
        if (e.target === row && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          selectSong(song.id, true);
        }
      });
      return row;
    }),
  );
}
function updatePlayer() {
  const song = songs[currentIndex];
  document.getElementById("playerTitle").textContent = song.title;
  document.getElementById("playerArtist").textContent = song.artist;
  document.getElementById("playerCover").src = song.cover;
  likeBtn.textContent = liked(song.id) ? "♥" : "♡";
  likeBtn.classList.toggle("liked", liked(song.id));
  likeBtn.setAttribute(
    "aria-label",
    liked(song.id) ? "Unlike song" : "Like song",
  );
  playBtn.textContent = audio.paused ? "▶" : "❚❚";
  playBtn.setAttribute("aria-label", audio.paused ? "Play" : "Pause");
  renderSongs();
}
function selectSong(id, autoplay = false) {
  const index = songs.findIndex((s) => s.id === id);
  if (index < 0) return;
  currentIndex = index;
  audio.src = songs[index].src;
  audio.load();
  updatePlayer();
  if (autoplay) audio.play().catch(() => {});
}
function toggleLike(id) {
  const likes = getLikes();
  const next = likes.includes(id)
    ? likes.filter((x) => x !== id)
    : [...likes, id];
  localStorage.setItem("spotifyLikes", JSON.stringify(next));
  updatePlayer();
}
playBtn.addEventListener("click", () => {
  if (!audio.src) selectSong(songs[currentIndex].id);
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
});
document
  .getElementById("nextBtn")
  .addEventListener("click", () =>
    selectSong(songs[(currentIndex + 1) % songs.length].id, true),
  );
document.getElementById("prevBtn").addEventListener("click", () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  selectSong(songs[(currentIndex - 1 + songs.length) % songs.length].id, true);
});
likeBtn.addEventListener("click", () => toggleLike(songs[currentIndex].id));
audio.addEventListener("play", updatePlayer);
audio.addEventListener("pause", updatePlayer);
audio.addEventListener("ended", () =>
  selectSong(songs[(currentIndex + 1) % songs.length].id, true),
);
audio.addEventListener("timeupdate", () => {
  document.getElementById("currentTime").textContent = fmt(audio.currentTime);
  document.getElementById("seek").value = audio.duration
    ? (audio.currentTime / audio.duration) * 100
    : 0;
});
audio.addEventListener(
  "loadedmetadata",
  () => (document.getElementById("duration").textContent = fmt(audio.duration)),
);
document.getElementById("seek").addEventListener("input", (e) => {
  if (audio.duration)
    audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
});
document
  .getElementById("volume")
  .addEventListener("input", (e) => (audio.volume = Number(e.target.value)));
audio.volume = 0.7;
document.getElementById("searchInput")?.addEventListener("input", renderSongs);
document.querySelectorAll("[data-play]").forEach((card) => {
  const run = () => {
    selectSong(Number(card.dataset.play) + 1, true);
  };
  card.addEventListener("click", run);
  card.addEventListener(
    "dblclick",
    () =>
      (location.href = "playlist.html?id=" + (Number(card.dataset.play) + 1)),
  );
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      run();
    }
  });
});
const user = sessionStorage.getItem("spotifyDemoSession");
if (user) {
  const area = document.getElementById("authArea");
  area.replaceChildren();
  const wrap = document.createElement("div");
  wrap.className = "user-controls";
  const email = document.createElement("span");
  email.className = "user-email";
  email.textContent = user;
  const out = document.createElement("button");
  out.className = "logout-btn";
  out.textContent = "Log out";
  out.addEventListener("click", () => {
    sessionStorage.removeItem("spotifyDemoSession");
    location.href = "login.html";
  });
  wrap.append(email, out);
  area.append(wrap);
}
// Static-file routing: page navigation uses real HTML links and optional query parameters.
// A URL like /likedSongs/:id requires a server-side fallback and is not supported by file:// hosting.
document
  .getElementById("playlistPlay")
  ?.addEventListener("click", () => selectSong(1, true));
const requestedId = Number(new URLSearchParams(location.search).get("id"));
selectSong(songs.some((s) => s.id === requestedId) ? requestedId : 1);
