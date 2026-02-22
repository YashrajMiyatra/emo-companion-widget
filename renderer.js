const { ipcRenderer } = require('electron');

const screenEl = document.querySelector('.screen');
const faceContainer = document.querySelector('.face-container');
const clockDisplay = document.getElementById('clock');
const weatherDisplay = document.getElementById('weather');
const weatherIcon = document.getElementById('weather-icon');
const weatherTemp = document.getElementById('weather-temp');

// State tracking
let currentState = 'idle';
let mode = 'face'; // 'face', 'clock', 'weather'

let interactionTimeout;
let sleepyTimer;
let lastMousePoint = { x: 0, y: 0 };

function setState(state, duration = null) {
    if (currentState === state) return;

    // Clear all existing state classes
    screenEl.classList.remove('smile', 'laugh', 'angry', 'sad', 'sleepy', 'confused', 'surprised', 'love', 'error');

    currentState = state;
    if (state !== 'idle') screenEl.classList.add(state);

    // Audio effects
    if (state !== 'idle') {
        if (state === 'smile') playTone(800, 'sine', 0.3, 1200);
        if (state === 'laugh') playTone(1200, 'sine', 0.4, 1600);
        if (state === 'angry') playTone(200, 'sawtooth', 0.5, 150);
        if (state === 'sad') playTone(400, 'sine', 0.6, 250);
        if (state === 'error') playTone(150, 'square', 0.8, 100);
        if (state === 'love') {
            playTone(800, 'sine', 0.1, 1000);
            setTimeout(() => playTone(1200, 'sine', 0.2, 1400), 100);
        }
    }

    clearTimeout(interactionTimeout);
    if (duration) {
        interactionTimeout = setTimeout(() => {
            setState('idle');
            // Check if we should instantly switch to smile
            if (screenEl.matches(':hover')) {
                setState('smile');
            }
        }, duration);
    }
}

function resetSleepyTimer() {
    clearTimeout(sleepyTimer);
    if (currentState === 'sleepy') {
        setState('idle');
    }
    // Become sleepy if no mouse movement for 10 seconds (unless listening to music or typing)
    sleepyTimer = setTimeout(() => {
        if (currentState === 'idle' && !musicVisualizerActive && mode !== 'typing') {
            setState('sleepy');
        }
    }, 10000);
}

// ----------------------------------------------------
// Idle Behaviors
// ----------------------------------------------------
let idleGlanceX = 0;
let idleGlanceY = 0;

// Blinking
setInterval(() => {
    if (mode === 'face' && ['idle', 'smile', 'sad', 'love'].includes(currentState) && !isDragging && !isFalling) {
        if (Math.random() > 0.2) {
            const eyes = document.querySelectorAll('.eye');
            eyes.forEach(eye => eye.classList.add('blink'));
            setTimeout(() => {
                eyes.forEach(eye => eye.classList.remove('blink'));
            }, 150);
        }
    }
}, 3500);

// Glancing
setInterval(() => {
    if (mode === 'face' && currentState === 'idle' && !isDragging && !isFalling) {
        if (Math.random() > 0.7) {
            idleGlanceX = (Math.random() - 0.5) * 12;
            idleGlanceY = (Math.random() - 0.5) * 12;
        } else {
            idleGlanceX = 0;
            idleGlanceY = 0;
        }
    } else {
        idleGlanceX = 0;
        idleGlanceY = 0;
    }
    // Note: The actual visual update happens rapidly in the mouse-position IPC loop anyway
}, 2500);

// ----------------------------------------------------
// Physics & Dragging Logic
// ----------------------------------------------------
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentBounds = { x: 0, y: 0, width: 220, height: 220 };
let screenBounds = { x: 0, y: 0, width: 1920, height: 1080 };
let velocityY = 0;
let isFalling = false;
const gravity = 0.8;
const bounceFactor = -0.55;

// Start drag
document.body.addEventListener('mousedown', (e) => {
    // Left click only
    if (e.button !== 0) return;
    isDragging = true;
    isFalling = false;
    velocityY = 0;
    dragOffset = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
});

// Stop drag and initiate gravity physics
window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = 'pointer';

    // If we're above the ground, start falling
    const groundY = screenBounds.y + screenBounds.height - currentBounds.height;
    if (currentBounds.y < groundY - 5) {
        isFalling = true;
        physicsLoop();
    }
});

function physicsLoop() {
    if (!isFalling) return;

    velocityY += gravity;
    currentBounds.y += velocityY;

    const groundY = screenBounds.y + screenBounds.height - currentBounds.height - 20;

    if (currentBounds.y >= groundY) {
        currentBounds.y = groundY;
        velocityY *= bounceFactor;

        if (Math.abs(velocityY) < 2) {
            isFalling = false;
            velocityY = 0;
        } else {
            if (Math.abs(velocityY) > 10) {
                setState('surprised', 1000);
                playTone(300, 'square', 0.1);
            }
        }
    }

    ipcRenderer.send('move-window', { x: currentBounds.x, y: currentBounds.y });

    if (isFalling) {
        requestAnimationFrame(physicsLoop);
    }
}

// ----------------------------------------------------
// IPC Listeners & Lerp Eye Tracking
// ----------------------------------------------------
let targetEyeX = 0;
let targetEyeY = 0;
let currentEyeX = 0;
let currentEyeY = 0;
const LERP_FACTOR = 0.12;

// Petting Mechanic Variables
let pettingAccumulator = 0;
let lastPettingTime = Date.now();

ipcRenderer.on('mouse-position', (event, { point, bounds, screenBounds: sb }) => {
    // Only update bounds if we aren't overriding them via physics
    if (!isDragging && !isFalling) {
        currentBounds = bounds;
    }
    screenBounds = sb;

    // Wake up from sleep
    const distMoved = Math.hypot(point.x - lastMousePoint.x, point.y - lastMousePoint.y);
    if (distMoved > 5) {
        resetSleepyTimer();

        // --- Petting Mechanic ---
        const widgetCenterX = currentBounds.x + currentBounds.width / 2;
        const widgetCenterY = currentBounds.y + currentBounds.height / 2;

        if (point.x > currentBounds.x && point.x < currentBounds.x + currentBounds.width &&
            point.y > currentBounds.y && point.y < widgetCenterY + 20) {

            pettingAccumulator += distMoved;
            lastPettingTime = Date.now();

            if (pettingAccumulator > 3000 && currentState !== 'love' && mode === 'face') {
                setState('love', 5000);
                pettingAccumulator = 0;
            }
        }

        lastMousePoint = point;

        if (distMoved > 250 && currentState === 'idle' && mode === 'face' && pettingAccumulator < 1000) {
            setState('surprised', 3000);
        } else if (distMoved > 100 && currentState === 'idle' && mode === 'face' && pettingAccumulator < 1000) {
            setState('confused', 2000);
        }
    }

    if (Date.now() - lastPettingTime > 500) {
        pettingAccumulator = 0;
    }

    // Eye Tracking calculations
    if (mode === 'typing' && currentState === 'idle') {
        // Do nothing with mouse position; targetEyeX/Y are controlled by the readingSimulator interval
    } else if (mode !== 'typing') {
        const widgetCenterX = currentBounds.x + currentBounds.width / 2;
        const widgetCenterY = currentBounds.y + currentBounds.height / 2;

        const dX = point.x - widgetCenterX;
        const dY = point.y - widgetCenterY;

        const distance = Math.sqrt(dX * dX + dY * dY);
        // Max movement is 12px from center to keep eyes realistic
        const maxDist = 8; // Reduced max dist for smaller face
        const distanceFactor = Math.min(distance / 500, 1);
        const angle = Math.atan2(dY, dX);

        // Update target instead of applying immediately
        targetEyeX = Math.cos(angle) * maxDist * distanceFactor;
        targetEyeY = Math.sin(angle) * maxDist * distanceFactor;
    }

    // Handle drag movement
    if (isDragging) {
        currentBounds.x = point.x - dragOffset.x;
        currentBounds.y = point.y - dragOffset.y;
        ipcRenderer.send('move-window', { x: currentBounds.x, y: currentBounds.y });
    }
});

// Linear Interpolation Helper
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// ----------------------------------------------------
// Core Render Loop (Organic eye tracking & Audio Viz)
// ----------------------------------------------------
let musicVisualizerActive = false;
let analyser;
let dataArray;
let webAudioSource;

// Audio smoothing variables
let smoothedBass = 0;
let smoothedTreble = 0;
const AUDIO_LERP = 0.4;


function renderLoop() {
    // 1. Organic Lerp Eye Tracking
    currentEyeX = lerp(currentEyeX, targetEyeX + idleGlanceX, LERP_FACTOR);
    currentEyeY = lerp(currentEyeY, targetEyeY + idleGlanceY, LERP_FACTOR);

    // Only move face if we are in face or typing mode
    if (mode === 'face' || mode === 'typing') {
        faceContainer.style.transform = `translate(${currentEyeX}px, ${currentEyeY}px)`;
    }

    // 2. Music Visualizer logic
    if (musicVisualizerActive && analyser && mode === 'face') {
        analyser.getByteFrequencyData(dataArray);

        // --- Left Eye (Bass / Low Frequencies) ---
        let bassSum = 0;
        const bassEnd = 12; // lower buckets
        for (let i = 0; i < bassEnd; i++) bassSum += dataArray[i];
        let rawBass = bassSum / bassEnd; // 0 to 255

        // --- Right Eye (Treble / Mid-High Frequencies) ---
        let trebSum = 0;
        const trebStart = 15;
        const trebEnd = 50;
        for (let i = trebStart; i < trebEnd; i++) trebSum += dataArray[i];
        let rawTreble = trebSum / (trebEnd - trebStart); // 0 to 255

        // Apply Lerp to audio data for buttery but snappy physics
        smoothedBass = lerp(smoothedBass, rawBass, AUDIO_LERP);
        smoothedTreble = lerp(smoothedTreble, rawTreble, AUDIO_LERP);

        // Map frequency amplitude to CSS multiplier
        const baseScale = 1.0;
        let scaleYLeft = baseScale + (smoothedBass / 255.0) * 0.6;
        let scaleYRight = baseScale + (smoothedTreble / 255.0) * 0.6;

        // Apply Squash and Stretch physics
        let scaleXLeft = 1.0 - (scaleYLeft - 1.0) * 0.25;
        let scaleXRight = 1.0 - (scaleYRight - 1.0) * 0.25;

        // Translate Y upwards on the beat
        let translateYLeft = -(scaleYLeft - 1.0) * 30;
        let translateYRight = -(scaleYRight - 1.0) * 30;

        const leftEye = document.querySelector('.eye.left');
        const rightEye = document.querySelector('.eye.right');

        if (leftEye && rightEye) {
            leftEye.style.transform = `translateY(${translateYLeft}px) scale(${scaleXLeft}, ${scaleYLeft})`;
            rightEye.style.transform = `translateY(${translateYRight}px) scale(${scaleXRight}, ${scaleYRight})`;

            // Increase glow intensity slightly on heavy beats
            const glowIntensityLeft = 6 + (scaleYLeft - 1.0) * 15;
            leftEye.style.boxShadow = `0 0 6px #00fff2, 0 0 ${glowIntensityLeft}px rgba(0, 255, 242, 0.7)`;

            const glowIntensityRight = 6 + (scaleYRight - 1.0) * 15;
            rightEye.style.boxShadow = `0 0 6px #00fff2, 0 0 ${glowIntensityRight}px rgba(0, 255, 242, 0.7)`;
        }

    } else if (!musicVisualizerActive) {
        // Reset scales and shadows safely when turned off
        const eyes = document.querySelectorAll('.eye');
        eyes.forEach(eye => {
            eye.style.transform = `translateY(0px) scale(1, 1)`;
            eye.style.boxShadow = `0 0 6px #00fff2, 0 0 12px rgba(0, 255, 242, 0.5)`;
        });
        smoothedBass = 0;
        smoothedTreble = 0;
    }

    requestAnimationFrame(renderLoop);
}

// Start the continuous render loop
requestAnimationFrame(renderLoop);


// ----------------------------------------------------
// Original interactions mapped to state machine
// ----------------------------------------------------
let laughTimeout;
screenEl.addEventListener('mouseenter', () => {
    if (currentState === 'angry' || currentState === 'confused' || currentState === 'error') return;
    setState('smile');
    laughTimeout = setTimeout(() => {
        if (currentState === 'smile') setState('laugh');
    }, 3000);
});

screenEl.addEventListener('mouseleave', () => {
    clearTimeout(laughTimeout);
    if (currentState === 'smile' || currentState === 'laugh' || currentState === 'love') {
        setState('idle');
    }
});

screenEl.addEventListener('click', (e) => {
    if (e.detail > 1) return; // Prevent double click angry override
    clearTimeout(laughTimeout);
    setState('angry', 4000);
});

screenEl.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    e.preventDefault();
    clearTimeout(laughTimeout);
    setState('laugh', 4000);
});

document.body.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.close();
});

// Key bindings for extra emotions (requires widget click/focus!)
window.addEventListener('keydown', (e) => {
    if (mode !== 'face') return; // Don't trigger emotions if clock/weather is up

    const key = e.key.toLowerCase();

    if (key === 's') setState('sad', 4000);
    if (key === 'c') setState('confused', 4000);
    if (key === 'z') setState('sleepy', 4000);
    if (key === 'l') setState('love', 5000);
    if (key === 'o') setState('surprised', 4000);
    if (key === 'x') setState('error', 5000);

    // Advanced Modes
    if (key === 't') showClock();
    if (key === 'w') showWeather();
    if (key === 'm') toggleMusicVisualizer();
});

// ----------------------------------------------------
// Global Typing / Reading Auto-Tracker
// ----------------------------------------------------
let readingInterval;
let typingTimeout;
let readingX = -8;
let readingY = -4;

// Listen for global keypresses from main process
ipcRenderer.on('global-keypress', () => {
    if (mode === 'face' && (currentState === 'idle' || currentState === 'confused')) {
        startTypingMode();
    }

    if (mode === 'typing') {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            stopTypingModeAndGetConfused();
        }, 1500);
    }
});

function startTypingMode() {
    mode = 'typing';
    setState('idle');
    resetSleepyTimer();

    readingX = -8;
    readingY = -4;

    const jump = () => {
        if (mode !== 'typing') return;

        if (currentState === 'idle') {
            if (Math.random() > 0.8 || readingX > 6) {
                readingX = -8 + (Math.random() * 3);
                readingY += 3;
                if (readingY > 6) readingY = -4;
            } else {
                readingX += 1.5 + (Math.random() * 3);
                readingY += (Math.random() - 0.5);
            }

            targetEyeX = readingX;
            targetEyeY = readingY;
        }

        readingInterval = setTimeout(jump, 150 + Math.random() * 200);
    };

    jump();
}

function stopTypingModeAndGetConfused() {
    clearTimeout(readingInterval);
    if (mode === 'typing') {
        mode = 'face';
        setState('confused');
    }
}

// ----------------------------------------------------
// Music Visualizer Module
// ----------------------------------------------------
async function toggleMusicVisualizer() {
    if (musicVisualizerActive) {
        musicVisualizerActive = false;
        if (webAudioSource) webAudioSource.disconnect();
        return;
    }

    try {
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // Get the desktop source ID from the main process
        const sourceId = await ipcRenderer.invoke('get-desktop-source-id');

        // Request desktop audio loopback (System Audio) using the retrieved sourceId
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId
                }
            },
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId
                }
            }
        });

        // We only want the audio track for visualization, not the screen video
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            throw new Error("No audio tracks found in desktop loopback");
        }

        const audioStream = new MediaStream([audioTracks[0]]);

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        webAudioSource = audioCtx.createMediaStreamSource(audioStream);
        webAudioSource.connect(analyser); // We don't connect to destination to avoid echo

        musicVisualizerActive = true;

    } catch (e) {
        console.error("Audio Viz Error: ", e);
        setState('error', 2000);
    }
}

// ----------------------------------------------------
// Digital Clock Module
// ----------------------------------------------------
let clockInterval;
function showClock() {
    if (mode !== 'face') return;
    mode = 'clock';

    // Hide face, show clock
    faceContainer.classList.add('hidden');
    clockDisplay.classList.remove('hidden');

    function updateTime() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        clockDisplay.innerText = `${hrs}:${mins}`;
    }

    updateTime();
    clockInterval = setInterval(updateTime, 1000);

    // Revert after 4 seconds
    setTimeout(() => {
        clearInterval(clockInterval);
        clockDisplay.classList.add('hidden');
        faceContainer.classList.remove('hidden');
        mode = 'face';
    }, 4000);
}

// ----------------------------------------------------
// Weather Mode Module
// ----------------------------------------------------
async function showWeather() {
    if (mode !== 'face') return;
    mode = 'weather';

    faceContainer.classList.add('hidden');
    weatherDisplay.classList.remove('hidden');
    weatherIcon.innerText = '⏳';
    weatherTemp.innerText = '--°C';

    try {
        // 1. Get location from IP (Highly reliable provider)
        const locRes = await fetch('https://ipinfo.io/json');
        const locData = await locRes.json();

        // ipinfo.io returns "loc" as "latitude,longitude"
        const [lat, lon] = locData.loc.split(',');

        // 2. Get weather from Open-Meteo with specific accurate models
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&models=best_match`);
        const weatherData = await weatherRes.json();

        const temp = Math.round(weatherData.current_weather.temperature);
        const code = weatherData.current_weather.weathercode;

        // Simple mapping of WMO Weather codes to Emojis
        let icon = '☁️';
        if (code === 0) icon = '☀️';
        else if (code >= 1 && code <= 3) icon = '⛅';
        else if (code >= 45 && code <= 48) icon = '🌫️';
        else if (code >= 51 && code <= 67) icon = '🌧️';
        else if (code >= 71 && code <= 77) icon = '❄️';
        else if (code >= 95) icon = '⛈️';

        weatherIcon.innerText = icon;
        weatherTemp.innerText = `${temp}°C`;

    } catch (e) {
        weatherIcon.innerText = '❌';
        weatherTemp.innerText = 'Err';
    }

    // Revert after 5 seconds
    setTimeout(() => {
        weatherDisplay.classList.add('hidden');
        faceContainer.classList.remove('hidden');
        mode = 'face';
    }, 5000);
}

// ----------------------------------------------------
// Procedural Web Audio (Beeps & Boops)
// ----------------------------------------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, slideFreq = null) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// ----------------------------------------------------
// Battery API Awareness
// ----------------------------------------------------
navigator.getBattery().then(battery => {
    function updateBatteryStatus() {
        if (!battery.charging && battery.level < 0.20 && currentState === 'idle') {
            setState('sad', 5000); // Trigger sad if low battery
        } else if (battery.charging && currentState === 'idle') {
            setState('love', 3000); // Happy when plugged in
        }
    }

    battery.addEventListener('chargingchange', updateBatteryStatus);
    battery.addEventListener('levelchange', updateBatteryStatus);
});

// Initialize sleepy timer
resetSleepyTimer();
