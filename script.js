// Floating hearts background
const heartsContainer = document.getElementById("heartsContainer");

function createHeart() {
  if (!heartsContainer) return;

  const heart = document.createElement("div");
  heart.className = "heart";
  heart.textContent = Math.random() > 0.4 ? "❤" : "♡";

  const size = 10 + Math.random() * 28;
  const left = Math.random() * 100;
  const delay = Math.random() * 8;
  const duration = 8 + Math.random() * 8;

  heart.style.left = `${left}vw`;
  heart.style.fontSize = `${size}px`;
  heart.style.animationDelay = `-${delay}s`;
  heart.style.animationDuration = `${duration}s`;

  heartsContainer.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, duration * 1000 + 1000);
}

for (let i = 0; i < 40; i += 1) {
  createHeart();
}

setInterval(createHeart, 900);

// 3D Valentine card flip
const card = document.getElementById("valentineCard");
const openCardBtn = document.getElementById("openCardBtn");

if (card) {
  const toggleCard = () => {
    card.classList.toggle("flipped");
  };

  card.addEventListener("click", toggleCard);
  if (openCardBtn) {
    openCardBtn.addEventListener("click", toggleCard);
  }
}

// Timeline / memory bubbles
const memoryBubbles = document.querySelectorAll(".memory-bubble");
const memoryMessage = document.getElementById("memoryMessage");

memoryBubbles.forEach((bubble) => {
  bubble.addEventListener("click", () => {
    memoryBubbles.forEach((b) => b.classList.remove("active"));
    bubble.classList.add("active");

    const message = bubble.getAttribute("data-message") || "";
    if (memoryMessage) {
      memoryMessage.textContent = message;
      memoryMessage.classList.remove("pop");
      // trigger reflow so animation can replay
      void memoryMessage.offsetWidth;
      memoryMessage.classList.add("pop");
    }
  });
});

// Small pop animation for memory message (injected via JS)
const style = document.createElement("style");
style.innerHTML = `
  .memory-message.pop {
    animation: popMessage 0.4s ease;
  }
  @keyframes popMessage {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(style);

// Music dashboard: scroll + play / pause audio
const memoryBtn = document.getElementById("memoryBtn");
const musicDashboard = document.getElementById("musicDashboard");
const playSongBtn = document.getElementById("playSongBtn");
const bgSong = document.getElementById("bgSong");
const eqBars = document.getElementById("eqBars"); // may not exist; ignore if null
const handSensor = document.createElement("div");
handSensor.className = "hand-sensor";
const cameraSection = document.getElementById("cameraGalaxy");
const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraStatus = document.getElementById("cameraStatus");
const galaxyOverlay = document.getElementById("galaxyOverlay");
let cameraStream = null;
let scanId = null;

// song popup
const songPopup = document.getElementById("songPopup");
const openSongPopupBtn = document.getElementById("openSongPopupBtn");
const closeSongPopupBtn = document.getElementById("closeSongPopupBtn");
const songTitleEl = document.getElementById("songTitle");
const songArtistEl = document.getElementById("songArtist");
const heartBeatCanvas = document.getElementById("heartBeatCanvas");
const lyricsBox = document.getElementById("lyricsLines");
const lyricsSongLabel = document.getElementById("lyricsSongLabel");

if (memoryBtn && musicDashboard) {
  memoryBtn.addEventListener("click", () => {
    musicDashboard.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

if (musicDashboard) {
  musicDashboard.appendChild(handSensor);

  const moveSensor = (x, y) => {
    const rect = musicDashboard.getBoundingClientRect();
    const clampedX = Math.max(rect.left, Math.min(x, rect.right));
    const clampedY = Math.max(rect.top, Math.min(y, rect.bottom));
    const localX = clampedX - rect.left;
    const localY = clampedY - rect.top;
    handSensor.style.transform = `translate3d(${localX - 30}px, ${
      localY - 30
    }px, 0)`;
  };

  musicDashboard.addEventListener("pointermove", (event) => {
    moveSensor(event.clientX, event.clientY);
  });

  musicDashboard.addEventListener("pointerleave", () => {
    handSensor.style.transform = "translate3d(-9999px, -9999px, 0)";
  });
}

if (playSongBtn && bgSong) {
  const setPlayingText = (playing) => {
    playSongBtn.textContent = playing ? "Pause Song ⏸️" : "Play Song ▶️";
    if (eqBars) {
      eqBars.classList.toggle("playing", playing);
    }
  };

  playSongBtn.addEventListener("click", () => {
    if (bgSong.paused) {
      bgSong
        .play()
        .then(() => setPlayingText(true))
        .catch(() => setPlayingText(false));
    } else {
      bgSong.pause();
      setPlayingText(false);
    }
  });

  bgSong.addEventListener("ended", () => setPlayingText(false));
}

// popup pilih lagu
function openSongPopup() {
  if (!songPopup) return;
  songPopup.classList.add("show");
  songPopup.setAttribute("aria-hidden", "false");
}

function closeSongPopup() {
  if (!songPopup) return;
  songPopup.classList.remove("show");
  songPopup.setAttribute("aria-hidden", "true");
}

if (openSongPopupBtn) {
  openSongPopupBtn.addEventListener("click", openSongPopup);
}

if (closeSongPopupBtn) {
  closeSongPopupBtn.addEventListener("click", closeSongPopup);
}

if (songPopup) {
  songPopup.addEventListener("click", (event) => {
    if (event.target === songPopup || event.target.classList.contains("song-popup-overlay")) {
      closeSongPopup();
    }
  });

  const choices = songPopup.querySelectorAll(".song-choice");
  choices.forEach((choice) => {
    choice.addEventListener("click", () => {
      if (!bgSong) return;
      const src = choice.getAttribute("data-song-src");
      const title = choice.getAttribute("data-song-title");
      const artist = choice.getAttribute("data-song-artist");

      if (src) {
        bgSong.src = src;
        bgSong
          .play()
          .catch(() => {
            // ignore play error; user can press Play Song manually
          });
        if (songTitleEl && title) songTitleEl.textContent = title;
        if (songArtistEl && artist) songArtistEl.textContent = artist;
        showLyricsForSong(src);
        startLyricsAnimation();
      }

      closeSongPopup();
    });
  });
}

// Heartbeat network animation (2D canvas, pink)
if (heartBeatCanvas) {
  const ctx = heartBeatCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const points = [];
  const COUNT = 90;

  function resizeHeartCanvas() {
    const rect = heartBeatCanvas.getBoundingClientRect();
    heartBeatCanvas.width = rect.width * dpr;
    heartBeatCanvas.height = rect.height * dpr;
  }

  function generateHeartPoints() {
    points.length = 0;
    for (let i = 0; i < COUNT; i += 1) {
      const t = (i / COUNT) * Math.PI * 2;
      // heart parametric (scaled)
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      // normalize to [-1,1]
      const nx = x / 18;
      const ny = y / 18;
      points.push({
        baseX: nx,
        baseY: -ny,
        offset: Math.random() * Math.PI * 2,
      });
    }
  }

  resizeHeartCanvas();
  generateHeartPoints();

  window.addEventListener("resize", () => {
    resizeHeartCanvas();
  });

  function renderHeart(time) {
    if (!ctx) return;
    const t = time * 0.001;
    const { width, height } = heartBeatCanvas;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 + 8 * dpr;
    const scale = Math.min(width, height) * 0.12 * (1 + 0.12 * Math.sin(t * 3));

    // compute positions
    const pos = points.map((p) => {
      const wobble = 0.04 * Math.sin(t * 2 + p.offset);
      const x = (p.baseX * (1 + wobble)) * scale + cx;
      const y = (p.baseY * (1 + wobble)) * scale + cy;
      return { x, y };
    });

    // draw connections
    ctx.lineWidth = 0.8 * dpr;
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = i + 1; j < pos.length; j += 1) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40 * dpr) {
          const alpha = 1 - dist / (40 * dpr);
          const gradient = ctx.createLinearGradient(
            pos[i].x,
            pos[i].y,
            pos[j].x,
            pos[j].y
          );
          gradient.addColorStop(0, `rgba(251, 113, 133, ${0.2 * alpha})`);
          gradient.addColorStop(1, `rgba(244, 114, 182, ${0.5 * alpha})`);
          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(pos[i].x, pos[i].y);
          ctx.lineTo(pos[j].x, pos[j].y);
          ctx.stroke();
        }
      }
    }

    // draw points
    for (let i = 0; i < pos.length; i += 1) {
      ctx.beginPath();
      const pulse = 1 + 0.4 * Math.sin(t * 3 + points[i].offset);
      ctx.arc(pos[i].x, pos[i].y, 1.4 * dpr * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(253, 164, 175, 0.9)";
      ctx.fill();
    }

    requestAnimationFrame(renderHeart);
  }

  requestAnimationFrame(renderHeart);
}

// Simple lyric sequencer per song (timing lucu, tidak sinkron persis)
const LYRICS = {
  "marvin-gaye.mp3": [
    "Let's Marvin Gaye and get it on",
    "You got the healin' that I want",
    "Just like they say it in the song",
    "Until the dawn, let's Marvin Gaye and get it on",
    "There's lovin' in your eyes that pulls me closer",
    "It's so subtle, I'm in trouble",
    "But I'd rather be in trouble with you"
  ],
  "lihat-kebunku.mp3": [
    "Lihat kebunku, tercipta sempurna, sederhana satu yang kupunya",
    "Setiap hari, kusiram sendiri, wahai melati kau cantik berseri",
    "Sungguh kelabu, kulukis indah rupamu",
    "Oh sungguh layu, harapanku kepadamu",
    "Oh mengapa, bunga di taman hatiku hanya satu",
    "Oh menghilang, bunga kesayanganku diambil orang",
    "Mekarlah selamanya di taman yang lain",
    "Bersenanglah, bunga kesayanganku tumbuh bahagia"
  ],
  "one-million.mp3": [
    "Jet-setter, go-getter, nothing better",
    "Top-model chick to your everyday 'hood rat",
    "Been all over the world, little bit of everyone",
    "But I've never met one like you",
    "Baby, you're so one in a million",
    "You're the best I ever had",
    "There's a million girls around",
    "But I don't see no one but you"
  ]
};

let lyricsTimer = null;
let currentLyricsKey = "marvin-gaye.mp3";

function showLyricsForSong(src) {
  if (!lyricsBox) return;
  const key = src && LYRICS[src] ? src : "marvin-gaye.mp3";
  currentLyricsKey = key;
  const lines = LYRICS[key];

  lyricsBox.innerHTML = "";
  lines.forEach((line, idx) => {
    const p = document.createElement("p");
    p.className = "lyrics-line";
    p.dataset.index = String(idx);
    p.textContent = line;
    lyricsBox.appendChild(p);
  });

  if (lyricsSongLabel) {
    if (key === "lihat-kebunku.mp3") {
      lyricsSongLabel.textContent = "Lihat Kebunku";
    } else if (key === "one-million.mp3") {
      lyricsSongLabel.textContent = "One Million";
    } else {
      lyricsSongLabel.textContent = "Marvin Gaye";
    }
  }
}

function startLyricsAnimation() {
  if (!lyricsBox) return;
  const lines = Array.from(lyricsBox.querySelectorAll(".lyrics-line"));
  if (!lines.length) return;

  let index = 0;
  const step = () => {
    lines.forEach((line, i) => {
      line.classList.remove("active", "past");
      if (i < index) line.classList.add("past");
      if (i === index) line.classList.add("active");
    });

    index = (index + 1) % (lines.length + 2); // sedikit jeda di akhir
  };

  step();
  clearInterval(lyricsTimer);
  lyricsTimer = setInterval(step, 2600);
}

function stopLyricsAnimation() {
  if (lyricsTimer) {
    clearInterval(lyricsTimer);
    lyricsTimer = null;
  }
}

// initialize default lyrics
showLyricsForSong("marvin-gaye.mp3");


// Camera + QR/marker scan to trigger galaxy overlay
function stopCamera() {
  if (scanId) {
    cancelAnimationFrame(scanId);
    scanId = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (cameraVideo) {
    cameraVideo.srcObject = null;
  }
  if (cameraStatus) {
    cameraStatus.textContent = "Kamera dimatikan.";
  }
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (cameraStatus) {
      cameraStatus.textContent =
        "Browser kamu tidak mendukung kamera (getUserMedia).";
    }
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    if (cameraVideo) {
      cameraVideo.srcObject = cameraStream;
    }
    if (cameraStatus) {
      cameraStatus.textContent = "Kamera aktif. Arahkan ke kode rahasia kamu.";
    }
    if (galaxyOverlay) {
      galaxyOverlay.classList.remove("show");
    }
    scanLoop();
  } catch (error) {
    if (cameraStatus) {
      cameraStatus.textContent =
        "Tidak bisa mengakses kamera. Coba izinkan akses atau pakai HTTPS.";
    }
  }
}

function scanLoop() {
  if (!cameraVideo || !cameraCanvas || !cameraStream) return;

  const video = cameraVideo;
  const canvas = cameraCanvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (window.jsQR) {
      const qr = window.jsQR(imageData.data, canvas.width, canvas.height);
      if (qr && qr.data) {
        if (cameraStatus) {
          cameraStatus.textContent = `Kode terbaca: "${qr.data}". Galaksi cinta aktif!`;
        }
        if (galaxyOverlay) {
          galaxyOverlay.classList.add("show");
        }
        // Jangan scan terus-menerus setelah sukses
        stopCamera();
        return;
      }
    }
  }

  scanId = requestAnimationFrame(scanLoop);
}

if (startCameraBtn) {
  startCameraBtn.addEventListener("click", () => {
    startCamera();
  });
}

if (stopCameraBtn) {
  stopCameraBtn.addEventListener("click", () => {
    stopCamera();
    if (galaxyOverlay) {
      galaxyOverlay.classList.remove("show");
    }
  });
}

// Matikan kamera kalau user menutup/refresh
window.addEventListener("beforeunload", () => {
  stopCamera();
});

// Mulai / berhenti animasi lirik saat lagu diputar / dijeda
if (bgSong) {
  bgSong.addEventListener("play", () => {
    startLyricsAnimation();
  });
  bgSong.addEventListener("pause", () => {
    stopLyricsAnimation();
  });
  bgSong.addEventListener("ended", () => {
    stopLyricsAnimation();
  });
}

