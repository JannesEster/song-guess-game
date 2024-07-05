import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, runTransaction, onSnapshot, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { songs } from './song-list.js';
import { gameConfig } from './game-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Function to determine if a color is light or dark
    function isColorDark(color) {
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);
        // Calculate the brightness of the color
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
        
    }


    // Function to change the image based on the background color
    function updateLogoBasedOnBackgroundColor() {
        const gameLogo = document.getElementById('gameLogo');
        const darkModeImage = "images/completedjlogoWhite.png";
        const lightModeImage = "images/complete dj logo.png";

        // Get the computed background color of the body
        const backgroundColor = window.getComputedStyle(document.body, null).getPropertyValue('background-color');
        const rgb = backgroundColor.match(/\d+/g);
        const hexColor = `#${((1 << 24) + (+rgb[0] << 16) + (+rgb[1] << 8) + +rgb[2]).toString(16).slice(1)}`;

        if (isColorDark(hexColor)) {
            // Background is dark
            gameLogo.src = darkModeImage;
        } else {
            // Background is light
            gameLogo.src = lightModeImage;
        }
    }

    // Run the function on page load
    updateLogoBasedOnBackgroundColor();
});


document.getElementById('testVolume').onclick = function() {
    const testSound = document.getElementById('testSound');
    testSound.play();
};

document.getElementById('volumeSlider').oninput = function() {
    const volume = this.value;
    const audioElements = ['song', 'correctSound', 'incorrectSound', 'gameOverSound', 'testSound'];
    audioElements.forEach(id => {
        const audioElement = document.getElementById(id);
        if (audioElement) {
            audioElement.volume = volume;
        }
    });
};

async function saveScoreboard() {
    const playersCollection = collection(db, 'players');
    const player = players[currentPlayerIndex];

    if (!player) {
        console.error("No current player to save.");
        return;
    }

    try {
        console.log(`Saving score for player: ${player.name} with score: ${player.score}`);
        await runTransaction(db, async (transaction) => {
            const playerDocRef = doc(playersCollection, player.name);
            const playerDoc = await transaction.get(playerDocRef);

            if (playerDoc.exists()) {
                transaction.update(playerDocRef, { score: player.score });
            } else {
                transaction.set(playerDocRef, player);
            }
        });
        console.log("Transaction successful");
    } catch (e) {
        console.error("Transaction failed: ", e);
        alert("Failed to save the score. Please try again.");
    }
}

let unsubscribeListeners = [];

async function loadScoreboard() {
    try {
        console.log("Loading scoreboard...");
        const playersCollection = collection(db, 'players');
        const playersSnapshot = await getDocs(playersCollection);
        players = playersSnapshot.docs
            .map(doc => doc.data())
            .filter(player => player.finished); // Filter to only include finished players
        console.log("Scoreboard loaded: ", players);
        updateScoreboard();

        const unsubscribe = onSnapshot(playersCollection, (snapshot) => {
            players = snapshot.docs
                .map(doc => doc.data())
                .filter(player => player.finished); // Filter to only include finished players
            console.log("Scoreboard updated from snapshot: ", players);
            updateScoreboard();
        });

        unsubscribeListeners.push(unsubscribe);
    } catch (error) {
        console.error("Error loading scoreboard: ", error);
    }
}



function cleanupFirestoreListeners() {
    unsubscribeListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    unsubscribeListeners = [];
}

window.addEventListener('beforeunload', function () {
    cleanupFirestoreListeners();
});

async function resetScoreboard() {
    const playersCollection = collection(db, 'players');

    console.log("Starting transaction to reset scoreboard");

    try {
        await runTransaction(db, async (transaction) => {
            const playersSnapshot = await getDocs(playersCollection);
            playersSnapshot.docs.forEach((playerDoc) => {
                console.log("Deleting player:", playerDoc.id);
                transaction.delete(playerDoc.ref);
            });

            players = [];
        });
        console.log("Transaction successful");
        updateScoreboard();
    } catch (e) {
        console.error("Transaction failed: ", e);
    }
}

document.getElementById('gameLogo').onclick = function() {
    const password = prompt("Enter the password");
    if (password === "CDJexpo") {
        location.href="links.html"
    } else {
        location.href="https://www.completedj.com.au/"    
    }
};

document.getElementById('resetLeaderboard').onclick = function() {
    const password = prompt("Enter the password to reset the leaderboard:");
    if (password === "gamemaster") {
        resetScoreboard();
    } else {
        alert("Incorrect password. Leaderboard reset canceled.");
    }
};

window.onload = function() {
    const volume = document.getElementById('volumeSlider').value;
    const audioElements = ['song', 'correctSound', 'incorrectSound', 'gameOverSound', 'testSound'];
    audioElements.forEach(id => {
        const audioElement = document.getElementById(id);
        if (audioElement) {
            audioElement.volume = volume;
        }
    
    });

    loadScoreboard();
    document.getElementById('scoreboard').style.display = 'block';
    document.getElementById('resetLeaderboard').style.display = 'block';

    // Ensure audio element is selected before preloading songs
    audio = document.getElementById('song');
    preloadSongs();
};

document.getElementById('startGame').onclick = startGame;
document.getElementById('startSong').onclick = startSong;
document.getElementById('submitGuess').onclick = submitGuess;

let guessesLeft = 3;
let playCount = 0;
const maxPlaysPerRound = 2;
let players = [];
let currentPlayerIndex = 0;
let playedSongs = [];
let availableSongs = [...songs];
let currentRound = 1;
const maxRounds = gameConfig.numberOfRounds; // Use the config value
let currentSong;
let isPlaying = false;

let audio = document.getElementById('song');

let correctSound;
let incorrectSound;
let gameOverSound;
let progressInterval;
let incorrectGuessCount = 0;
let lastPlayedSong = null;
let currentPlayer = null; 

function startSection() {
    const currentSection = getCurrentSection();
    document.getElementById('roundInfo').innerHTML = `Section ${currentSectionIndex + 1}, Round ${sectionRound + 1}<br>Score: ${currentPlayer.score}`;
    document.getElementById('result').innerText = "Good Luck! Play Song to start the game!";

    // Preload the first song for the new section
    const currentPreloadedSection = preloadedSections[currentSectionIndex];
    currentSectionSongs = currentPreloadedSection.songs.slice();
    preloadCurrentSong(); // Preload the first song for the new section
}

let preloadedSongs = [];

function getRandomSongsForSection(difficulty, count) {
    const availableSongsForDifficulty = songs.filter(song => song.difficulty === difficulty && !playedSongs.includes(song.id));
    const selectedSongs = [];
    while (selectedSongs.length < count && availableSongsForDifficulty.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongsForDifficulty.length);
        const song = availableSongsForDifficulty.splice(randomIndex, 1)[0];
        selectedSongs.push(song);
        playedSongs.push(song.id); // Mark the song as played
    }
    return selectedSongs;
}

let currentSectionSongs = [];

function preloadCurrentSong() {
    if (currentSectionSongs.length > 0) {
        currentSong = currentSectionSongs.shift();
        audio = document.getElementById('song'); // Ensure audio element is referenced
        audio.src = currentSong.url;
        audio.dataset.id = currentSong.id;
        console.log(`Preloaded song for round: ${currentRound}, section: ${currentSectionIndex + 1}`, currentSong);
    }
}

let preloadedSections = [];

function preloadSongs() {
    const preloadContainer = document.getElementById('preloadContainer');
    preloadContainer.innerHTML = ''; // Clear any previous preloaded songs
    playedSongs = []; // Reset the played songs array
    preloadedSections = []; // Reset the preloaded sections array

    gameConfig.sections.forEach((section, index) => {
        const songsToPreload = getRandomSongsForSection(section.difficulty, section.rounds);
        console.log(`Preloading songs for section ${index + 1} ${section.difficulty} difficulty:`, songsToPreload);
        preloadedSections.push({
            section: index + 1,
            difficulty: section.difficulty,
            songs: songsToPreload
        });

        songsToPreload.forEach(song => {
            const audioElement = document.createElement('audio');
            audioElement.src = song.url;
            audioElement.preload = 'auto';
            preloadContainer.appendChild(audioElement);
        });
    });

    // Initialize the songs for the first section
    const firstSection = preloadedSections[0];
    currentSectionSongs = firstSection.songs.slice();
    preloadCurrentSong(); // Preload the first song for the first section
}


function getRandomSong() {
    const currentSection = getCurrentSection();
    const availableSongsForDifficulty = songs.filter(song => song.difficulty === currentSection.difficulty && !playedSongs.includes(song.id));

    if (availableSongsForDifficulty.length === 0) {
        throw new Error("No more songs available for the current section difficulty");
    }

    let song;
    do {
        const randomIndex = Math.floor(Math.random() * availableSongsForDifficulty.length);
        song = availableSongsForDifficulty[randomIndex];
    } while (playedSongs.includes(song.id));

    playedSongs.push(song.id);
    return song;
}

async function fetchPlayerFromFirebase(playerName) {
    const playersCollection = collection(db, 'players');
    const playerDocRef = doc(playersCollection, playerName);
    const playerDoc = await getDoc(playerDocRef);

    if (playerDoc.exists()) {
        const playerData = playerDoc.data();
        // If the player has finished the game, keep highestScore and reset score
        if (playerData.finished) {
            playerData.score = 0;
            //playerData.finished = false; // Reset finished to false for a new game
        }
        return playerData;
    } else {
        // If the player doesn't exist in Firebase, create a new player entry
        const newPlayer = { name: playerName, score: 0, highestScore: 0, finished: false, roundsPlayed: 0 }; // Initialize fields
        await setDoc(playerDocRef, newPlayer);
        return newPlayer;
    }
}


let currentSectionIndex = 0;
let sectionRound = 0;

const sectionMessages = [
    "Let's start nice and easy!" ,
    "Let's make it slightly harder!",
    "It's going to get hard now!",
    "The Boss Level!"
];

const sectionGuides = [
    "You have a total of 20 rounds and must complete, or skip through all 20 to be placed on the leaderboard!",
    "You now have 4 seconds to listen to each song!",
    "You now have 2 seconds to listen to each song!",
    "You now only have 1 seconds to listen to each song!"
];

const sectionNotes = [
    "This is the easy section! 2 rounds with 6 seconds to listen to each song! Good Luck!",
    "Here comes the next 4 rounds! Good Luck!",
    "An incorrect guess will give you a extra listen, use this wisely!",
    "This is the hardest section! Feel free to skip to the end if you find it too hard :)"
];

function getCurrentSection() {
    return gameConfig.sections[currentSectionIndex];
}

function showSectionPopup() {
    const message = sectionMessages[currentSectionIndex];
    const guide = sectionGuides[currentSectionIndex];
    const note = sectionNotes[currentSectionIndex];
    
    let scoringExplanation = '';
    if (currentSectionIndex === 0) { // Only add scoring explanation for the first section
        scoringExplanation = `
            <h3>Scoring System:</h3>
            <p>If you guess the song correctly on the first try, you receive 3 points.</p>
            <p>On the second try, you receive 2 points.</p>
            <p>On the final try, you receive 1 point.</p>
            <p>If you guess the song incorrectly on all tries, you receive 0 points.</p>
        `;
    }

    document.getElementById('sectionPopupMessage').innerHTML = message;
    document.getElementById('sectionPopupGuide').innerHTML = guide + scoringExplanation;
    document.getElementById('sectionNotes').innerHTML = note;  
    document.getElementById('sectionPopup').style.display = 'block';
}

function closeSectionPopup() {
    document.getElementById('sectionPopup').style.display = 'none';
    document.getElementById('startSectionButton').disabled = true; // Disable the button temporarily
    setTimeout(() => {
        document.getElementById('startSectionButton').disabled = false; // Enable the button after a short delay
    }, 1000); // Adjust the delay as needed
}

document.getElementById('closeSectionPopup').onclick = closeSectionPopup;
document.getElementById('startSectionButton').onclick = function() {
    closeSectionPopup();
    startSection();
};





async function startGame() {
    localStorage.clear(); // Clear local storage before starting a new game

    const playerNameInput = document.getElementById('playerName');
    let playerName = playerNameInput.value.trim();
    playedSongs = [];


    if (!playerName) {
        playerName = sessionStorage.getItem('currentPlayer');
    } else {
        sessionStorage.setItem('currentPlayer', playerName);
    }

    guessesLeft = 3;
    document.getElementById('guessesLeft').innerText = `${guessesLeft} Guesses Left`;

    if (!playerName) {
        alert('Please enter your name to start the game.');
        return;
    }

    const player = await fetchPlayerFromFirebase(playerName); // Fetch player data from Firebase
    player.roundsPlayed += 1; // Increment rounds played

    await setDoc(doc(collection(db, 'players'), playerName), player); // Update the database

    players = []; // Clear the players array to ensure no players are in it at the start of the game

    currentPlayerIndex = -1; // Set to an invalid index to start
    currentRound = 1;

    console.log(`Starting game for player: ${player.name}`);

    playerNameInput.style.display = 'none';
    document.getElementById('startGame').style.display = 'none';
    document.getElementById('initialContainer').style.display = 'none';
    document.getElementById('scoreboard').style.display = 'none'; // Hide the leaderboard
    document.getElementById('resetLeaderboard').style.display = 'none'; // Hide the reset button

    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('roundInfo').style.display = 'block'; // Ensure roundInfo is visible
    document.getElementById('roundInfo').innerHTML = `Round ${currentRound}<br>Score: ${player.score}`;
    document.getElementById('result').innerText = "Good Luck! Play Song to start the game!";

    audio = document.getElementById('song');
    correctSound = document.getElementById('correctSound');
    incorrectSound = document.getElementById('incorrectSound');
    gameOverSound = document.getElementById('gameOverSound');

    // Stop the test sound if it is playing
    const testSound = document.getElementById('testSound');
    if (!testSound.paused) {
        testSound.pause();
        testSound.currentTime = 0; // Reset to the beginning
    }

    audio.removeEventListener('playing', onAudioPlaying);
    audio.removeEventListener('pause', onAudioPause);
    audio.removeEventListener('loadedmetadata', onAudioLoadedMetadata);
    audio.addEventListener('playing', onAudioPlaying);
    audio.addEventListener('pause', onAudioPause);
    audio.addEventListener('loadedmetadata', onAudioLoadedMetadata);

    document.getElementById('songControls').style.display = 'block';
    document.getElementById('guess').style.display = 'inline';
    document.getElementById('submitGuess').style.display = 'inline';

    currentPlayer = player; // Store the current player for the session
    updateScoreboard();

    showSectionPopup(); // Show the popup for the first section
}







function onAudioPlaying() {
    console.log('Song is playing');
}

function onAudioPause(event) {
    const reason = event.target.error ? 'Playback error' : 'Paused manually';
    console.log(`Song not playing (${reason})`);
}

function onAudioLoadedMetadata() {
    const currentSection = getCurrentSection();
    const randomStartTime = Math.floor(Math.random() * (audio.duration - currentSection.duration));
    audio.currentTime = randomStartTime;

    document.getElementById('progressBar').style.width = '0%'; // Reset the progress bar
    console.log(`Audio metadata loaded. Ready to start at: ${randomStartTime}`);
}

function updatePlaysLeft() {
    const playsLeftElement = document.getElementById('playsLeft');
    const playsLeft = maxPlaysPerRound - playCount;
    if (playsLeft === 0) {
        playsLeftElement.innerText = "No Plays Left";
        playsLeftElement.style.display = 'block'; // Ensure "Plays Left" is visible
    } else {
        playsLeftElement.innerText = `${playsLeft} ${playsLeft === 1 ? 'Play' : 'Plays'} Left`;
        playsLeftElement.style.display = 'block'; // Ensure "Plays Left" is visible
    }
}


function startSong() {
    if (isPlaying || playCount >= maxPlaysPerRound) return;

    clearInterval(progressInterval);
    document.getElementById('result').innerText = '';
    document.getElementById('startSong').disabled = true;

    if (audio.src) {
        audio.load(); // Ensure the audio is loaded
        audio.play().then(() => {
            console.log('Song started successfully');
            isPlaying = true;
            playCount++;
            updatePlaysLeft(); // Update plays left

            const currentSection = getCurrentSection();
            const startTime = audio.currentTime;
            let currentTime = startTime;

            progressInterval = setInterval(() => {
                currentTime += 0.1;
                const progress = ((currentTime - startTime) / currentSection.duration) * 100;
                document.getElementById('progressBar').style.width = `${progress}%`;

                if (currentTime >= startTime + currentSection.duration) {
                    clearInterval(progressInterval);
                    document.getElementById('progressBar').style.width = '0%';
                    audio.pause();
                    isPlaying = false;
                    document.getElementById('startSong').disabled = false;
                }
            }, 100);

            if (playCount < maxPlaysPerRound) {
                setTimeout(() => {
                    document.getElementById('startSong').disabled = false;
                }, gameConfig.songDuration * 1000);
            }
        }).catch(error => {
            console.error('Failed to start playback:', error);
        });
    }
}




// Update the saveScoreToLocalStorage function to include the player's name
function saveScoreToLocalStorage() {
    const player = players[currentPlayerIndex];
    if (player) {
        localStorage.setItem(player.name, JSON.stringify(player));
        console.log(`Saved score to local storage for ${player.name}: ${player.score}`);
    }
}

function loadScoreFromLocalStorage(playerName) {
    const savedPlayer = localStorage.getItem(playerName);
    if (savedPlayer) {
        console.log(`Loaded score from local storage for ${playerName}`);
        return JSON.parse(savedPlayer);
    }
    return { name: playerName, score: 0 };
}

// Function to generate hint with first character of each word or first two characters of a single word
function generateHint(songName) {
    const words = songName.split(' ');
    let hint = '';

    if (words.length === 1) {
        hint = `${words[0].substring(0, 2)}${'-'.repeat(words[0].length - 2)}`;
    } else {
        for (let word of words) {
            hint += `${word.charAt(0)}${'-'.repeat(word.length - 1)} `;
        }
        hint = hint.trim(); // Remove trailing space
    }

    return hint;
}

function submitGuess() {
    clearInterval(progressInterval);
    audio.pause();
    isPlaying = false;

    const guessInput = document.getElementById('guess');
    const guess = guessInput.value.trim(); // Trim the whitespace from the guess
    const result = document.getElementById('result');
    
    if (!currentSong) {
        result.innerText = 'No song is currently playing. Please start the song first.';
        return;
    }

    if (!guess) {
        result.innerText = 'Please enter a guess.';
        return;
    }

    const song = currentSong;
    guessInput.value = ''; // Clear the guess input box

    if (guess.toLowerCase() === song.name.toLowerCase().trim()) { // Trim the whitespace from the song name
        let pointsAwarded;
        switch (incorrectGuessCount) {
            case 0:
                pointsAwarded = 3; // First try
                break;
            case 1:
                pointsAwarded = 2; // Second try
                break;
            case 2:
                pointsAwarded = 1; // Final try
                break;
        }
        currentPlayer.score += pointsAwarded; // Award points based on the number of incorrect guesses
        result.innerText = `Correct! The song is "${song.name}". You earned ${pointsAwarded} points.`;
        correctSound.play();
        incorrectGuessCount = 0;
        document.getElementById('progressBar').style.width = '0%'; // Reset the progress bar

        // Trigger confetti explosion
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });

        setTimeout(() => {
            nextRound();
        }, 2000); // Move to the next round after an additional 2 seconds
    } else {
        // Save the incorrect guess to Firebase
        saveIncorrectGuess(song.name, guess, currentPlayer.name);

        incorrectGuessCount++;
        guessesLeft--; // Decrement guesses left
        if (guessesLeft < 0) guessesLeft = 0; // Ensure guesses left do not go below 0

        document.getElementById('guessesLeft').innerText = `${guessesLeft} ${guessesLeft === 1 ? 'Guess' : 'Guesses'} Left`;
        incorrectSound.play();

        if (guessesLeft === 0) {
            result.innerText = `Incorrect! The correct answer was "${song.name}". You earned 0 points.`;
            incorrectGuessCount = 0;
            setTimeout(() => {
                nextRound();
            }, 4000); // Move to the next round after an additional 4 seconds
        } else if (incorrectGuessCount >= 2 && gameConfig.enableHints && guessesLeft > 0) {
            const hint = generateHint(song.name);
            result.innerText = `Hint! The song name is "${hint}".`;
            // Restart the song playback for the remaining duration
            setTimeout(() => {
                const currentSection = getCurrentSection();
                const randomStartTime = Math.floor(Math.random() * (audio.duration - currentSection.duration));
                audio.currentTime = randomStartTime;

                // Reset and restart the progress bar
                clearInterval(progressInterval);
                document.getElementById('progressBar').style.width = '0%';
                let currentTime = randomStartTime;
                const duration = currentSection.duration;
                progressInterval = setInterval(() => {
                    currentTime += 0.1;
                    const progress = ((currentTime - randomStartTime) / duration) * 100;
                    document.getElementById('progressBar').style.width = `${progress}%`;

                    if (currentTime >= randomStartTime + duration) {
                        clearInterval(progressInterval);
                        document.getElementById('progressBar').style.width = '0%';
                        audio.pause();
                        isPlaying = false;
                        if (playCount < maxPlaysPerRound) {
                            setTimeout(() => {
                                document.getElementById('startSong').disabled = false;
                            }, 2000); // Enable button after 2 seconds
                        }
                    }
                }, 100);

                audio.play().then(() => {
                    console.log('Song restarted successfully');
                }).catch(error => {
                    console.error('Failed to start playback:', error);
                });
            }, 2000);
        } else {
            result.innerText = 'Incorrect! Try again.';
            // Restart the song playback for the remaining duration
            setTimeout(() => {
                const currentSection = getCurrentSection();
                const randomStartTime = Math.floor(Math.random() * (audio.duration - currentSection.duration));
                audio.currentTime = randomStartTime;

                // Reset and restart the progress bar
                clearInterval(progressInterval);
                document.getElementById('progressBar').style.width = '0%';
                let currentTime = randomStartTime;
                const duration = currentSection.duration;
                progressInterval = setInterval(() => {
                    currentTime += 0.1;
                    const progress = ((currentTime - randomStartTime) / duration) * 100;
                    document.getElementById('progressBar').style.width = `${progress}%`;

                    if (currentTime >= randomStartTime + duration) {
                        clearInterval(progressInterval);
                        document.getElementById('progressBar').style.width = '0%';
                        audio.pause();
                        isPlaying = false;
                        if (playCount < maxPlaysPerRound) {
                            setTimeout(() => {
                                document.getElementById('startSong').disabled = false;
                            }, 2000); // Enable button after 2 seconds
                        }
                    }
                }, 100);

                audio.play().then(() => {
                    console.log('Song restarted successfully');
                }).catch(error => {
                    console.error('Failed to start playback:', error);
                });
            }, 2000);
        }
    }

    document.getElementById('startSong').disabled = true; // Disable button for 2 seconds
    setTimeout(() => {
        document.getElementById('startSong').disabled = false;
    }, 2000);

    updateScoreboard(); // Update the scoreboard after each guess
}



document.getElementById('closeEmailPopup').onclick = function() {
    document.getElementById('emailPopup').style.display = 'none';
};

document.getElementById('submitEmail').onclick = async function() {
    const email = document.getElementById('playerEmail').value.trim();
    if (email) {
        const player = currentPlayer;
        player.email = email;
        await setDoc(doc(collection(db, 'players'), player.name), player); // Update the database with the email
        document.getElementById('emailPopup').style.display = 'none';

        // URL encode the email address
        const encodedEmail = encodeURIComponent(player.email);
        const encodedName = encodeURIComponent(player.name);
        const score = player.score;

        // Update the webhook URL to include the email
        const webhookUrl = `https://hook.eu1.make.com/v3fyie85d7h26qelrwc39hkr08vv93t6?name=${encodedName}&score=${score}&email=${encodedEmail}`;

        // Send the player name, score, and email to the webhook URL
        const response = await fetch(webhookUrl, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Failed to send data to webhook: ${response.statusText}`);
        }

        console.log("Data sent to webhook successfully");
    } else {
        alert('Please enter a valid email address.');
    }
};






async function submitFinalScore() {
    const player = currentPlayer;
    if (!player) {
        console.error("No current player to save.");
        return;
    }

    try {
        console.log(`Submitting final score for player: ${player.name} with score: ${player.score}`);
        player.finished = true; // Mark the game as finished
        player.highestScore = Math.max(player.highestScore, player.score); // Update highest score if current score is higher
        await runTransaction(db, async (transaction) => {
            const playerDocRef = doc(collection(db, 'players'), player.name);
            const playerDoc = await transaction.get(playerDocRef);

            if (playerDoc.exists()) {
                transaction.update(playerDocRef, player);
            } else {
                transaction.set(playerDocRef, player);
            }
        });
        console.log("Final score submission successful");

        // Show the email popup
        document.getElementById('emailPopup').style.display = 'block';
    } catch (e) {
        console.error("Final score submission failed: ", e);
        alert("Failed to submit the final score. Please try again.");
    }
}





function nextRound() {
    sectionRound++;
    if (sectionRound >= getCurrentSection().rounds) {
        sectionRound = 0;
        currentSectionIndex++;
        if (currentSectionIndex < gameConfig.sections.length) {
            showSectionPopup(); // Show the popup for the new section

            // Preload the first song for the new section
            const newSection = preloadedSections[currentSectionIndex];
            currentSectionSongs = newSection.songs.slice();
            preloadCurrentSong();
        }
    }

    if (currentSectionIndex >= gameConfig.sections.length) {
        // Game over
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('roundInfo').style.display = 'none';
        document.getElementById('songControls').style.display = 'none';
        document.getElementById('scoreboard').style.display = 'block';
        setTimeout(() => {
            gameOverSound.play();
        }, 1000);
        players.push(currentPlayer);
        submitFinalScore();
    } else {
        console.log(`Player: ${currentPlayer.name} is starting section ${currentSectionIndex + 1}, round ${sectionRound + 1}`);
        document.getElementById('result').innerText = "Next Round! Play the song once you are ready!";
        currentSong = null;
        guessesLeft = 3;
        document.getElementById('guessesLeft').innerText = `${guessesLeft} Guesses Left`;
        
        playCount = 0; // Reset play count before updating the display
        updatePlaysLeft(); // Update the "Plays Left" display
        document.getElementById('playsLeft').style.display = 'block'; // Ensure "Plays Left" is visible

        currentRound++;
        document.getElementById('roundInfo').innerHTML = `Section ${currentSectionIndex + 1}, Round ${sectionRound + 1}<br>Score: ${currentPlayer.score}`;
        document.getElementById('startSong').style.display = 'block';
        document.getElementById('startSong').disabled = false;

        // Preload the next song for the new round
        preloadCurrentSong();
    }

    document.getElementById('progressBar').style.width = '0%';
}







function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '<h2>Leaderboard</h2>';

    // Sort players by highest score in descending order
    players.sort((a, b) => b.highestScore - a.highestScore);

    players.forEach(player => {
        const playerScore = document.createElement('div');
        playerScore.innerText = `${player.name}: ${player.highestScore} `; //(Rounds played: ${player.roundsPlayed}) to display rounds played
        scoreboard.appendChild(playerScore);
    });
    console.log("Scoreboard updated");
}


document.getElementById('newGame').onclick = function() {
    location.reload();
};

document.getElementById('startGame').onclick = startGame;
document.getElementById('startSong').onclick = startSong;
document.getElementById('submitGuess').onclick = submitGuess;
document.getElementById('skipRound').onclick = function() {
    if (!isPlaying) {
        nextRound();
    }
};

document.getElementById('reportProblem').onclick = function() {
    document.getElementById('reportProblemPopup').style.display = 'block';
};

document.querySelector('.close').onclick = function() {
    document.getElementById('reportProblemPopup').style.display = 'none';
};

window.onclick = function(event) {
    if (event.target == document.getElementById('reportProblemPopup')) {
        document.getElementById('reportProblemPopup').style.display = 'none';
    }
};

document.getElementById('submitProblem').onclick = async function() {
    const problemDescription = document.getElementById('problemDescription').value.trim();

    if (!problemDescription) {
        alert('Please describe the problem.');
        return;
    }

    try {
        const issuesCollection = collection(db, 'issues');
        await addDoc(issuesCollection, { description: problemDescription, timestamp: new Date() });
        alert('Problem reported successfully.');
        document.getElementById('problemDescription').value = ''; // Clear the textarea
        document.getElementById('reportProblemPopup').style.display = 'none'; // Close the popup
    } catch (error) {
        console.error('Error reporting problem: ', error);
        alert('Failed to report the problem. Please try again.');
    }
};

async function saveIncorrectGuess(songName, userGuess, playerName) {
    if (!userGuess.trim()) {
        // If the user guess is empty or only whitespace, do not create an entry
        return;
    }
    try {
        const incorrectGuessesCollection = collection(db, 'incorrectGuesses');
        const playerDocRef = doc(incorrectGuessesCollection, playerName);

        // Get the existing document
        const playerDoc = await getDoc(playerDocRef);

        let guessData = playerDoc.exists() ? playerDoc.data() : { guesses: [] };

        // Determine the next guess index
        const nextIndex = guessData.guesses.length;

        // Add the new incorrect guess
        guessData.guesses.push({
            songName,
            userGuess
        });

        // Save the document
        await setDoc(playerDocRef, guessData);
        console.log('Incorrect guess saved successfully');
    } catch (error) {
        console.error('Error saving incorrect guess:', error);
    }
}
