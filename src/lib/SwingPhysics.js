export class SwingPhysics {
    constructor(config = {}) {
        this.gravity = config.gravity || 0.6;
        this.webShootRange = config.webShootRange || 400;
        this.maxPullForce = config.maxPullForce || 20;
        this.pullDuration = config.pullDuration || 300;

        this.isWebAttached = false;
        this.currentAnchor = null;
        this.webLength = 0;
        this.webAngle = 0;
        this.angularVelocity = 0;
        this.isPulling = false;
        this.pullTimer = 0;
        this.targetWebLength = 0;
    }

    calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    attachWeb(player, anchor) {
        const distance = this.calculateDistance(player, anchor);

        if (distance <= this.webShootRange) {
            this.isWebAttached = true;
            this.currentAnchor = anchor;
            this.webLength = distance;
            this.targetWebLength = distance * 0.8;
            this.isPulling = true;
            this.pullTimer = 0;

            this.webAngle = Math.atan2(
                player.y - anchor.y,
                player.x - anchor.x
            );

            const initialDirection = (player.x < anchor.x) ? -1 : 1;
            this.angularVelocity = 0.05 * initialDirection;

            return this.calculateInitialVelocity(player, anchor, initialDirection);
        }

        return null;
    }

    calculateInitialVelocity(player, anchor, initialDirection) {
        const dx = anchor.x - player.x;
        const dy = anchor.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const pullStrength = 0.6;
            const basePullVelocity = Math.min(dist * 0.1, this.maxPullForce);

            // Calculate perpendicular direction for swing
            const perpX = -dy / dist;
            const perpY = dx / dist;
            const tangentStrength = 0.4 * initialDirection;

            // Combine radial and tangential forces
            return {
                x: (dx / dist) * basePullVelocity * pullStrength + perpX * 10 * tangentStrength,
                y: (dy / dist) * basePullVelocity * pullStrength + perpY * 10 * tangentStrength
            };
        }

        return { x: 0, y: 0 };
    }

    releaseWeb() {
        this.isWebAttached = false;
        this.currentAnchor = null;
        this.isPulling = false;
    }

    updateSwinging(player, normalizedDelta, delta) {
        if (!this.isWebAttached || !this.currentAnchor) return null;

        if (this.isPulling) {
            this.updatePulling(delta, normalizedDelta);
        }

        // Apply pendulum physics
        const gravity = 0.004 * normalizedDelta;
        this.angularVelocity += Math.sin(this.webAngle + Math.PI / 2) * gravity;
        this.webAngle += this.angularVelocity * normalizedDelta;
        this.angularVelocity *= 0.998;

        const newX = this.currentAnchor.x + Math.cos(this.webAngle) * this.webLength;
        const newY = this.currentAnchor.y + Math.sin(this.webAngle) * this.webLength;

        const velocityFactor = 0.9 / normalizedDelta;
        return {
            position: { x: newX, y: newY },
            velocity: {
                x: (newX - player.x) * velocityFactor,
                y: (newY - player.y) * velocityFactor
            }
        };
    }

    updateFreeFalling(player, normalizedDelta) {
        const velocity = { ...player.velocity };

        // Apply gravity
        velocity.y += this.gravity * normalizedDelta;

        // Apply air resistance
        velocity.x *= 0.99;

        return {
            x: player.x + velocity.x * normalizedDelta,
            y: player.y + velocity.y * normalizedDelta,
            velocity
        };
    }

    updatePulling(delta, normalizedDelta) {
        this.pullTimer += delta;
        const progress = Math.min(this.pullTimer / this.pullDuration, 1);

        // Gradually shorten web
        this.webLength = this.lerp(
            this.webLength,
            this.targetWebLength,
            progress * 0.25 * normalizedDelta
        );

        if (this.pullTimer >= this.pullDuration) {
            this.isPulling = false;
        }

        // Increase angular velocity during pull
        this.angularVelocity *= 1.03;
    }

    lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    getDebugInfo() {
        if (this.isWebAttached) {
            return {
                webLength: Math.round(this.webLength),
                angularVelocity: this.angularVelocity.toFixed(4)
            };
        } else {
            return {
                velocityX: 0,
                velocityY: 0
            };
        }
    }
}
