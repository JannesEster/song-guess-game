import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, runTransaction, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { songs } from './song-list.js';
import { gameConfig } from './game-config.js'; // Import the game configuration

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
        players = playersSnapshot.docs.map(doc => doc.data());
        console.log("Scoreboard loaded: ", players);
        updateScoreboard();

        const unsubscribe = onSnapshot(playersCollection, (snapshot) => {
            players = snapshot.docs.map(doc => doc.data());
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

let audio;
let correctSound;
let incorrectSound;
let gameOverSound;
let progressInterval;
let incorrectGuessCount = 0;
let lastPlayedSong = null;

function getRandomSong() {
    if (availableSongs.length === 0) {
        availableSongs = [...songs];
        playedSongs = [];
    }

    let song;
    do {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        song = availableSongs[randomIndex];
    } while (song === lastPlayedSong);

    availableSongs = availableSongs.filter(s => s !== song);
    playedSongs.push(song);
    lastPlayedSong = song;
    return song;
}

async function startGame() {
    localStorage.clear();

    const playerNameInput = document.getElementById('playerName');
    const playerName = playerNameInput.value.trim();

    guessesLeft = 3;
    document.getElementById('guessesLeft').innerText = `${guessesLeft} Guesses Left`;

    if (!playerName) {
        alert('Please enter your name to start the game.');
        return;
    }

    let player = loadScoreFromLocalStorage(playerName);
    if (!players.some(p => p.name === playerName)) {
        players.push(player);
    }

    currentPlayerIndex = players.findIndex(p => p.name === playerName);
    currentRound = 1;

    playerNameInput.style.display = 'none';
    document.getElementById('startGame').style.display = 'none';
    document.getElementById('initialContainer').style.display = 'none';
    document.getElementById('scoreboard').style.display = 'none';
    document.getElementById('resetLeaderboard').style.display = 'none';

    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('roundInfo').style.display = 'block';
    document.getElementById('roundInfo').innerHTML = `Round ${currentRound}<br>Score: ${players[currentPlayerIndex].score}`;
    document.getElementById('result').innerText = "Good Luck! Play Song to start the game!";

    audio = document.getElementById('song');
    correctSound = document.getElementById('correctSound');
    incorrectSound = document.getElementById('incorrectSound');
    gameOverSound = document.getElementById('gameOverSound');

    const testSound = document.getElementById('testSound');
    if (!testSound.paused) {
        testSound.pause();
        testSound.currentTime = 0;
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

    updateScoreboard();
}

function onAudioPlaying() {
    console.log('Song is playing');
}

function onAudioPause(event) {
    const reason = event.target.error ? 'Playback error' : 'Paused manually';
    console.log(`Song not playing (${reason})`);
}

function onAudioLoadedMetadata() {
    const duration = audio.duration;
    const maxStartTime = duration - 15;
    const randomStartTime = Math.floor(Math.random() * (maxStartTime - 15)) + 15;
    let currentTime = randomStartTime;

    progressInterval = setInterval(() => {
        currentTime += 0.1;
        const progress = ((currentTime - randomStartTime) / gameConfig.songDuration) * 100; // Use config value
        document.getElementById('progressBar').style.width = `${progress}%`;

        if (currentTime >= randomStartTime + gameConfig.songDuration) { // Use config value
            clearInterval(progressInterval);
            document.getElementById('progressBar').style.width = '0%';
            audio.pause();
            isPlaying = false;
            document.getElementById('startSong').disabled = false;
        }
    }, 100);

    audio.currentTime = randomStartTime;
    audio.play().then(() => {
        console.log('Song started successfully');
    }).catch(error => {
        console.error('Failed to start playback:', error);
    });
}

function startSong() {
    if (isPlaying || playCount >= maxPlaysPerRound) return;

    clearInterval(progressInterval);
    document.getElementById('result').innerText = '';
    if (!currentSong) {
        currentSong = getRandomSong();
        audio.src = currentSong.url;
        audio.dataset.id = currentSong.id;
    }
    document.getElementById('startSong').disabled = true;
    if (audio.src) {
        audio.load();
    }
    isPlaying = true;
    playCount++;

    if (playCount < maxPlaysPerRound) {
        setTimeout(() => {
            document.getElementById('startSong').disabled = false;
        }, gameConfig.songDuration * 1000);
    }
}

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

function submitGuess() {
    clearInterval(progressInterval);
    audio.pause();
    isPlaying = false;

    const guessInput = document.getElementById('guess');
    const guess = guessInput.value;
    const result = document.getElementById('result');
    const song = playedSongs[playedSongs.length - 1];

    guessInput.value = '';

    if (guess.toLowerCase() === song.name.toLowerCase()) {
        players[currentPlayerIndex].score += 1;
        saveScoreToLocalStorage();
        result.innerText = `Correct! The song is "${song.name}"`;
        correctSound.play();
        incorrectGuessCount = 0;
        document.getElementById('progressBar').style.width = '0%';
        setTimeout(() => {
            nextRound();
        }, 2000);
    } else {
        incorrectGuessCount++;
        guessesLeft--;
        document.getElementById('guessesLeft').innerText = `${guessesLeft} ${guessesLeft === 1 ? 'Guess' : 'Guesses'} Left`;
        incorrectSound.play();
        if (incorrectGuessCount >= 3) {
            incorrectGuessCount = 0;
            setTimeout(() => {
                nextRound();
            }, 2000);
        } else {
            result.innerText = 'Incorrect! Try again.';
            setTimeout(() => {
                const duration = audio.duration;
                const maxStartTime = duration - 15;
                const randomStartTime = Math.floor(Math.random() * (maxStartTime - 15)) + 15;
                audio.currentTime = randomStartTime;
                audio.play().then(() => {
                    progressInterval = setInterval(() => {
                        const currentTime = audio.currentTime;
                        const progress = ((currentTime - randomStartTime) / gameConfig.songDuration) * 100;
                        document.getElementById('progressBar').style.width = `${progress}%`;

                        if (currentTime >= randomStartTime + gameConfig.songDuration) {
                            clearInterval(progressInterval);
                            document.getElementById('progressBar').style.width = '0%';
                            audio.pause();
                            isPlaying = false;
                            if (playCount < maxPlaysPerRound) {
                                setTimeout(() => {
                                    document.getElementById('startSong').disabled = false;
                                }, 2000);
                            }
                        }
                    }, 100);
                }).catch(error => {
                    console.error('Failed to start playback:', error);
                });
            }, 2000);
        }
    }

    document.getElementById('startSong').disabled = true;
    setTimeout(() => {
        document.getElementById('startSong').disabled = false;
    }, 2000);

    updateScoreboard();
}

async function submitFinalScore() {
    const player = players[currentPlayerIndex];
    if (!player) {
        console.error("No current player to save.");
        return;
    }

    const savedPlayer = loadScoreFromLocalStorage(player.name);
    if (savedPlayer) {
        try {
            console.log(`Submitting final score for player: ${savedPlayer.name} with score: ${savedPlayer.score}`);
            await runTransaction(db, async (transaction) => {
                const playerDocRef = doc(collection(db, 'players'), savedPlayer.name);
                const playerDoc = await transaction.get(playerDocRef);

                if (playerDoc.exists()) {
                    transaction.update(playerDocRef, { score: savedPlayer.score });
                } else {
                    transaction.set(playerDocRef, savedPlayer);
                }
            });
            console.log("Final score submission successful");
            localStorage.removeItem(savedPlayer.name);
        } catch (e) {
            console.error("Final score submission failed: ", e);
            alert("Failed to submit the final score. Please try again.");
        }
    }
}

function nextRound() {
    document.getElementById('result').innerText = "Next Round! Play the song once you are ready!";
    currentSong = null;
    guessesLeft = 3;
    document.getElementById('guessesLeft').innerText = `${guessesLeft} Guesses Left`;
    playCount = 0;
    if (currentRound >= maxRounds) {
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('roundInfo').style.display = 'none';
        document.getElementById('songControls').style.display = 'none';
        document.getElementById('scoreboard').style.display = 'block';
        setTimeout(() => {
            gameOverSound.play();
        }, 1000);
        submitFinalScore();
    } else {
        currentRound++;
        if (availableSongs.length === 0) {
            availableSongs = [...songs];
            playedSongs = [];
        }
        document.getElementById('roundInfo').innerHTML = `Round ${currentRound}<br>Score: ${players[currentPlayerIndex].score}`;
        document.getElementById('startSong').style.display = 'block';
        document.getElementById('startSong').disabled = false;
    }
    document.getElementById('progressBar').style.width = '0%';
}

function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '<h2>Leaderboard</h2>';

    players.sort((a, b) => b.score - a.score);

    players.forEach(player => {
        const playerScore = document.createElement('div');
        playerScore.innerText = `${player.name}: ${player.score}`;
        scoreboard.appendChild(playerScore);
    });
    console.log("Scoreboard updated");
}

document.getElementById('newGame').onclick = function() {
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';

    document.getElementById('initialContainer').style.display = 'flex';
    document.getElementById('playerName').style.display = 'block';
    document.getElementById('startGame').style.display = 'inline-block';
    document.getElementById('scoreboard').style.display = 'block';
    document.getElementById('resetLeaderboard').style.display = 'block';

    currentPlayerIndex = 0;
    currentRound = 1;
    guessesLeft = 3;
    playCount = 0;
    playedSongs = [];
    availableSongs = [...songs];
    isPlaying = false;
    incorrectGuessCount = 0;
    lastPlayedSong = null;

    document.getElementById('playerName').value = '';
    document.getElementById('roundInfo').innerText = '';
    document.getElementById('result').innerText = '';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('guessesLeft').innerText = '';
    document.getElementById('songControls').style.display = 'none';
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
        document.getElementById('problemDescription').value = '';
        document.getElementById('reportProblemPopup').style.display = 'none';
    } catch (error) {
        console.error('Error reporting problem: ', error);
        alert('Failed to report the problem. Please try again.');
    }
};
