document.addEventListener('DOMContentLoaded', () => {
    const splashSlide = document.getElementById('splash-slide');
    const cakeSlide = document.getElementById('cake-slide');
    const envelopeSlide = document.getElementById('envelope-slide');
    const rejectionSlide = document.getElementById('rejection-slide');
    const letterSlide = document.getElementById('letter-slide');

    const startButton = document.getElementById('start-button');
    const yesButton = document.getElementById('yes-button');
    const noButton = document.getElementById('no-button');
    const tryAgainButton = document.getElementById('try-again-button');
    const closeLetterButton = document.getElementById('close-letter-button');
    const blowCandleButton = document.getElementById('blow-candle-button');
    const nextFromCakeButton = document.getElementById('next-from-cake');

    const backgroundMusic = document.getElementById('background-music');
    const youtubeAudioPlayer = document.getElementById('youtube-audio-player');
    const youtubeIframe = youtubeAudioPlayer.querySelector('iframe'); // Dapatkan referensi ke iframe
    const flames = document.querySelectorAll('.flame');
    const candlesticks = document.querySelectorAll('.candlestick'); // Ditambahkan kembali deklarasi ini!
    const speechStatus = document.getElementById('speech-status');

    let currentSlide = splashSlide;
    let recognition;
    let isBlowingEnabled = false;
    let candlesExtinguished = false;
    let audioContext; // Declare globally for cleanup
    let mediaStreamSource; // To store the microphone stream source
    let scriptProcessor; // To store the ScriptProcessorNode
    let hasUserInteracted = false; // Flag untuk melacak interaksi pengguna

    // --- Slide Management ---
    function showSlide(slideToShow) {
        if (currentSlide) {
            currentSlide.classList.remove('active');
        }
        slideToShow.classList.add('active');
        currentSlide = slideToShow;
    }

    // --- 🎵 Background Music ---
    function playMusic() {
        if (backgroundMusic.play) {
            backgroundMusic.src = "https://www.youtube.com/embed/vNCDAvLxy_Y?autoplay=1&loop=1&playlist=vNCDAvLxy_Y";
            backgroundMusic.play().catch(e => {
                console.warn("Autoplay audio blocked, trying YouTube iframe:", e);
                // If audio tag fails, try to un-mute/play iframe
                const iframe = youtubeAudioPlayer.querySelector('iframe');
                if (iframe) {
                    iframe.src = "https://www.youtube.com/embed/vNCDAvLxy_Y?autoplay=1&loop=1&playlist=vNCDAvLxy_Y&controls=0"; // Remove mute=1
                    youtubeAudioPlayer.style.display = 'block'; // Make iframe visible if needed
                }
            });
        }
    }

    function pauseMusic() {
        backgroundMusic.pause();
        if (youtubeIframe) {
            // Mute dan "pause" YouTube iframe dengan mereset sumbernya ke autoplay=0 dan mute=1
            const currentSrc = youtubeIframe.src;
            let newSrc = currentSrc.replace(/autoplay=1/, 'autoplay=0');
            newSrc = newSrc.replace(/mute=0/, 'mute=1'); // Mute lagi
            youtubeIframe.src = newSrc; // Mereset src akan menghentikan pemutaran
            console.log("YouTube audio paused and muted.");
        }
    }

    function resumeMusic() {
        playMusic(); // Cukup panggil playMusic, ini akan menangani jika sudah diputar
    }


    // --- Confetti Animation ---
    function createConfetti() {
        const confettiContainer = document.querySelector('.confetti-container');
        confettiContainer.innerHTML = ''; // Clear previous confetti

        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#FF69B4', '#FFA500'];
        const shapes = ['square', 'circle', 'triangle'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
            confetti.classList.add(randomShape);

            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            if (randomShape === 'triangle') {
                 confetti.style.borderBottomColor = randomColor; // Set border color for triangle
            } else {
                 confetti.style.backgroundColor = randomColor;
            }
            confettiContainer.appendChild(confetti);
        }
    }


    // --- Cake & Candle Animations ---
    function animateCandles() { // Fungsi ini sekarang berdiri sendiri dan lengkap
        // Karena hanya ada satu lilin, animasi ini akan berjalan untuk satu lilin
        // Ini langsung menyetel lilin agar terlihat, tanpa animasi jatuh.
        candlesticks.forEach((candlestick, index) => {
            candlestick.style.transition = 'none'; 
            candlestick.style.transform = 'translateY(0) rotate(0deg)';
            candlestick.style.opacity = '1';
        });
    }

    function extinguishCandles() {
        if (!candlesExtinguished) {
            flames.forEach(flame => {
                flame.classList.add('extinguished');
            });
            candlesExtinguished = true;
            speechStatus.textContent = "Candle extinguished! Make a wish! ✨"; // Sesuaikan teks
            nextFromCakeButton.classList.remove('hidden');
            if (recognition) {
                recognition.stop();
            }
            cleanupAudioContext(); // Pastikan membersihkan audio context
            resumeMusic(); // Resume music after blowing is done
        }
    }

    // Fungsi untuk membersihkan AudioContext
    function cleanupAudioContext() {
        if (scriptProcessor) {
            scriptProcessor.disconnect();
            scriptProcessor.onaudioprocess = null;
            scriptProcessor = null;
        }
        if (mediaStreamSource) {
            mediaStreamSource.disconnect();
            mediaStreamSource = null;
        }
        if (audioContext) {
            audioContext.close().then(() => {
                audioContext = null;
                console.log("AudioContext closed.");
            }).catch(e => console.error("Error closing AudioContext:", e));
        }
    }

    // --- Web Speech API for Candle Blowing ---
    function enableSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            speechStatus.textContent = "Speech Recognition not supported in this browser. Please use Chrome.";
            blowCandleButton.disabled = true;
            return;
        }

        pauseMusic(); // Pause music when blowing starts

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; // Get results as they come in
        recognition.lang = 'en-US';

        // Deklarasikan variabel di scope yang benar (atau gunakan yang global)
        // let microphone; // Ini sudah dideklarasikan sebagai global mediaStreamSource
        // let analyser; // Ini sudah dideklarasikan di onstart scope
        // let javascriptNode; // Ini sudah dideklarasikan sebagai global scriptProcessor

        recognition.onstart = () => {
            speechStatus.textContent = "Listening for a blow... 🌬️ (Grant microphone permission)";
            isBlowingEnabled = true;

            // Initialize AudioContext to monitor volume
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        mediaStreamSource = audioContext.createMediaStreamSource(stream); // Menggunakan global mediaStreamSource
                        let analyser = audioContext.createAnalyser(); // Deklarasi lokal untuk analyser
                        analyser.smoothingTimeConstant = 0.3;
                        analyser.fftSize = 1024;
                        mediaStreamSource.connect(analyser);

                        scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1); // Menggunakan global scriptProcessor
                        analyser.connect(scriptProcessor);
                        scriptProcessor.connect(audioContext.destination);

                        scriptProcessor.onaudioprocess = () => {
                            if (!isBlowingEnabled || candlesExtinguished) return;

                            const array = new Uint8Array(analyser.frequencyBinCount);
                            analyser.getByteFrequencyData(array);
                            let sum = 0;
                            for (let i = 0; i < array.length; i++) {
                                sum += array[i];
                            }
                            const average = sum / array.length;

                            // console.log("Average volume:", average); // For debugging volume levels

                            const BLOW_THRESHOLD = 70; // Adjusted value based on testing
                            if (average > BLOW_THRESHOLD) {
                                extinguishCandles();
                            }
                        };
                    })
                    .catch(err => {
                        speechStatus.textContent = "Microphone access denied or error: " + err.message;
                        console.error("Microphone access error:", err);
                        blowCandleButton.disabled = false; // Allow retrying
                        blowCandleButton.textContent = "Enable Blowing";
                        isBlowingEnabled = false;
                        cleanupAudioContext(); // Clean up on error
                        resumeMusic(); // Resume music if microphone access fails
                    });
            } catch (e) {
                speechStatus.textContent = "Web Audio API not supported in this browser.";
                console.error("Web Audio API error:", e);
                blowCandleButton.disabled = true;
                isBlowingEnabled = false;
                resumeMusic(); // Resume music if Web Audio API fails
            }
        };

        recognition.onresult = (event) => {
            // We're primarily using the audio stream, not speech-to-text here
        };

        recognition.onerror = (event) => {
            speechStatus.textContent = "Speech recognition error: " + event.error;
            console.error('Speech recognition error:', event.error);
            isBlowingEnabled = false;
            blowCandleButton.disabled = false;
            blowCandleButton.textContent = "Enable Blowing";
            cleanupAudioContext(); // Pastikan membersihkan audio context
            resumeMusic(); // Resume music on recognition error
        };

        recognition.onend = () => {
            if (!candlesExtinguished) { // If recognition ended but candles are not out
                speechStatus.textContent = "Listening stopped. Try again?";
                blowCandleButton.textContent = "Enable Blowing";
                blowCandleButton.disabled = false;
            }
            isBlowingEnabled = false;
            cleanupAudioContext(); // Ensure audio context is closed if not already
            if (!candlesExtinguished) { // Only resume if blowing didn't succeed
                resumeMusic();
            }
        };

        recognition.start();
        blowCandleButton.textContent = "Listening...";
        blowCandleButton.disabled = true;
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        hasUserInteracted = true; // Set flag interaksi pengguna
        showSlide(cakeSlide);
        createConfetti();
        playMusic(); // Play music immediately on start button click
        animateCandles();
    });

    blowCandleButton.addEventListener('click', () => {
        if (!isBlowingEnabled && !candlesExtinguished) {
            enableSpeechRecognition();
        }
    });

    nextFromCakeButton.addEventListener('click', () => {
        showSlide(envelopeSlide);
    });

    yesButton.addEventListener('click', () => {
        showSlide(letterSlide);
    });

    noButton.addEventListener('click', () => {
        showSlide(rejectionSlide);
    });

    tryAgainButton.addEventListener('click', () => {
        showSlide(envelopeSlide);
    });

    closeLetterButton.addEventListener('click', () => {
        const letterCard = document.querySelector('.letter-card');
        letterCard.style.transform = 'scale(0.2) rotate(30deg)';
        letterCard.style.opacity = '0';
        letterCard.style.filter = 'drop-shadow(0 0 0 rgba(0,0,0,0))';

        setTimeout(() => {
            showSlide(splashSlide);
            // Reset for next interaction
            letterCard.style.transform = 'scale(1) rotate(0deg)';
            letterCard.style.opacity = '1';
            letterCard.style.filter = 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))';

            flames.forEach(flame => flame.classList.remove('extinguished'));
            // candlesticks.forEach(candlestick => candlestick.classList.remove('show-text')); // Ini tidak perlu jika tidak ada teks lilin
            candlesExtinguished = false;
            nextFromCakeButton.classList.add('hidden');
            speechStatus.textContent = "";
            blowCandleButton.textContent = "Enable Blowing";
            blowCandleButton.disabled = false;

            // Clear old confetti and recreate for fresh animation
            const confettiContainer = document.querySelector('.confetti-container');
            confettiContainer.innerHTML = '';
            createConfetti();

        }, 700); // Match this with the transition duration of letter-card in CSS
    });

    // Initial load: show splash slide
    showSlide(splashSlide);
    createConfetti(); // Create confetti once on initial load

    // Add event listener for user interaction to attempt playing music
    // Ini adalah workaround umum untuk kebijakan autoplay browser
    document.body.addEventListener('click', () => {
        hasUserInteracted = true;
        playMusic();
    }, { once: true });
    startButton.addEventListener('click', () => {
        hasUserInteracted = true;
        playMusic();
    }, { once: true });


});
