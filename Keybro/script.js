document.addEventListener('DOMContentLoaded', () => {
    const powerBtn = document.getElementById('power-btn');
    const overlay = document.getElementById('overlay');
    const keys = document.querySelectorAll('.key');

    const instrumentSelect = document.getElementById('instrument');
    
    // Game Elements
    const songListEl = document.getElementById('song-list');
    const stopGameBtn = document.getElementById('stop-game-btn');
    const currentPatchLabel = document.getElementById('current-patch-label');
    const scoreDisplay = document.getElementById('score-display');
    const scoreVal = document.getElementById('score-val');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const keyboard = document.getElementById('keyboard');

    let gameState = {
        isPlaying: false,
        startTime: 0,
        currentSong: null,
        score: 0,
        animationId: null
    };

    const songDatabase = {
        'steinway': [
            {
                id: 'drinking-age',
                title: 'Drinking Age - Cameron Winter',
                speed: 0.08, // pixels per ms
                notes: [
                    { note: 'E2', start: 1000, duration: 1500 },
                    { note: 'G#2', start: 1000, duration: 1500 },
                    { note: 'B2', start: 1000, duration: 1500 },
                    { note: 'D#3', start: 1000, duration: 1500 },
                    { note: 'G#2', start: 3000, duration: 1500 },
                    { note: 'B2', start: 3000, duration: 1500 },
                    { note: 'D#3', start: 3000, duration: 1500 },
                    { note: 'B2', start: 5000, duration: 1500 },
                    { note: 'D#3', start: 5000, duration: 1500 },
                    { note: 'F#3', start: 5000, duration: 1500 },
                    { note: 'A#3', start: 5000, duration: 1500 },
                    { note: 'E2', start: 7000, duration: 1500 },
                    { note: 'G#2', start: 7000, duration: 1500 },
                    { note: 'B2', start: 7000, duration: 1500 },
                    { note: 'B2', start: 9000, duration: 1500 },
                    { note: 'D#3', start: 9000, duration: 1500 },
                    { note: 'F#3', start: 9000, duration: 1500 },
                    { note: 'A3', start: 9000, duration: 1500 }
                ]
            }
        ],
        'rhodes': [
            {
                id: 'strokes-demo',
                title: "I'll Try Anything Once - The Strokes",
                speed: 0.1,
                notes: [
                    { note: 'E2', start: 1000, duration: 1000 },
                    { note: 'B2', start: 1000, duration: 1000 },
                    { note: 'E3', start: 1000, duration: 1000 },
                    { note: 'G#2', start: 2500, duration: 1000 },
                    { note: 'D#3', start: 2500, duration: 1000 },
                    { note: 'G#3', start: 2500, duration: 1000 },
                    { note: 'A2', start: 4000, duration: 1000 },
                    { note: 'E3', start: 4000, duration: 1000 },
                    { note: 'A3', start: 4000, duration: 1000 },
                    { note: 'B2', start: 5500, duration: 1000 },
                    { note: 'F#3', start: 5500, duration: 1000 },
                    { note: 'B3', start: 5500, duration: 1000 }
                ]
            }
        ]
    };

    let rhodesSynth;
    let steinwaySampler;
    let currentInstrument;

    const setupAudio = async () => {
        if (rhodesSynth) return;
        await Tone.start();
        console.log('Audio context started');

        // Create a PolySynth to mimic a Fender Rhodes / Mellotron organ
        rhodesSynth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 2, // Smooth, even harmonics for Rhodes-style warmth
            modulationIndex: 1.5, // Less intense bite for a rounder tone
            oscillator: {
                type: 'sine' // Warm body
            },
            modulation: {
                type: 'sine' // Smoother modulation than square
            },
            envelope: {
                attack: 0.01, // Quick attack
                decay: 0.5,
                sustain: 0.4,
                release: 1.5  // Long, floating release
            },
            modulationEnvelope: {
                attack: 0.01,
                decay: 0.2, // The chime/strike fades quickly
                sustain: 0,
                release: 0.1
            }
        });

        // Wurlitzer/Rhodes-style Tremolo (Amplitude Modulation)
        const tremolo = new Tone.Tremolo({
            frequency: 4,
            depth: 0.4,
            spread: 180
        }).start();

        // Distortion / Tape-saturation pedal for grit
        const distortion = new Tone.Distortion({
            distortion: 0.15, // Light tape saturation
            oversample: 'none'
        });

        // 90s Demo Tape Effects Chain
        // Very light chorus for that nostalgic, floating feel
        const chorus = new Tone.Chorus({
            frequency: 1.5,
            delayTime: 3.5,
            depth: 0.2, // Very light depth
            wet: 0.2    // Subtle mix
        }).start();

        // Warm, mellow lowpass filter to cut out any digital harshness
        const filter = new Tone.Filter({
            type: 'lowpass',
            frequency: 800, // Very warm cutoff for Rhodes/Mellotron feel
            rolloff: -24,
            Q: 0.2
        });

        // Slight vibrato for tape/vintage emulation
        const vibrato = new Tone.Vibrato({
            maxDelay: 0.005,
            frequency: 3,
            depth: 0.04, // Very slight depth
            wet: 0.3
        });

        // Route: Synth -> Distortion -> Tremolo -> Chorus -> Filter -> Vibrato -> Master
        rhodesSynth.chain(distortion, tremolo, chorus, filter, vibrato, Tone.Destination);

        // 2. Steinway Model D Setup (Sampler)
        steinwaySampler = new Tone.Sampler({
            urls: {
                A0: "A0.mp3",
                C1: "C1.mp3",
                "D#1": "Ds1.mp3",
                "F#1": "Fs1.mp3",
                A1: "A1.mp3",
                C2: "C2.mp3",
                "D#2": "Ds2.mp3",
                "F#2": "Fs2.mp3",
                A2: "A2.mp3",
                C3: "C3.mp3",
                "D#3": "Ds3.mp3",
                "F#3": "Fs3.mp3",
                A3: "A3.mp3",
                C4: "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                A4: "A4.mp3",
                C5: "C5.mp3",
                "D#5": "Ds5.mp3",
                "F#5": "Fs5.mp3",
                A5: "A5.mp3",
                C6: "C6.mp3",
                "D#6": "Ds6.mp3",
                "F#6": "Fs6.mp3",
                A6: "A6.mp3",
                C7: "C7.mp3",
                "D#7": "Ds7.mp3",
                "F#7": "Fs7.mp3",
                A7: "A7.mp3",
                C8: "C8.mp3"
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/"
        });

        const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.2 });
        steinwaySampler.chain(reverb, Tone.Destination);

        currentInstrument = rhodesSynth; // Default
    };

    powerBtn.addEventListener('click', async () => {
        await setupAudio();
        overlay.classList.add('hidden');
    });

    const keyMap = {};
    const noteToElement = {};
    const activeNotes = new Set();

    keys.forEach(key => {
        const note = key.getAttribute('data-note');
        const keyboardKey = key.getAttribute('data-key');
        
        keyMap[keyboardKey] = note;
        noteToElement[note] = key;

        key.addEventListener('mousedown', () => triggerAttack(note));
        key.addEventListener('mouseup', () => triggerRelease(note));
        key.addEventListener('mouseleave', () => {
            if (activeNotes.has(note)) triggerRelease(note);
        });
        
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            triggerAttack(note);
        });
        key.addEventListener('touchend', (e) => {
            e.preventDefault();
            triggerRelease(note);
        });
    });

        // Check game hits
        if (gameState.isPlaying && gameState.currentSong) {
            const currentTime = performance.now() - gameState.startTime;
            let hit = false;
            gameState.currentSong.notes.forEach(n => {
                // If the note block is currently intersecting the bottom (hit zone)
                // note.start <= currentTime and note.start + note.duration >= currentTime
                // with some leeway for hitting slightly early or late
                const margin = 200; // ms leeway
                if (currentTime >= n.start - margin && currentTime <= n.start + n.duration + margin) {
                    if (n.note === note && !n.hit) {
                        n.hit = true; // Mark as hit
                        hit = true;
                        gameState.score += 10;
                        scoreVal.innerText = gameState.score;
                        
                        // Show success glow
                        if (noteToElement[note]) {
                            noteToElement[note].classList.add('success');
                            setTimeout(() => noteToElement[note].classList.remove('success'), 300);
                        }
                    }
                }
            });
        }
    };

    const triggerRelease = (note) => {
        if (!currentInstrument || !activeNotes.has(note)) return;
        activeNotes.delete(note);
        currentInstrument.triggerRelease(note);
        if (noteToElement[note]) {
            noteToElement[note].classList.remove('active');
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent continuous triggering on key hold
        const key = e.key.toLowerCase();
        if (keyMap[key]) {
            triggerAttack(keyMap[key]);
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keyMap[key]) {
            triggerRelease(keyMap[key]);
        }
    });

    // --- Game Logic ---
    const populateSongMenu = (patch) => {
        songListEl.innerHTML = '';
        currentPatchLabel.innerText = patch === 'steinway' ? 'STEINWAY MODEL D' : 'FENDER RHODES';
        
        const songs = songDatabase[patch];
        if (songs) {
            songs.forEach(song => {
                const btn = document.createElement('button');
                btn.className = 'chord-btn';
                btn.innerText = `▶ Play: ${song.title}`;
                btn.onclick = () => startGame(song);
                songListEl.appendChild(btn);
            });
        }
    };

    const drawGame = () => {
        if (!gameState.isPlaying) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const currentTime = performance.now() - gameState.startTime;
        const speed = gameState.currentSong.speed;
        
        // Target line (the bottom of the canvas representing the keyboard)
        const hitY = canvas.height;

        let allNotesPassed = true;

        gameState.currentSong.notes.forEach(note => {
            if (!noteToElement[note.note]) return;
            
            // Calculate dimensions based on DOM elements!
            const keyEl = noteToElement[note.note];
            const keyboardRect = keyboard.getBoundingClientRect();
            const keyRect = keyEl.getBoundingClientRect();
            
            const x = keyRect.left - keyboardRect.left;
            const width = keyRect.width;
            
            const noteHeight = note.duration * speed;
            const distanceToHit = (note.start - currentTime) * speed;
            
            // y is the bottom edge of the note block
            const yBottom = hitY - distanceToHit;
            const yTop = yBottom - noteHeight;

            // Check if note is still active
            if (currentTime < note.start + note.duration + 1000) {
                allNotesPassed = false;
            }

            // Only draw if on screen
            if (yBottom > 0 && yTop < canvas.height) {
                // Color based on hit or miss
                if (note.hit) {
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.8)'; // Green success
                } else if (yBottom > hitY + 20) {
                    ctx.fillStyle = 'rgba(244, 67, 54, 0.5)'; // Missed
                } else {
                    // Normal falling color
                    ctx.fillStyle = keyEl.classList.contains('black') ? '#ff4747' : '#118ab2';
                }
                
                ctx.fillRect(x, yTop, width, noteHeight);
                
                // Outline
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, yTop, width, noteHeight);
            }
        });

        if (allNotesPassed) {
            stopGame();
        } else {
            gameState.animationId = requestAnimationFrame(drawGame);
        }
    };

    const startGame = (song) => {
        // Reset state
        gameState.isPlaying = true;
        gameState.startTime = performance.now();
        
        // Deep copy notes to avoid modifying original
        gameState.currentSong = {
            ...song,
            notes: song.notes.map(n => ({...n, hit: false}))
        };
        
        gameState.score = 0;
        scoreVal.innerText = '0';
        
        // UI Updates
        canvas.classList.add('active');
        songListEl.classList.add('hidden');
        stopGameBtn.classList.remove('hidden');
        scoreDisplay.classList.remove('hidden');

        // Start Loop
        if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
        drawGame();
    };

    const stopGame = () => {
        gameState.isPlaying = false;
        if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
        
        // UI Updates
        canvas.classList.remove('active');
        songListEl.classList.remove('hidden');
        stopGameBtn.classList.add('hidden');
        scoreDisplay.classList.add('hidden');
    };

    stopGameBtn.addEventListener('click', stopGame);

    // --- Instrument Selector Logic ---
    instrumentSelect.addEventListener('change', (e) => {
        const patch = e.target.value;
        if (patch === 'steinway') {
            currentInstrument = steinwaySampler;
        } else {
            currentInstrument = rhodesSynth;
        }
        populateSongMenu(patch);
    });

    // Initialize menu
    populateSongMenu('rhodes');

});
