document.addEventListener('DOMContentLoaded', () => {
    const powerBtn = document.getElementById('power-btn');
    const overlay = document.getElementById('overlay');
    const keys = document.querySelectorAll('.key');

    const instrumentSelect = document.getElementById('instrument');
    
    const songListEl = document.getElementById('song-list');
    const stopGameBtn = document.getElementById('stop-game-btn');
    const currentPatchLabel = document.getElementById('current-patch-label');
    const scoreDisplay = document.getElementById('score-display');
    const scoreVal = document.getElementById('score-val');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const keyboard = document.getElementById('keyboard');
    const songbookBtn = document.getElementById('songbook-btn');
    const songbookEl = document.getElementById('songbook');

    let gameState = {
        isPlaying: false,
        startTime: 0,
        lastTick: 0,
        currentTime: 0,
        isWaiting: false,
        waitingForNotes: [],
        currentSong: null,
        score: 0,
        animationId: null
    };

    const generateDrinkingAge = () => {
        // Realistic Piano Arrangement: Left Hand Bass + Right Hand Chords
        const progression = [
            { bass: 'E2', chord: ['G#2','B2','D#3'] }, // Emaj7
            { bass: 'G#2', chord: ['B2','D#3','G#3'] }, // G#m
            { bass: 'B2', chord: ['D#3','F#3','A#3'] }, // Bmaj7
            { bass: 'E2', chord: ['G#2','B2','E3'] },   // E
            { bass: 'B2', chord: ['D#3','F#3','A3'] }   // B7
        ];
        
        const notes = [];
        let time = 1000;
        
        // Loop the progression 8 times
        for (let i = 0; i < 8; i++) {
            progression.forEach((part) => {
                // 1. Play deep bass note (Left Hand)
                notes.push({ note: part.bass, start: time, duration: 2200 });
                
                // 2. Play first chord pulse (Right Hand)
                part.chord.forEach(n => {
                    notes.push({ note: n, start: time + 600, duration: 400 });
                });
                
                // 3. Play second chord pulse (Right Hand)
                part.chord.forEach(n => {
                    notes.push({ note: n, start: time + 1400, duration: 800 });
                });
                
                time += 2400; // Slower, more deliberate tempo
            });
            time += 1200; // pause between loops
        }
        return notes;
    };

    const generateStrokes = () => {
        const progression = [
            ['E2','B2','E3'],
            ['G#2','D#3','G#3'],
            ['A2','E3','A3'],
            ['B2','F#3','B3']
        ];
        const notes = [];
        let time = 1000;
        // Loop the progression 16 times
        for (let i = 0; i < 16; i++) {
            progression.forEach((chord) => {
                chord.forEach(n => {
                    notes.push({ note: n, start: time, duration: 1000 });
                });
                time += 1500;
            });
        }
        return notes;
    };

    const songDatabase = {
        'steinway': [
            {
                id: 'drinking-age',
                title: 'Drinking Age - Cameron Winter',
                speed: 0.05, // Slower falling speed, easier to read
                notes: generateDrinkingAge()
            }
        ],
        'rhodes': [
            {
                id: 'strokes-demo',
                title: "I'll Try Anything Once - The Strokes",
                speed: 0.1,
                notes: generateStrokes()
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
    const sustainedNotes = new Set();
    let isSustainPedalDown = false;

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

    const triggerAttack = (note) => {
        if (!currentInstrument || activeNotes.has(note)) return;
        
        // Sampler needs to be loaded before playing
        if (currentInstrument === steinwaySampler && !steinwaySampler.loaded) return;
        
        activeNotes.add(note);
        sustainedNotes.delete(note); // Take back control from sustain pedal
        
        currentInstrument.triggerAttack(note);
        if (noteToElement[note]) {
            noteToElement[note].classList.add('active');
        }

        // Check game hits
        if (gameState.isPlaying && gameState.currentSong) {
            let hit = false;
            
            // If the game is paused waiting for THIS note, un-pause it
            if (gameState.isWaiting && gameState.waitingForNotes.includes(note)) {
                gameState.currentSong.notes.forEach(n => {
                    const hitY = canvas.height;
                    const yBottom = hitY - ((n.start - gameState.currentTime) * gameState.currentSong.speed);
                    
                    if (n.note === note && !n.hit && yBottom >= hitY) {
                        n.hit = true;
                        hit = true;
                    }
                });
            } else {
                // Normal hit detection (if user hits it slightly early)
                gameState.currentSong.notes.forEach(n => {
                    const margin = 200; // ms leeway
                    if (gameState.currentTime >= n.start - margin && gameState.currentTime <= n.start + n.duration + margin) {
                        if (n.note === note && !n.hit) {
                            n.hit = true;
                            hit = true;
                        }
                    }
                });
            }

            if (hit) {
                gameState.score += 10;
                scoreVal.innerText = gameState.score;
                
                if (noteToElement[note]) {
                    noteToElement[note].classList.add('success');
                    setTimeout(() => noteToElement[note].classList.remove('success'), 300);
                }
            }
        }
    };

    const triggerRelease = (note) => {
        if (!currentInstrument || !activeNotes.has(note)) return;
        activeNotes.delete(note);
        
        if (isSustainPedalDown) {
            sustainedNotes.add(note);
        } else {
            currentInstrument.triggerRelease(note);
            if (noteToElement[note]) {
                noteToElement[note].classList.remove('active');
            }
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent continuous triggering on key hold
        
        // Sustain Pedal (Spacebar)
        if (e.code === 'Space') {
            e.preventDefault();
            isSustainPedalDown = true;
            return;
        }

        const key = e.key.toLowerCase();
        if (keyMap[key]) {
            triggerAttack(keyMap[key]);
        }
    });

    window.addEventListener('keyup', (e) => {
        // Sustain Pedal (Spacebar) release
        if (e.code === 'Space') {
            isSustainPedalDown = false;
            sustainedNotes.forEach(note => {
                if (!activeNotes.has(note)) {
                    currentInstrument.triggerRelease(note);
                    if (noteToElement[note]) {
                        noteToElement[note].classList.remove('active');
                    }
                }
            });
            sustainedNotes.clear();
            return;
        }

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

        const now = performance.now();
        const delta = now - gameState.lastTick;
        gameState.lastTick = now;

        if (!gameState.isWaiting) {
            gameState.currentTime += delta;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const speed = gameState.currentSong.speed;
        const hitY = canvas.height;

        let allNotesPassed = true;
        let needsToWait = false;
        let waitingNotes = [];

        gameState.currentSong.notes.forEach(note => {
            if (!noteToElement[note.note]) return;
            
            const keyEl = noteToElement[note.note];
            const keyboardRect = keyboard.getBoundingClientRect();
            const keyRect = keyEl.getBoundingClientRect();
            
            const x = keyRect.left - keyboardRect.left;
            const width = keyRect.width;
            
            const noteHeight = note.duration * speed;
            const distanceToHit = (note.start - gameState.currentTime) * speed;
            
            let yBottom = hitY - distanceToHit;
            let yTop = yBottom - noteHeight;

            // Wait Logic
            if (yBottom >= hitY && !note.hit && gameState.currentTime <= note.start + note.duration + 500) {
                needsToWait = true;
                waitingNotes.push(note.note);
                // Clamp visually to hit-line
                yBottom = hitY;
                yTop = yBottom - noteHeight;
            }

            if (gameState.currentTime < note.start + note.duration + 1000) {
                allNotesPassed = false;
            }

            if (yBottom > 0 && yTop < canvas.height) {
                if (note.hit) {
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
                } else {
                    ctx.fillStyle = keyEl.classList.contains('black') ? '#ff4747' : '#118ab2';
                }
                
                ctx.fillRect(x, yTop, width, noteHeight);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, yTop, width, noteHeight);
            }
        });

        gameState.isWaiting = needsToWait;
        gameState.waitingForNotes = waitingNotes;

        if (allNotesPassed) {
            stopGame();
        } else {
            gameState.animationId = requestAnimationFrame(drawGame);
        }
    };

    const startGame = (song) => {
        gameState.isPlaying = true;
        gameState.startTime = performance.now();
        gameState.lastTick = performance.now();
        gameState.currentTime = 0;
        gameState.isWaiting = false;
        gameState.waitingForNotes = [];
        
        gameState.currentSong = {
            ...song,
            notes: song.notes.map(n => ({...n, hit: false}))
        };
        
        gameState.score = 0;
        scoreVal.innerText = '0';
        
        canvas.classList.add('active');
        document.getElementById('songbook').classList.add('hidden');
        stopGameBtn.classList.remove('hidden');
        scoreDisplay.classList.remove('hidden');

        if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
        drawGame();
    };

    const stopGame = () => {
        gameState.isPlaying = false;
        if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
        
        // UI Updates
        canvas.classList.remove('active');
        songbookEl.classList.remove('hidden'); // Show the book again
        stopGameBtn.classList.add('hidden');
        scoreDisplay.classList.add('hidden');
    };

    stopGameBtn.addEventListener('click', stopGame);

    songbookBtn.addEventListener('click', () => {
        if (gameState.isPlaying) {
            // If playing a game, clicking songbook stops the game and shows the book
            stopGame();
        } else {
            // Otherwise just toggle the book visibility for free-play
            songbookEl.classList.toggle('hidden');
        }
    });

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
