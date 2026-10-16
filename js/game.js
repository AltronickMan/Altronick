/**
 * Arcane Strike: WebAR Spirit Hunter - Game State Management & UI Controller
 * Manages 60s countdown timer, score progression, combo streaks, accuracy calculations,
 * HUD binding, reticle target lock-on, and game-over transitions.
 */

class GameState {
  constructor() {
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('arcanestrike_highscore') || '0', 10);
    this.timeRemaining = 60;
    this.shotsFired = 0;
    this.hitsScored = 0;
    this.spiritsBanished = 0;
    this.combo = 1;
    this.comboTimer = null;
    this.isGameActive = false;
    this.isGameOver = false;
    this.timerInterval = null;

    // UI Cache
    this.ui = {
      score: document.getElementById('scoreDisplay'),
      timer: document.getElementById('timerDisplay'),
      timerFill: document.getElementById('timerFill'),
      comboContainer: document.getElementById('comboContainer'),
      comboText: document.getElementById('comboText'),
      accuracyText: document.getElementById('accuracyText'),
      reticle: document.getElementById('arcaneReticle'),
      instructionsModal: document.getElementById('instructionsModal'),
      gameOverModal: document.getElementById('gameOverModal'),
      finalScore: document.getElementById('finalScore'),
      finalAccuracy: document.getElementById('finalAccuracy'),
      finalSpirits: document.getElementById('finalSpirits'),
      finalRank: document.getElementById('finalRank'),
      highScoreDisplay: document.getElementById('highScoreDisplay'),
      castButton: document.getElementById('castBtn'),
      muteButton: document.getElementById('muteBtn'),
      startButton: document.getElementById('startHuntBtn'),
      playAgainButton: document.getElementById('playAgainBtn')
    };

    this.initEvents();
  }

  initEvents() {
    // Start Hunt button
    if (this.ui.startButton) {
      this.ui.startButton.addEventListener('click', () => this.startGame());
    }

    // Play Again button
    if (this.ui.playAgainButton) {
      this.ui.playAgainButton.addEventListener('click', () => this.restartGame());
    }

    // Cast Button
    if (this.ui.castButton) {
      const handleCast = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('arcanecast', { detail: { source: 'hud-button' } }));
      };
      this.ui.castButton.addEventListener('click', handleCast);
      this.ui.castButton.addEventListener('touchstart', handleCast, { passive: false });
    }

    // Mute Button
    if (this.ui.muteButton) {
      this.ui.muteButton.addEventListener('click', () => {
        if (window.soundEngine) {
          const muted = window.soundEngine.toggleMute();
          this.ui.muteButton.textContent = muted ? '🔇' : '🔊';
        }
      });
    }

    // Spacebar to cast for desktop debugging
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.isGameActive && !this.isGameOver) {
        window.dispatchEvent(new CustomEvent('arcanecast', { detail: { source: 'keyboard' } }));
      }
    });

    // Listen for gameplay events from scene
    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('spell-fired', () => this.onSpellFired());
      scene.addEventListener('spirit-hit', (e) => this.onSpiritHit(e.detail));
      scene.addEventListener('projectile-missed', () => this.onProjectileMissed());
    }

    // Reticle Lock-On Update Loop
    setInterval(() => this.updateReticleLockOn(), 100);
  }

  startGame() {
    this.isGameActive = true;
    this.isGameOver = false;
    this.score = 0;
    this.timeRemaining = 60;
    this.shotsFired = 0;
    this.hitsScored = 0;
    this.spiritsBanished = 0;
    this.combo = 1;

    // Unlock Web Audio context
    if (window.soundEngine) {
      window.soundEngine.init();
    }

    // Hide instructions
    if (this.ui.instructionsModal) {
      this.ui.instructionsModal.classList.add('hidden');
    }
    if (this.ui.gameOverModal) {
      this.ui.gameOverModal.classList.add('hidden');
    }

    // Trigger start event for AR sensors
    window.dispatchEvent(new CustomEvent('startgame'));

    this.updateHUD();
    this.startCountdown();
  }

  startCountdown() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isGameActive || this.isGameOver) return;

      this.timeRemaining -= 1;
      this.updateTimerUI();

      if (this.timeRemaining <= 0) {
        this.triggerGameOver();
      }
    }, 1000);
  }

  updateTimerUI() {
    if (this.ui.timer) {
      this.ui.timer.textContent = `${this.timeRemaining}s`;

      // Critical time warning pulse (<10s)
      if (this.timeRemaining <= 10) {
        this.ui.timer.classList.add('timer-critical');
      } else {
        this.ui.timer.classList.remove('timer-critical');
      }
    }

    if (this.ui.timerFill) {
      const pct = (this.timeRemaining / 60) * 100;
      this.ui.timerFill.style.width = `${pct}%`;
    }
  }

  onSpellFired() {
    if (!this.isGameActive || this.isGameOver) return;
    this.shotsFired += 1;
    this.updateAccuracyUI();
  }

  onSpiritHit(detail) {
    if (!this.isGameActive || this.isGameOver) return;

    this.hitsScored += 1;
    this.spiritsBanished += 1;

    // Combo streak calculation
    const basePoints = detail.points || 100;
    const gainedPoints = basePoints * this.combo;
    this.score += gainedPoints;

    // Show floating score indicator
    this.spawnFloatingScore(`+${gainedPoints}`, this.combo > 1);

    // Increase combo
    this.combo += 1;
    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.combo = 1;
      this.updateComboUI();
    }, 3200);

    this.updateHUD();
  }

  onProjectileMissed() {
    this.updateAccuracyUI();
  }

  updateAccuracyUI() {
    if (!this.ui.accuracyText) return;
    const accuracy = this.shotsFired > 0 ? Math.round((this.hitsScored / this.shotsFired) * 100) : 100;
    this.ui.accuracyText.textContent = `${accuracy}%`;
  }

  updateComboUI() {
    if (!this.ui.comboContainer || !this.ui.comboText) return;
    if (this.combo > 1) {
      this.ui.comboText.textContent = `COMBO x${this.combo}!`;
      this.ui.comboContainer.classList.add('active');
    } else {
      this.ui.comboContainer.classList.remove('active');
    }
  }

  spawnFloatingScore(text, isCrit = false) {
    const floatEl = document.createElement('div');
    floatEl.className = `floating-score ${isCrit ? 'crit' : ''}`;
    floatEl.textContent = text;
    document.body.appendChild(floatEl);

    setTimeout(() => {
      if (floatEl.parentNode) {
        floatEl.parentNode.removeChild(floatEl);
      }
    }, 1200);
  }

  updateHUD() {
    if (this.ui.score) {
      this.ui.score.textContent = this.score.toString().padStart(4, '0');
      this.ui.score.classList.add('score-punch');
      setTimeout(() => this.ui.score.classList.remove('score-punch'), 180);
    }
    this.updateAccuracyUI();
    this.updateComboUI();
  }

  // Dynamic crosshair lock-on when aiming at a spirit
  updateReticleLockOn() {
    if (!this.isGameActive || this.isGameOver || !this.ui.reticle) return;

    const scene = document.querySelector('a-scene');
    if (!scene || !scene.camera) return;

    const camera = scene.camera;
    const spirits = scene.querySelectorAll('[spirit-creature]');
    let isLocked = false;

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    for (let i = 0; i < spirits.length; i++) {
      const spirit = spirits[i];
      const comp = spirit.components['spirit-creature'];
      if (!comp || comp.state !== 'ALIVE') continue;

      const spiritPos = new THREE.Vector3();
      spirit.object3D.getWorldPosition(spiritPos);

      const toSpirit = spiritPos.clone().sub(camPos).normalize();
      const dot = forward.dot(toSpirit);

      // Within ~18 degrees of crosshair center
      if (dot > 0.95) {
        isLocked = true;
        break;
      }
    }

    if (isLocked) {
      this.ui.reticle.classList.add('reticle-locked');
    } else {
      this.ui.reticle.classList.remove('reticle-locked');
    }
  }

  triggerGameOver() {
    this.isGameActive = false;
    this.isGameOver = true;
    clearInterval(this.timerInterval);

    // High Score check
    const isNewHighScore = this.score > this.highScore;
    if (isNewHighScore) {
      this.highScore = this.score;
      localStorage.setItem('arcanestrike_highscore', this.highScore.toString());
    }

    // Accuracy
    const finalAcc = this.shotsFired > 0 ? Math.round((this.hitsScored / this.shotsFired) * 100) : 0;

    // Rank evaluation
    let rank = 'B-RANK APPRENTICE';
    if (this.score >= 1800 && finalAcc >= 75) {
      rank = 'S-RANK ARCHMAGE';
    } else if (this.score >= 1000) {
      rank = 'A-RANK SORCERER';
    }

    // Update modal
    if (this.ui.finalScore) this.ui.finalScore.textContent = this.score;
    if (this.ui.finalAccuracy) this.ui.finalAccuracy.textContent = `${finalAcc}%`;
    if (this.ui.finalSpirits) this.ui.finalSpirits.textContent = this.spiritsBanished;
    if (this.ui.finalRank) this.ui.finalRank.textContent = rank;
    if (this.ui.highScoreDisplay) this.ui.highScoreDisplay.textContent = this.highScore;

    // Show modal
    if (this.ui.gameOverModal) {
      this.ui.gameOverModal.classList.remove('hidden');
    }

    // Play fanfare
    if (window.soundEngine) {
      window.soundEngine.playGameOverSound(isNewHighScore);
    }
  }

  restartGame() {
    // Reset all spirits
    const spirits = document.querySelectorAll('[spirit-creature]');
    spirits.forEach((spirit) => {
      const comp = spirit.components['spirit-creature'];
      if (comp) {
        comp.spawnAtRandomLocation(true);
      }
    });

    // Remove any leftover active projectiles
    const activeProjectiles = document.querySelectorAll('[mana-projectile]');
    activeProjectiles.forEach((p) => p.parentNode && p.parentNode.removeChild(p));

    this.startGame();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameState = new GameState();
});
