export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        // Background
        this.cameras.main.setBackgroundColor(0x87CEEB);
        this.add.image(512, 384, 'background').setAlpha(0.5);

        // Background sign
        const signBg = this.add.rectangle(512, 100, 400, 100, 0x8B4513);
        signBg.setStrokeStyle(6, 0x654321);
        signBg.setAlpha(0.8);

        const signText = this.add.text(512, 100, 'Flappy Fetch', {
            fontSize: '56px',
            fill: '#FFD700',
            fontFamily: 'Arial Black',
            stroke: '#8B4513',
            strokeThickness: 6,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000',
                blur: 5,
                fill: true
            }
        }).setOrigin(0.5);
        signText.setAlpha(0.9);

        // Game variables
        this.score = 0;
        this.isGameOver = false;
        this.baseGravity = 0.25;
        this.gravity = this.baseGravity;
        this.jumpStrength = -8.5;
        this.baseSpeed = 2;
        this.speed = this.baseSpeed;

        // UI
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontSize: '32px',
            fill: '#FFF',
            stroke: '#000',
            strokeThickness: 4
        });

        this.gameOverText = this.add.text(512, 300, 'GAME OVER\nClick to Restart', {
            fontSize: '48px',
            fill: '#FFF',
            stroke: '#000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setVisible(false);

        // Create golden retriever player (more detailed dog)
        this.player = this.add.graphics();

        // Tail (wagging to the side)
        this.player.fillStyle(0xD4A017, 1);
        this.player.fillEllipse(-25, 5, 8, 18);

        // Body
        this.player.fillStyle(0xD4A017, 1); // Golden color
        this.player.fillRoundedRect(-20, -8, 35, 22, 6);

        // Back leg
        this.player.fillStyle(0xC49102, 1);
        this.player.fillRoundedRect(-15, 10, 6, 12, 3);
        this.player.fillStyle(0x8B6914, 1);
        this.player.fillCircle(-12, 22, 3); // Paw

        // Front leg
        this.player.fillStyle(0xC49102, 1);
        this.player.fillRoundedRect(8, 10, 6, 12, 3);
        this.player.fillStyle(0x8B6914, 1);
        this.player.fillCircle(11, 22, 3); // Paw

        // Head
        this.player.fillStyle(0xD4A017, 1);
        this.player.fillCircle(20, -2, 13);

        // Snout
        this.player.fillStyle(0xE6B84D, 1); // Lighter golden for snout
        this.player.fillEllipse(30, 2, 10, 8);

        // Ears (floppy)
        this.player.fillStyle(0xC49102, 1);
        this.player.fillEllipse(15, -10, 8, 14); // Left ear
        this.player.fillEllipse(25, -10, 8, 14); // Right ear

        // Eye
        this.player.fillStyle(0x000000, 1);
        this.player.fillCircle(22, -6, 3);
        this.player.fillStyle(0xFFFFFF, 1);
        this.player.fillCircle(23, -7, 1.5); // Shine

        // Nose
        this.player.fillStyle(0x000000, 1);
        this.player.fillCircle(35, 2, 3);

        // Mouth/smile
        this.player.lineStyle(1.5, 0x000000);
        this.player.beginPath();
        this.player.arc(32, 4, 4, 0, Math.PI);
        this.player.strokePath();

        this.player.x = 150;
        this.player.y = 384;
        this.player.velocityY = 0;
        this.player.setDepth(10);

        // Pipe obstacles array
        this.pipes = [];
        this.pipeTimer = 0;
        this.basePipeInterval = 3000; // Spawn pipe every 3 seconds initially
        this.pipeInterval = this.basePipeInterval;

        // Tennis balls array
        this.tennisBalls = [];
        this.ballTimer = 0;
        this.ballInterval = 4000; // Spawn tennis ball every 4 seconds

        // Ground level
        this.groundY = 720;
        this.ceilingY = 0;

        // Input
        this.input.on('pointerdown', this.jump, this);
        this.input.keyboard.on('keydown-SPACE', this.jump, this);
    }

    jump() {
        if (this.isGameOver) {
            this.restart();
        } else {
            this.player.velocityY = this.jumpStrength;
        }
    }

    createPipe() {
        // Progressive difficulty - gap gets smaller as score increases
        const baseGapSize = 280;
        const minGapSize = 200;
        const gapReduction = Math.min(this.score * 2, 80); // Max reduction of 80px
        const gapSize = Math.max(baseGapSize - gapReduction, minGapSize);

        const minHeight = 100;
        const maxHeight = 450;

        const topHeight = Phaser.Math.Between(minHeight, maxHeight);
        const bottomY = topHeight + gapSize;

        // Top pipe
        const topPipe = this.add.rectangle(1024 + 30, topHeight / 2, 60, topHeight, 0x2ECC71);
        topPipe.setStrokeStyle(3, 0x27AE60);

        // Bottom pipe
        const bottomPipe = this.add.rectangle(1024 + 30, bottomY + (this.groundY - bottomY) / 2, 60, this.groundY - bottomY, 0x2ECC71);
        bottomPipe.setStrokeStyle(3, 0x27AE60);

        this.pipes.push({
            top: topPipe,
            bottom: bottomPipe,
            scored: false
        });
    }

    createTennisBall() {
        // Try to find a Y position that won't overlap with any pipes
        let y = null;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts && y === null) {
            const testY = Phaser.Math.Between(280, 440);
            let isValid = true;

            // Check against ALL pipes currently on screen
            for (let pipe of this.pipes) {
                const topPipeBottom = pipe.top.y + pipe.top.height / 2;
                const bottomPipeTop = pipe.bottom.y - pipe.bottom.height / 2;

                // Check if this Y would be inside a pipe (with 60px safety margin)
                if (testY <= topPipeBottom + 60 || testY >= bottomPipeTop - 60) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                y = testY;
            }
            attempts++;
        }

        // Don't spawn if we couldn't find a safe spot
        if (y === null) {
            return;
        }

        // Create tennis ball using graphics
        const ball = this.add.graphics();
        ball.x = 1024 + 20;
        ball.y = y;

        // Yellow-green tennis ball
        ball.fillStyle(0xCCFF00, 1);
        ball.fillCircle(0, 0, 15);

        // White curved lines (tennis ball pattern)
        ball.lineStyle(2, 0xFFFFFF, 1);

        // Left curve
        ball.beginPath();
        ball.arc(0, 0, 10, Phaser.Math.DegToRad(120), Phaser.Math.DegToRad(240));
        ball.strokePath();

        // Right curve (mirrored)
        ball.beginPath();
        ball.arc(0, 0, 10, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60));
        ball.strokePath();

        ball.setDepth(5);
        ball.radius = 15; // For collision detection
        this.tennisBalls.push(ball);
    }

    update(time, delta) {
        if (this.isGameOver) return;

        // Apply gravity to player
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;

        // Rotate player based on velocity (like Flappy Bird)
        const angle = Phaser.Math.Clamp(this.player.velocityY * 2, -30, 90);
        this.player.setRotation(Phaser.Math.DegToRad(angle));

        // Check boundaries
        if (this.player.y > this.groundY - 22 || this.player.y < this.ceilingY + 13) {
            this.gameOver();
        }

        // Spawn pipes
        this.pipeTimer += delta;
        if (this.pipeTimer > this.pipeInterval) {
            this.createPipe();
            this.pipeTimer = 0;
        }

        // Spawn tennis balls (separately from pipes)
        this.ballTimer += delta;
        if (this.ballTimer > this.ballInterval) {
            this.createTennisBall();
            this.ballTimer = 0;
        }

        // Update and check pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];

            // Move pipes left
            pipe.top.x -= this.speed;
            pipe.bottom.x -= this.speed;

            // Check collision with pipes
            const playerBounds = {
                left: this.player.x - 25,
                right: this.player.x + 35,
                top: this.player.y - 13,
                bottom: this.player.y + 22
            };

            const topPipeBounds = {
                left: pipe.top.x - 30,
                right: pipe.top.x + 30,
                top: pipe.top.y - pipe.top.height / 2,
                bottom: pipe.top.y + pipe.top.height / 2
            };

            const bottomPipeBounds = {
                left: pipe.bottom.x - 30,
                right: pipe.bottom.x + 30,
                top: pipe.bottom.y - pipe.bottom.height / 2,
                bottom: pipe.bottom.y + pipe.bottom.height / 2
            };

            if (this.checkCollision(playerBounds, topPipeBounds) ||
                this.checkCollision(playerBounds, bottomPipeBounds)) {
                this.gameOver();
            }

            // Score point when passing pipe
            if (!pipe.scored && pipe.top.x < this.player.x) {
                pipe.scored = true;
                this.score += 1;
                this.scoreText.setText('Score: ' + this.score);

                // Progressive difficulty increase
                this.updateDifficulty();
            }

            // Remove off-screen pipes
            if (pipe.top.x < -50) {
                pipe.top.destroy();
                pipe.bottom.destroy();
                this.pipes.splice(i, 1);
            }
        }

        // Update and check tennis balls
        for (let i = this.tennisBalls.length - 1; i >= 0; i--) {
            const ball = this.tennisBalls[i];

            // Move tennis balls left
            ball.x -= this.speed;

            // Check collection
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                ball.x, ball.y
            );

            if (distance < 40) {
                // Collected!
                ball.destroy();
                this.tennisBalls.splice(i, 1);
                this.score += 5;
                this.scoreText.setText('Score: ' + this.score);
            }

            // Remove off-screen balls
            if (ball.x < -20) {
                ball.destroy();
                this.tennisBalls.splice(i, 1);
            }
        }
    }

    updateDifficulty() {
        // Gradually increase difficulty based on score
        // Speed increases by 0.05 every 5 points (max +1.0)
        const speedIncrease = Math.min(Math.floor(this.score / 5) * 0.05, 1.0);
        this.speed = this.baseSpeed + speedIncrease;

        // Gravity increases by 0.01 every 10 points (max +0.15)
        const gravityIncrease = Math.min(Math.floor(this.score / 10) * 0.01, 0.15);
        this.gravity = this.baseGravity + gravityIncrease;

        // Pipe spawn rate increases every 15 points (max -500ms)
        const intervalDecrease = Math.min(Math.floor(this.score / 15) * 100, 500);
        this.pipeInterval = Math.max(this.basePipeInterval - intervalDecrease, 2500);
    }

    checkCollision(rect1, rect2) {
        return rect1.left < rect2.right &&
               rect1.right > rect2.left &&
               rect1.top < rect2.bottom &&
               rect1.bottom > rect2.top;
    }

    gameOver() {
        if (this.isGameOver) return;

        this.isGameOver = true;
        this.gameOverText.setVisible(true);
    }

    restart() {
        this.scene.restart();
    }
}
