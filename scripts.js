
import { db } from './index.html';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

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
    const playersSnapshot = await getDocs(playersCollection);
    const playerDocs = playersSnapshot.docs;

    // Delete all previous player documents
    playerDocs.forEach(async (playerDoc) => {
        await deleteDoc(doc(db, 'players', playerDoc.id));
    });

    // Add current players to Firestore
    players.forEach(async (player) => {
        await addDoc(collection(db, 'players'), player);
    });
}

async function loadScoreboard() {
    const playersCollection = collection(db, 'players');
    const playersSnapshot = await getDocs(playersCollection);
    players = playersSnapshot.docs.map(doc => doc.data());
    updateScoreboard();
}

async function resetScoreboard() {
    players = [];
    await saveScoreboard();
    updateScoreboard();
}

// Ensure the scoreboard is loaded when the page loads
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
};

const songs = [
    { id: 1, name: "Turn down for what", artist: "DJ Snake, Lil Jon", year: 2013, url: "songs/Turn Down for What.m4a" },
    { id: 2, name: "Jump around", artist: "House of Pain", year: 1992, url: "songs/Jump Around.mp3" },
    { id: 3, name: "24k magic", artist: "Bruno Mars", year: 2016, url: "songs/24K Magic.m4a" },
    { id: 4, name: "We like to party", artist: "Vengaboys", year: 1998, url: "songs/We Like to Party! (the Vengabus).m4a" },
    { id: 5, name: "All the Small Things", artist: "Blink 182", year: 1999, url: "songs/All the Small Things.mp3" },
    { id: 6, name: "One More Time", artist: "Daft Punk", year: 2000, url: "songs/Daft Punk - One More Time.mp3" },
    { id: 7, name: "Dreams", artist: "Fleetwood Mac", year: 1977, url: "songs/Fleetwood Mac - Dreams - 2004 Remastered Edition.mp3" },
    { id: 8, name: "Starships", artist: "Nicki Minaj", year: 2012, url: "songs/Nicki_Minaj-Starships-DJ_Intro___DJ_Outro_Clean 2.mp3" },
    { id: 9, name: "The Real Slim Shady", artist: "Eminem", year: 2000, url: "songs/The Real Slim Shady (DJ SLICK Extended Mi.mp3" },
    { id: 10, name: "Titanium", artist: "David Guetta & Sia", year: 2011, url: "songs/Titanium (Feat. Sia).mp3" },
    { id: 11, name: "Untouched", artist: "The Veronicas", year: 2007, url: "songs/Untouched.m4a" },
    { id: 12, name: "Sandstorm", artist: "Darude", year: 1999, url: "songs/(darude) sandstorm (original mix).mp3" },
    { id: 13, name: "Baby", artist: "Justin Bieber feat. Ludacris", year: 2010, url: "songs/Baby (DJ SLICK Extended Mix).mp3" },
    { id: 14, name: "Blame it on the Boogie", artist: "The Jacksons", year: 1978, url: "songs/Blame it on the Boogie.m4a" },
    { id: 15, name: "Celebration", artist: "Kool & the Gang", year: 1980, url: "songs/Celebration.mp3" },
    { id: 16, name: "Crank That", artist: "Soulja Boy Tell 'Em", year: 2007, url: "songs/Crank That (Soulja Boy).m4a" },
    { id: 17, name: "Dancing Queen", artist: "ABBA", year: 1976, url: "songs/Dancing Queen.m4a" },
    { id: 18, name: "Freaks", artist: "Timmy Trumpet & Savage", year: 2014, url: "songs/Freaks (Radio Edit).m4a" },
    { id: 19, name: "Good Vibrations", artist: "The Beach Boys", year: 1966, url: "songs/Good Vibrations.m4a" },
    { id: 20, name: "Ice Ice Baby", artist: "Vanilla Ice", year: 1990, url: "songs/Ice Ice Baby.mp3" },
    { id: 21, name: "Jenny from the Block", artist: "Jennifer Lopez", year: 2002, url: "songs/Jenny from the Block.m4a" },
    { id: 22, name: "Just Dance", artist: "Lady Gaga", year: 2008, url: "songs/Just Dance.m4a" },
    { id: 23, name: "Levels", artist: "Avicii", year: 2011, url: "songs/Levels.m4a" },
    { id: 24, name: "Love Story", artist: "Taylor Swift", year: 2008, url: "songs/Love Story.mp3" },
    { id: 25, name: "Shake It Off", artist: "Taylor Swift", year: 2014, url: "songs/Shake It Off.m4a" },
    { id: 26, name: "Wannabe", artist: "Spice Girls", year: 1996, url: "songs/Spice Girls - Wannabe.mp3" },
    { id: 27, name: "Teenage Dirtbag", artist: "Wheatus", year: 2000, url: "songs/Teenage Dirtbag.mp3" },
    { id: 28, name: "Life Is A Highway", artist: "Tom Cochrane", year: 1991, url: "songs/Tom Cochrane - Life Is A Highway.mp3" },
    { id: 29, name: "Tour", artist: "Macky Gee", year: 2017, url: "songs/Tour.m4a" },
    { id: 30, name: "Uptown Girl", artist: "Billy Joel", year: 1983, url: "songs/Uptown Girl.mp3" },
    { id: 31, name: "We Are Family", artist: "Sister Sledge", year: 1979, url: "songs/We Are Family.mp3" },
    { id: 32, name: "Yeah 3x", artist: "Chris Brown", year: 2011, url: "songs/Yeah 3x.mp3" }
];


let guessesLeft = 3;
let playCount = 0;
const maxPlaysPerRound = 2;
let players = [];
let currentPlayerIndex = 0;
let playedSongs = [];
let availableSongs = [...songs];
let currentRound = 1;
const maxRounds = 10;
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

function startGame() {
    const playerNameInput = document.getElementById('playerName');
    const playerName = playerNameInput.value.trim();

    guessesLeft = 3;
    document.getElementById('guessesLeft').innerText = `${guessesLeft} Guesses Left`;

    if (!playerName) {
        alert('Please enter your name to start the game.');
        return;
    }

    if (!players.some(player => player.name === playerName)) {
        players.push({ name: playerName, score: 0 });
    }

    currentPlayerIndex = players.findIndex(player => player.name === playerName);
    currentRound = 1;

    playerNameInput.style.display = 'none';
    document.getElementById('startGame').style.display = 'none';
    document.getElementById('initialContainer').style.display = 'none';

    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('roundInfo').innerText = `Round ${currentRound}`;
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
        const progress = ((currentTime - randomStartTime) / 10) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;

        if (currentTime >= randomStartTime + 10) {
            clearInterval(progressInterval);
            document.getElementById('progressBar').style.width = '0%';
            audio.pause();
            isPlaying = false;
            document.getElementById('startSong').disabled = false; // Enable button after playback
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
    if (isPlaying || playCount >= maxPlaysPerRound) return; // Prevent starting another song during playback or if limit reached

    clearInterval(progressInterval);
    document.getElementById('result').innerText = '';
    if (!currentSong) {
        currentSong = getRandomSong();
        audio.src = currentSong.url;
        audio.dataset.id = currentSong.id;
    }
    document.getElementById('startSong').disabled = true; // Disable button during playback
    if (audio.src) {
        audio.load(); // Ensures the new song is loaded and metadata event is triggered
    }
    isPlaying = true;
    playCount++; // Increment play count

    // Enable button if play count is less than the max limit after playback
    if (playCount < maxPlaysPerRound) {
        setTimeout(() => {
            document.getElementById('startSong').disabled = false;
        }, 10000); // Wait for playback to finish
    }
}

function submitGuess() {
    clearInterval(progressInterval);
    audio.pause();
    isPlaying = false;

    const guessInput = document.getElementById('guess');
    const guess = guessInput.value;
    const result = document.getElementById('result');
    const song = playedSongs[playedSongs.length - 1];

    guessInput.value = ''; // Clear the guess input box

    if (guess.toLowerCase() === song.name.toLowerCase()) {
        players[currentPlayerIndex].score += 1;
        result.innerText = `Correct! The song is "${song.name}"`;
        correctSound.play();
        incorrectGuessCount = 0;
        document.getElementById('progressBar').style.width = '0%'; // Reset the progress bar
        setTimeout(() => {
            nextRound();
        }, 2000); // Move to the next round after an additional 2 seconds
    } else {
        incorrectGuessCount++;
        guessesLeft--; // Decrement guesses left
        document.getElementById('guessesLeft').innerText = `${guessesLeft} ${guessesLeft === 1 ? 'Guess' : 'Guesses'} Left`;
        incorrectSound.play();
        if (incorrectGuessCount >= 3) {
            incorrectGuessCount = 0;
            setTimeout(() => {
                nextRound();
            }, 2000); // Move to the next round after an additional 2 seconds
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
                        const progress = ((currentTime - randomStartTime) / 10) * 100;
                        document.getElementById('progressBar').style.width = `${progress}%`;

                        if (currentTime >= randomStartTime + 10) {
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
                }).catch(error => {
                    console.error('Failed to start playback:', error);
                });
            }, 2000);
        }
    }

    document.getElementById('startSong').disabled = true; // Disable button for 4 seconds
    setTimeout(() => {
        document.getElementById('startSong').disabled = false;
    }, 2000);

    updateScoreboard();
}


function nextRound() {
    document.getElementById('result').innerText = "Next Round! Play the song once you are ready!";
    currentSong = null; // Reset current song for the next round
    guessesLeft = 3;
    document.getElementById('guessesLeft').innerText = `${guessesLeft} Guesses Left`;
    playCount = 0; // Reset play count for the next round
    if (currentRound >= maxRounds) {
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('roundInfo').style.display = 'none';
        document.getElementById('songControls').style.display = 'none';
        setTimeout(() => {
            gameOverSound.play();
        }, 1000); // Delay before playing the game over sound
        saveScoreboard(); // Save the scoreboard only when the game is over
    } else {
        currentRound++;
        if (availableSongs.length === 0) {
            availableSongs = [...songs];
            playedSongs = [];
        }
        document.getElementById('roundInfo').innerText = `Round ${currentRound}`;
        document.getElementById('startSong').style.display = 'block';
        document.getElementById('startSong').disabled = false; // Enable button for the next round
    }
    document.getElementById('progressBar').style.width = '0%'; // Reset the progress bar for the next round
}


function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '<h2>Scoreboard</h2>';
    players.forEach(player => {
        const playerScore = document.createElement('div');
        playerScore.innerText = `${player.name}: ${player.score}`;
        scoreboard.appendChild(playerScore);
    });
}

document.getElementById('startGame').onclick = startGame;
document.getElementById('startSong').onclick = startSong;
document.getElementById('submitGuess').onclick = submitGuess;
document.getElementById('resetScoreboard').onclick = resetScoreboard;