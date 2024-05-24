const songs = [
    { id: 1, name: "Turn down for what", url: "songs/Turn Down for What.m4a" },
    { id: 2, name: "Jump around", url: "songs/Jump Around.mp3" },
    { id: 3, name: "24k magic", url: "songs/24K Magic.m4a" },
    { id: 4, name: "We like to party", url: "songs/We Like to Party! (the Vengabus).m4a" },
];

let players = [];
let currentPlayerIndex = 0;
let playedSongs = [];
let availableSongs = [...songs];
let currentRound = 1;
const maxRounds = 3;

let audio;
let correctSound;
let incorrectSound;
let gameOverSound;
let progressInterval;
let incorrectGuessCount = 0;

function getRandomSong() {
    if (availableSongs.length === 0) {
        availableSongs = [...songs];
        playedSongs = [];
    }
    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    const song = availableSongs.splice(randomIndex, 1)[0];
    playedSongs.push(song);
    return song;
}

function startGame() {
    const playerNameInput = document.getElementById('playerName');
    const playerName = playerNameInput.value.trim();

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
    document.getElementById('result').innerText = "Good Luck! Press play to start the game!";

    audio = document.getElementById('song');
    correctSound = document.getElementById('correctSound');
    incorrectSound = document.getElementById('incorrectSound');
    gameOverSound = document.getElementById('gameOverSound');

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
    const randomStartTime = Math.max(0, Math.floor(Math.random() * (duration - 10)));
    let currentTime = randomStartTime;

    progressInterval = setInterval(() => {
        currentTime += 0.1;
        const progress = ((currentTime - randomStartTime) / 10) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;

        if (currentTime >= randomStartTime + 10) {
            clearInterval(progressInterval);
            document.getElementById('progressBar').style.width = '0%';
            audio.pause();
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
    clearInterval(progressInterval);
    document.getElementById('result').innerText = '';
    const song = getRandomSong();
    audio.src = song.url;
    audio.dataset.id = song.id;
    audio.load(); // Ensures the new song is loaded and metadata event is triggered
}

function submitGuess() {
    clearInterval(progressInterval);
    audio.pause();

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
        setTimeout(() => {
            nextRound();
        }, 4000); // Move to the next round after an additional 4 seconds
    } else {
        incorrectGuessCount++;
        incorrectSound.play();
        if (incorrectGuessCount >= 3) {
            incorrectGuessCount = 0;
            setTimeout(() => {
                nextRound();
            }, 4000); // Move to the next round after an additional 4 seconds
        } else {
            result.innerText = 'Incorrect! Try again.';
            setTimeout(() => {
                const duration = audio.duration;
                const randomStartTime = Math.max(0, Math.floor(Math.random() * (duration - 10)));
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
                        }
                    }, 100);
                }).catch(error => {
                    console.error('Failed to start playback:', error);
                });
            }, 3000);
        }
    }

    updateScoreboard();
}


function nextRound() {
    document.getElementById('result').innerText = "Next Round! Play the song once you are ready!";
    if (currentRound >= maxRounds) {
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('roundInfo').style.display = 'none';
        document.getElementById('songControls').style.display = 'none';
        setTimeout(() => {
            gameOverSound.play();
        }, 100); // Delay before playing the game over sound
    } else {
        currentRound++;
        document.getElementById('roundInfo').innerText = `Round ${currentRound}`;
        document.getElementById('startSong').style.display = 'block';
    }
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
