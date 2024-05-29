import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, runTransaction, onSnapshot, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { songs } from './song-list.js';
import { gameConfig } from './game-config.js';

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
let currentPlayer = null; 

function startSection() {
    const currentSection = getCurrentSection();
    document.getElementById('roundInfo').innerHTML = `Section ${currentSectionIndex + 1}, Round ${sectionRound + 1}<br>Score: ${currentPlayer.score}`;
    document.getElementById('result').innerText = "Good Luck! Play Song to start the game!";
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
    "You have a total of 16 rounds and must complete, or skip through all 16 to be placed on the leaderboard!",
    "You now have 4 seconds to listen to each song!",
    "You now have 2 seconds to listen to each song!",
    "You now only have 1 seconds to listen to each song!"
];

const sectionNotes = [
    "This is the easy section! 4 rounds with 8 seconds to listen to each song! Good Luck!",
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
    document.getElementById('sectionPopupMessage').innerText = message;
    document.getElementById('sectionPopupGuide').innerText = guide;
    document.getElementById('sectionNotes').innerText = note;  
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
    let currentTime = randomStartTime;

    document.getElementById('progressBar').style.width = '0%'; // Reset the progress bar

    progressInterval = setInterval(() => {
        currentTime += 0.1;
        const progress = ((currentTime - randomStartTime) / currentSection.duration) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;

        if (currentTime >= randomStartTime + currentSection.duration) {
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
        hint = `${words[0].substring(0, 2)}${'*'.repeat(words[0].length - 2)}`;
    } else {
        for (let word of words) {
            hint += `${word.charAt(0)}${'*'.repeat(word.length - 1)} `;
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

    const song = currentSong;
    guessInput.value = ''; // Clear the guess input box

    if (guess.toLowerCase() === song.name.toLowerCase().trim()) { // Trim the whitespace from the song name
        currentPlayer.score += 1; // Increment score
        result.innerText = `Correct! The song is "${song.name}"`;
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

        if (incorrectGuessCount >= 2 && gameConfig.enableHints && guessesLeft > 0) {
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
        } else if (guessesLeft === 0) {
            incorrectGuessCount = 0;
            setTimeout(() => {
                nextRound();
            }, 2000); // Move to the next round after an additional 2 seconds
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
        playCount = 0;

        currentRound++;
        document.getElementById('roundInfo').innerHTML = `Section ${currentSectionIndex + 1}, Round ${sectionRound + 1}<br>Score: ${currentPlayer.score}`;
        document.getElementById('startSong').style.display = 'block';
        document.getElementById('startSong').disabled = false;
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

        let guessData = {};
        if (playerDoc.exists()) {
            guessData = playerDoc.data();
        }

        // Determine the next guess index
        const nextIndex = Object.keys(guessData).length + 1;

        // Add the new incorrect guess
        const newGuessKeySong = `songName${nextIndex}`;
        const newGuessKeyUser = `userGuess${nextIndex}`;
    

        guessData[newGuessKeySong] = songName;
        guessData[newGuessKeyUser] = userGuess;
    

        // Save the document
        await setDoc(playerDocRef, guessData);
        console.log('Incorrect guess saved successfully');
    } catch (error) {
        console.error('Error saving incorrect guess:', error);
    }
}

