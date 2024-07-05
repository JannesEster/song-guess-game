// game-config.js
export const gameConfig = {
    numberOfRounds: 20,
    sections: [
        { rounds: 2, difficulty: 'Easy', duration: 6 },
        { rounds: 4, difficulty: 'Medium', duration: 4 },
        { rounds: 6, difficulty: 'Medium', duration: 2 },
        { rounds: 8, difficulty: 'Hard', duration: 1 }
    ],
    enableHints: true, // true for on and false for off to turn Hints ON or OFF
};
