// game-config.js
export const gameConfig = {
    numberOfRounds: 16,
    sections: [
        { rounds: 4, difficulty: 'Easy', duration: 8 },
        { rounds: 4, difficulty: 'Medium', duration: 4 },
        { rounds: 4, difficulty: 'Medium', duration: 2 },
        { rounds: 4, difficulty: 'Hard', duration: 1 }
    ],
    enableHints: true // true for on and false for off to turn Hints ON or OFF
};
