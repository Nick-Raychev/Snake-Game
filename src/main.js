import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

// Game's core settings
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SNAKE_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;
const SNAKE_MOVE_INTERVAL_MS = 150;
const APPLES_FOR_LEVEL_2 = 5;
const OBSTACLE_SIZE_MULTIPLIER = 3;

// Game states
const GAME_STATE = {
    LANDING: 'LANDING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
};
let currentGameState = GAME_STATE.LANDING;

// Game elements
let app;
let snake = [];
let apple;
let obstacle;

// Movement and score
let direction = 'right';
let lastDirection = 'right';
let score = 0;
let applesEaten = 0;
let level = 1;
let lastMoveTime = 0;

// PIXI containers for different screens and UI
let landingScreenContainer;
let gameContainer;
let uiContainer;
let gameOverContainer;

// UI text elements
let scoreText;
let pauseButton;

// The game starts here
async function initializePixiAndGame() {
    app = new PIXI.Application();

    await app.init({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: 0x1a1a1a,
        antialias: true,
    });

    document.body.appendChild(app.view);

    landingScreenContainer = new PIXI.Container();
    gameContainer = new PIXI.Container();
    uiContainer = new PIXI.Container();
    gameOverContainer = new PIXI.Container();

    app.stage.addChild(landingScreenContainer);
    app.stage.addChild(gameContainer);
    app.stage.addChild(uiContainer);
    app.stage.addChild(gameOverContainer);

    gameContainer.visible = false;
    uiContainer.visible = false;
    gameOverContainer.visible = false;

    showLandingScreen();
    setupKeyboardInput();
}

// Kick off the game
initializePixiAndGame();

// --- Screen and UI Management ---

function showLandingScreen() {
    currentGameState = GAME_STATE.LANDING;
    landingScreenContainer.removeChildren();
    landingScreenContainer.visible = true;
    gameContainer.visible = false;
    uiContainer.visible = false;
    gameOverContainer.visible = false;

    const title = new PIXI.Text('Snake Game', { fontSize: 64, fill: 0xffffff, fontWeight: 'bold' });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = GAME_HEIGHT / 4;
    landingScreenContainer.addChild(title);

    const leaderboardTitle = new PIXI.Text('Leaderboard:', { fontSize: 32, fill: 0xcccccc });
    leaderboardTitle.anchor.set(0.5);
    leaderboardTitle.x = GAME_WIDTH / 2;
    leaderboardTitle.y = GAME_HEIGHT / 2 - 50;
    landingScreenContainer.addChild(leaderboardTitle);

    const dummyScores = [
        { name: 'Player A', score: 150 },
        { name: 'Player B', score: 120 },
        { name: 'Player C', score: 90 },
    ];
    dummyScores.forEach((entry, index) => {
        const scoreText = new PIXI.Text(`${entry.name}: ${entry.score}`, { fontSize: 24, fill: 0xeeeeee });
        scoreText.anchor.set(0.5);
        scoreText.x = GAME_WIDTH / 2;
        scoreText.y = leaderboardTitle.y + 40 + (index * 30);
        landingScreenContainer.addChild(scoreText);
    });

    const startButton = new PIXI.Text('Start Game', { fontSize: 48, fill: 0x00ff00, fontWeight: 'bold' });
    startButton.anchor.set(0.5);
    startButton.x = GAME_WIDTH / 2;
    startButton.y = GAME_HEIGHT - 100;
    startButton.interactive = true;
    startButton.buttonMode = true;
    startButton.on('pointerdown', startGame);
    landingScreenContainer.addChild(startButton);

    gsap.from(landingScreenContainer, { alpha: 0, duration: 0.8, ease: "power2.out" });
}

function startGame() {
    currentGameState = GAME_STATE.PLAYING;
    landingScreenContainer.visible = false;
    gameContainer.visible = true;
    uiContainer.visible = true;
    gameOverContainer.visible = false;

    score = 0;
    applesEaten = 0;
    level = 1;
    direction = 'right';
    lastDirection = 'right';
    lastMoveTime = performance.now();

    gameContainer.removeChildren();
    uiContainer.removeChildren();
    if (obstacle) {
        obstacle.destroy();
        obstacle = null;
    }

    createSnake();
    createApple();
    createUI();

    app.ticker.add(gameTick);
}

function createUI() {
    scoreText = new PIXI.Text(`Score: ${score}`, { fontSize: 28, fill: 0xffffff, fontWeight: 'bold' });
    scoreText.x = 20;
    scoreText.y = 20;
    uiContainer.addChild(scoreText);

    pauseButton = new PIXI.Text('Pause', { fontSize: 28, fill: 0xffff00, fontWeight: 'bold' });
    pauseButton.anchor.set(1, 0);
    pauseButton.x = GAME_WIDTH - 20;
    pauseButton.y = 20;
    pauseButton.interactive = true;
    pauseButton.buttonMode = true;
    pauseButton.on('pointerdown', togglePause);
    uiContainer.addChild(pauseButton);
}

function updateScoreText() {
    scoreText.text = `Score: ${score}`;
}

function togglePause() {
    if (currentGameState === GAME_STATE.PLAYING) {
        currentGameState = GAME_STATE.PAUSED;
        app.ticker.stop();
        pauseButton.text = 'Resume';
        gsap.to(app.view, { alpha: 0.7, duration: 0.3 });
    } else if (currentGameState === GAME_STATE.PAUSED) {
        currentGameState = GAME_STATE.PLAYING;
        app.ticker.start();
        pauseButton.text = 'Pause';
        gsap.to(app.view, { alpha: 1, duration: 0.3 });
    }
}

function endGame() {
    currentGameState = GAME_STATE.GAME_OVER;
    app.ticker.remove(gameTick);
    gsap.to(app.view, { alpha: 1, duration: 0.3 });

    gsap.to([gameContainer, uiContainer], { alpha: 0, duration: 1, onComplete: () => {
        gameContainer.visible = false;
        uiContainer.visible = false;
        gameContainer.alpha = 1;
        uiContainer.alpha = 1;
    }});

    gameOverContainer.removeChildren();
    gameOverContainer.visible = true;

    const gameOverText = new PIXI.Text('Game Over!', { fontSize: 80, fill: 0xff0000, fontWeight: 'bold' });
    gameOverText.anchor.set(0.5);
    gameOverText.x = GAME_WIDTH / 2;
    gameOverText.y = GAME_HEIGHT / 2 - 50;
    gameOverContainer.addChild(gameOverText);

    const finalScoreText = new PIXI.Text(`Final Score: ${score}`, { fontSize: 40, fill: 0xffffff });
    finalScoreText.anchor.set(0.5);
    finalScoreText.x = GAME_WIDTH / 2;
    finalScoreText.y = GAME_HEIGHT / 2 + 20;
    gameOverContainer.addChild(finalScoreText);

    const playAgainButton = new PIXI.Text('Play Again', { fontSize: 48, fill: 0x00ff00, fontWeight: 'bold' });
    playAgainButton.anchor.set(0.5);
    playAgainButton.x = GAME_WIDTH / 2;
    playAgainButton.y = GAME_HEIGHT - 100;
    playAgainButton.interactive = true;
    playAgainButton.buttonMode = true;
    playAgainButton.on('pointerdown', showLandingScreen);
    gameOverContainer.addChild(playAgainButton);

    gsap.from(gameOverContainer, { alpha: 0, duration: 0.8, ease: "power2.out" });
}

// --- Game Mechanics ---

function setupKeyboardInput() {
    window.addEventListener('keydown', (e) => {
        if (currentGameState === GAME_STATE.PLAYING) {
            switch (e.key) {
                case 'ArrowUp':
                    if (lastDirection !== 'down') direction = 'up';
                    break;
                case 'ArrowDown':
                    if (lastDirection !== 'up') direction = 'down';
                    break;
                case 'ArrowLeft':
                    if (lastDirection !== 'right') direction = 'left';
                    break;
                case 'ArrowRight':
                    if (lastDirection !== 'left') direction = 'right';
                    break;
            }
        }
    });
}

function createSnake() {
    snake = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        const segment = new PIXI.Graphics();
        segment.beginFill(0x00cc00);
        segment.drawRect(0, 0, SNAKE_SIZE, SNAKE_SIZE);
        segment.endFill();
        segment.x = (GAME_WIDTH / 2) - (i * SNAKE_SIZE);
        segment.y = Math.floor(GAME_HEIGHT / (2 * SNAKE_SIZE)) * SNAKE_SIZE;
        snake.push(segment);
        gameContainer.addChild(segment);
    }
}

function createApple() {
    if (apple) {
        gameContainer.removeChild(apple);
        apple.destroy();
    }

    apple = new PIXI.Graphics();
    apple.beginFill(0xff0000);
    apple.drawRect(0, 0, SNAKE_SIZE, SNAKE_SIZE);
    apple.endFill();

    let appleX, appleY;
    let collisionDetected = true;
    while (collisionDetected) {
        appleX = Math.floor(Math.random() * (GAME_WIDTH / SNAKE_SIZE)) * SNAKE_SIZE;
        appleY = Math.floor(Math.random() * (GAME_HEIGHT / SNAKE_SIZE)) * SNAKE_SIZE;

        collisionDetected = false;
        for (const segment of snake) {
            if (appleX === segment.x && appleY === segment.y) {
                collisionDetected = true;
                break;
            }
        }
        if (!collisionDetected && level === 2 && obstacle) {
            const obstacleBounds = obstacle.getBounds();
            if (appleX >= obstacleBounds.x && appleX < obstacleBounds.x + obstacleBounds.width &&
                appleY >= obstacleBounds.y && appleY < obstacleBounds.y + obstacleBounds.height) {
                collisionDetected = true;
            }
        }
    }

    apple.x = appleX;
    apple.y = appleY;
    gameContainer.addChild(apple);

    gsap.from(apple.scale, { x: 0, y: 0, duration: 0.3, ease: "back.out(2)" });
}

function createObstacle() {
    if (obstacle) {
        gameContainer.removeChild(obstacle);
        obstacle.destroy();
    }

    obstacle = new PIXI.Graphics();
    obstacle.beginFill(0x888888);
    const obsWidth = SNAKE_SIZE * OBSTACLE_SIZE_MULTIPLIER;
    const obsHeight = SNAKE_SIZE * OBSTACLE_SIZE_MULTIPLIER;
    obstacle.drawRect(0, 0, obsWidth, obsHeight);
    obstacle.endFill();

    obstacle.x = Math.floor((GAME_WIDTH / 2 - obsWidth / 2) / SNAKE_SIZE) * SNAKE_SIZE;
    obstacle.y = Math.floor((GAME_HEIGHT / 2 - obsHeight / 2) / SNAKE_SIZE) * SNAKE_SIZE;
    gameContainer.addChild(obstacle);

    gsap.from(obstacle.scale, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
}

function growSnake() {
    const tail = snake[snake.length - 1];
    const newSegment = new PIXI.Graphics();
    newSegment.beginFill(0x00e600);
    newSegment.drawRect(0, 0, SNAKE_SIZE, SNAKE_SIZE);
    newSegment.endFill();
    newSegment.x = tail.x;
    newSegment.y = tail.y;
    snake.push(newSegment);
    gameContainer.addChild(newSegment);
}

function gameTick(delta) {
    const currentTime = performance.now();
    const elapsed = currentTime - lastMoveTime;

    if (elapsed < SNAKE_MOVE_INTERVAL_MS) {
        return;
    }

    lastMoveTime = currentTime;

    const head = snake[0];


    lastDirection = direction;

    let newHeadX = head.x;
    let newHeadY = head.y;

    switch (direction) {
        case 'up':
            newHeadY -= SNAKE_SIZE;
            break;
        case 'down':
            newHeadY += SNAKE_SIZE;
            break;
        case 'left':
            newHeadX -= SNAKE_SIZE;
            break;
        case 'right':
            newHeadX += SNAKE_SIZE;
            break;
    }

    // Collision Detection
    if (newHeadX < 0 || newHeadX >= GAME_WIDTH || newHeadY < 0 || newHeadY >= GAME_HEIGHT) {
        endGame();
        return;
    }

    for (let i = 1; i < snake.length; i++) {
        if (newHeadX === snake[i].x && newHeadY === snake[i].y) {
            endGame();
            return;
        }
    }

    if (level === 2 && obstacle) {
        const obstacleBounds = obstacle.getBounds();
        if (newHeadX < obstacleBounds.x + obstacleBounds.width &&
            newHeadX + SNAKE_SIZE > obstacleBounds.x &&
            newHeadY < obstacleBounds.y + obstacleBounds.height &&
            newHeadY + SNAKE_SIZE > obstacleBounds.y) {
            endGame();
            return;
        }
    }

    // Move snake segments
    for (let i = snake.length - 1; i > 0; i--) {
        snake[i].x = snake[i - 1].x;
        snake[i].y = snake[i - 1].y;
    }

    head.x = newHeadX;
    head.y = newHeadY;

    // Check for apple consumption
    if (head.x === apple.x && head.y === apple.y) {
        score += 10;
        applesEaten++;
        updateScoreText();
        growSnake();
        createApple();

        gsap.fromTo(apple.scale,
            { x: 1, y: 1 },
            { x: 1.2, y: 1.2, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.out" }
        );

        if (applesEaten >= APPLES_FOR_LEVEL_2 && level === 1) {
            level = 2;
            createObstacle();
            const levelUpText = new PIXI.Text('Level 2!', { fontSize: 80, fill: 0xffff00, fontWeight: 'bold' });
            levelUpText.anchor.set(0.5);
            levelUpText.x = GAME_WIDTH / 2;
            levelUpText.y = GAME_HEIGHT / 2;
            levelUpText.alpha = 0;
            app.stage.addChild(levelUpText);
            gsap.to(levelUpText, { alpha: 1, duration: 0.5, onComplete: () => {
                gsap.to(levelUpText, { alpha: 0, delay: 1, duration: 0.5, onComplete: () => levelUpText.destroy() });
            }});
        }
    }
}