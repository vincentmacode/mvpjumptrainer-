import { exerciseData } from './exerciseData.js';
const _soundBase    = new URL('./assets/sounds/', import.meta.url).href;
const jumpingBunnyUrl  = _soundBase + 'jumpingbunny.mp3';
const whistleUrl       = _soundBase + 'whistle.mp3';
const deloSoundUrl     = _soundBase + 'delosound.mp3';
const ikoliksAjUrl     = _soundBase + 'ikoliks_aj.mp3';
const nastelBomUrl     = _soundBase + 'nastelbom.mp3';
const oneTentUrl       = _soundBase + 'onetent.mp3';
const theMountainUrl   = _soundBase + 'the_mountain.mp3';
const topFlowUrl       = _soundBase + 'top-flow.mp3';
const tuneTankUrl      = _soundBase + 'tunetank.mp3';
const allWorldMusicUrl = _soundBase + 'allworldmusic.mp3';
const nickPanekUrl     = _soundBase + 'nickpanek.mp3';
const andrewBaliUrl    = _soundBase + 'andrewbali.mp3';

// iOS Safari requires a touchstart listener on the document for :active CSS to fire
document.addEventListener('touchstart', () => { }, { passive: true });

let AdMob = null;
let isShowingAd = false;
let timedAdInterval = null;

//ADMOB INTERSTITIAL CONFIG
const AdConfig = {
    clicksPerAd: 6,
    cooldownMs: 40000,
    maxAdsPerSession: 10,
    timedIntervalMs: 300000, // 5 minutes
};

const AdState = {
    clickCount: 0,
    lastAdTime: 0,
    adsShown: 0,
    isAdReady: false,
    isInitialized: false,
    areInterstitialListenersAttached: false,
};

const REST_SECONDS = 30;
const WORKOUT_SECONDS = 60;

async function prepareInterstitial() {
    if (!AdMob || !AdState.isInitialized || !AdState.areInterstitialListenersAttached) return;

    try {
        const isAndroid = window.Capacitor?.getPlatform() === 'android';
        await AdMob.prepareInterstitial({
            adId: isAndroid
                ? 'ca-app-pub-3940256099942544/1033173712' // interstitial (Android)
                : 'ca-app-pub-3940256099942544/4411468910', // interstitial (iOS)
        });
    } catch (err) {
        console.warn('[AdMob] Ad prepare failed:', err);
        AdState.isAdReady = false;
    }
}

// Smart Decision Function
function shouldShowAd() {
    const now = Date.now();

    return (
        !!AdMob &&
        AdState.isAdReady &&
        AdState.adsShown < AdConfig.maxAdsPerSession &&
        now - AdState.lastAdTime >= AdConfig.cooldownMs &&
        AdState.clickCount % AdConfig.clicksPerAd === 0
    );
}

async function tryShowInterstitial() {
    if (isShowingAd) return;
    if (!shouldShowAd()) return;
    isShowingAd = true;

    try {
        await AdMob.showInterstitial();

        AdState.lastAdTime = Date.now();
        AdState.adsShown++;
        AdState.isAdReady = false;

        // Reset timed interval so it waits a full cycle from now
        if (timedAdInterval) {
            clearInterval(timedAdInterval);
            timedAdInterval = setInterval(tryShowTimedInterstitial, AdConfig.timedIntervalMs);
        }

        await prepareInterstitial();
    } catch (err) {
        console.warn("Ad show failed:", err);
        AdState.isAdReady = false;

        setTimeout(prepareInterstitial, 3000);
    } finally {
        isShowingAd = false;
    }
}


// Time-based interstitial — bypasses click-count gate, respects session cap + cooldown
async function tryShowTimedInterstitial() {
    if (isShowingAd || !AdMob || !AdState.isAdReady) return;
    if (AdState.adsShown >= AdConfig.maxAdsPerSession) return;
    if (Date.now() - AdState.lastAdTime < AdConfig.cooldownMs) return;

    isShowingAd = true;
    try {
        await AdMob.showInterstitial();
        AdState.lastAdTime = Date.now();
        AdState.adsShown++;
        AdState.isAdReady = false;
        await prepareInterstitial();
    } catch (err) {
        console.warn('Timed interstitial failed:', err);
        AdState.isAdReady = false;
        setTimeout(prepareInterstitial, 3000);
    } finally {
        isShowingAd = false;
    }
}

//Music playlist
const playlist = [jumpingBunnyUrl, deloSoundUrl, ikoliksAjUrl, nastelBomUrl, oneTentUrl, theMountainUrl, topFlowUrl,
    tuneTankUrl, allWorldMusicUrl, nickPanekUrl, andrewBaliUrl
];

// MUSIC NAME INFO
const trackNames = ['Jumping Bunny', 'Inspiring Motivation - DELOSound', 'Workout Gym Sport Music - ikoliks_aj', 'Motivation - Nastel Bom',
    'Motivation - Onetent', 'Motivation - The_Mountain', 'Unlimited Motivation - Top Flow', 'Sport Workout Beat - Tune Tank', 'Fast Glitchy - AllWorldMusic',
    'Synthwave - nickpanekAIassets', 'Tattooed Horizon - Andrewbali'];
let currentTrack = 0;

// Whistle via Web Audio API — more reliable on iOS than HTMLAudioElement
// because once the AudioContext is unlocked by a user gesture, buffer sources
// can fire at any time (including from timer callbacks).
let audioCtx = null;
let whistleBuffer = null;

// Update track info display and restart marquee animation from the beginning
function updateTrackDisplay() {
    const display = document.querySelector('.track-name');
    if (!display) return;
    display.textContent = trackNames[currentTrack];
}

updateTrackDisplay();

async function initWebAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch(whistleUrl);
        const arrayBuffer = await response.arrayBuffer();
        whistleBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
        console.warn('Web Audio init failed:', err);
    }
}

// Music playback
const musicAudio = new Audio();
musicAudio.preload = 'auto';
musicAudio.src = playlist[currentTrack];

async function loadAndPlayCurrentTrack() {
    musicAudio.src = playlist[currentTrack];
    musicAudio.load();
    updateTrackDisplay();

    try {
        await musicAudio.play();
    } catch (err) {
        console.warn('Auto-advance play failed, waiting for canplay:', err);

        musicAudio.addEventListener('canplay', () => {
            musicAudio.play().catch((retryErr) => {
                console.warn('Retry auto-play failed:', retryErr);
            });
        }, { once: true });
    }
}

musicAudio.addEventListener('ended', async () => {
    currentTrack = (currentTrack + 1) % playlist.length;
    await loadAndPlayCurrentTrack();
})


const nextButton = document.querySelector('.music-next');
if (nextButton) {
    nextButton.addEventListener('click', async () => {
        AdState.clickCount++;
        await tryShowInterstitial();

        const wasPlaying = !musicAudio.paused;
        musicAudio.pause();
        currentTrack = (currentTrack + 1) % playlist.length;
        if (wasPlaying) {
            await loadAndPlayCurrentTrack();
        } else {
            musicAudio.src = playlist[currentTrack];
            updateTrackDisplay();
            musicAudio.currentTime = 0;
        }
    });
}


const musicButton = document.querySelector('.music');
const musicButtonLabel = musicButton?.querySelector('.front');
if (musicButton) {
    musicButton.addEventListener('click', async () => {
        AdState.clickCount++;
        await tryShowInterstitial();

        if (musicAudio.paused) {
            musicAudio.currentTime = 0; // Reset to start
            try {
                await musicAudio.play();
                updateTrackDisplay();
                if (musicButtonLabel) musicButtonLabel.textContent = 'Stop music';
            } catch (err) {
                console.warn('Unable to start music playback:', err);
            }
        } else {
            musicAudio.pause();
            if (musicButtonLabel) musicButtonLabel.textContent = 'Play music';
        }
    });
}

// Ad initialization
window.addEventListener('DOMContentLoaded', async () => {
    if (window.Capacitor?.isNativePlatform()) {
        const admob = await import('@capacitor-community/admob');
        AdMob = admob.AdMob;
        const { BannerAdSize, BannerAdPosition } = admob;

        await AdMob.initialize({
            requestTrackingAuthorization: true, // iOS ATT
        });
        AdState.isInitialized = true;

        // On Android, prepareInterstitial() resolves when the request is sent, not when
        // the ad is loaded. These events are the reliable signal for when it's safe to show.
        // Listeners must be registered before prepareInterstitial() so no Loaded event is missed.
        const { InterstitialAdPluginEvents } = admob;
        await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
            AdState.isAdReady = true;
        });
        await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
            console.warn('[AdMob] Interstitial FailedToLoad:', err);
            AdState.isAdReady = false;
            setTimeout(prepareInterstitial, 3000); // retry after 3s
        });
        AdState.areInterstitialListenersAttached = true;

        // Start loading interstitial now that plugin is initialized and listeners are in place
        await prepareInterstitial();

        // AD BANNER
        const isAndroid = window.Capacitor?.getPlatform() === 'android';
        await AdMob.showBanner({
            adId: isAndroid
                ? 'ca-app-pub-3940256099942544/6300978111' // banner (Android)
                : 'ca-app-pub-3940256099942544/2934735716', // banner (iOS)
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
        });

        // Show interstitial 20s after a workout page loads, then every 5min (day1–day7)
        if (window.location.pathname.includes('/workouts/day')) {
            setTimeout(async () => {
                await tryShowTimedInterstitial();
                timedAdInterval = setInterval(tryShowTimedInterstitial, AdConfig.timedIntervalMs);
            }, 20000);
        }

    }
});

// Exercise dropdown
const exerciseCardTriggers = document.querySelectorAll('.exercise-card-trigger');

exerciseCardTriggers.forEach((trigger) => {
    const card = trigger.closest('.exercise-card');
    const dropdown = card ? card.querySelector('.exercise-dropdown') : null;

    if (!card || !dropdown) {
        return;
    }

    trigger.addEventListener('click', () => {
        // Keep visual state, accessibility state, and visibility in sync.
        const isOpen = card.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(isOpen));
        dropdown.hidden = !isOpen;

        // Render images from exerciseData the first time this dropdown is opened.
        if (isOpen && dropdown.dataset.rendered !== 'true') {
            const exerciseName = dropdown.dataset.exercise;
            const exercise = exerciseData.find((item) => item.exercise === exerciseName);

            if (!exercise) {
                return;
            }

            // Render the correct images
            dropdown.innerHTML = `
                <div class="exercise-gallery">
                    ${exercise.images
                    .map((src) => `<img src="${src}" alt="Exercise step image">`)
                    .join('')}
                </div>
            `;

            dropdown.dataset.rendered = 'true';

            // Prevent long-press save/share on iOS
            dropdown.querySelectorAll('img').forEach(img => {
                img.addEventListener('contextmenu', e => e.preventDefault());
            });
        }
    });
});

//Rest timer countdown
const pill = document.getElementById("restPill");

if (pill) {
    // Scroll-triggered fixed positioning
    let pillOriginalTop = 0;
    const placeholder = document.createElement('div');
    placeholder.style.display = 'none';
    placeholder.style.height = pill.offsetHeight + 'px';
    pill.parentNode.insertBefore(placeholder, pill);

    function updatePillOriginalTop() {
        // If pill is fixed, use placeholder as the stable anchor in the natural flow.
        const anchor = pill.classList.contains('rest-pill--fixed') ? placeholder : pill;
        const rect = anchor.getBoundingClientRect();
        pillOriginalTop = rect.top + window.scrollY;
    }

    function refreshPillMetrics() {
        placeholder.style.height = pill.offsetHeight + 'px';
        updatePillOriginalTop();
    }

    function refreshAfterLayoutSettles() {
        // Defer measurement until after layout/paint to avoid early values on first load.
        requestAnimationFrame(() => {
            requestAnimationFrame(refreshPillMetrics);
        });
    }

    if (document.fonts?.ready) {
        document.fonts.ready.then(refreshAfterLayoutSettles).catch(() => {
            // Ignore font API failures and rely on load/resize fallbacks.
        });
    }
    window.addEventListener('load', refreshAfterLayoutSettles, { once: true });
    window.addEventListener('resize', refreshAfterLayoutSettles, { passive: true });
    window.addEventListener('orientationchange', refreshAfterLayoutSettles, { passive: true });

    if ('ResizeObserver' in window) {
        const layoutObserver = new ResizeObserver(() => {
            refreshAfterLayoutSettles();
        });
        layoutObserver.observe(document.body);
    }

    refreshAfterLayoutSettles();

    window.addEventListener('scroll', () => {
        // Use the stored original position — pill.offsetTop becomes unreliable once position:fixed is applied
        const scrollThreshold = pillOriginalTop - (window.innerHeight * 0.05);
        if (window.scrollY > scrollThreshold) {
            if (!pill.classList.contains('rest-pill--fixed')) {
                placeholder.style.display = 'block';
                pill.classList.add('rest-pill--fixed');
            }
        } else {
            if (pill.classList.contains('rest-pill--fixed')) {
                placeholder.style.display = 'none';
                pill.classList.remove('rest-pill--fixed');
                refreshAfterLayoutSettles();
            }
        }
    }, { passive: true });

    let timer = null;
    let timeLeft = 0;
    let isRunning = false;

    function playWhistle() {
        if (!audioCtx || !whistleBuffer) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const source = audioCtx.createBufferSource();
        source.buffer = whistleBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
    }

    // REST PHASE DURATION
    function startRestPhase() {
        timeLeft = REST_SECONDS;
        pill.innerHTML = `REST... <span>${timeLeft}s</span>`;

        timer = setInterval(() => {
            timeLeft--;
            pill.innerHTML = `REST... <span>${timeLeft}s</span>`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                timer = null;
                playWhistle();
                startWorkoutPhase();
            }
        }, 1000);
    }

    // WORKOUT PHASE DURATION
    function startWorkoutPhase() {
        timeLeft = WORKOUT_SECONDS;
        pill.innerHTML = `BEGIN WORKOUT <span>${timeLeft}s</span>`;

        timer = setInterval(() => {
            timeLeft--;
            pill.innerHTML = `BEGIN WORKOUT <span>${timeLeft}s</span>`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                timer = null;
                playWhistle();
                startRestPhase();
            }
        }, 1000);
    }

    async function handlePillClick() {
        // Unlock Web Audio on first tap (iOS requires a user gesture)
        await initWebAudio();

        if (isRunning) {
            // Stop the loop
            if (timer) clearInterval(timer);
            timer = null;
            isRunning = false;
            pill.innerHTML = `BEGIN WORKOUT`;
            return;
        }

        // Start the loop
        isRunning = true;
        startWorkoutPhase();
    }

    pill.addEventListener("click", handlePillClick);
}