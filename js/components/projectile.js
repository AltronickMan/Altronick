/**
 * Arcane Strike: WebAR Spirit Hunter - Projectile Physics & Particle Collision System
 * Spawns kinetic mana orbs with forward velocity, trajectory calculation,
 * bounding-sphere collision detection, impact shockwaves, and particle bursts.
 */

// Kinetic Mana Projectile Component
AFRAME.registerComponent('mana-projectile', {
  schema: {
    speed: { type: 'number', default: 18.0 }, // meters per second
    lifetime: { type: 'number', default: 2.5 }, // seconds
    radius: { type: 'number', default: 0.18 },
    color: { type: 'color', default: '#00f0ff' }
  },

  init: function () {
    this.velocity = new THREE.Vector3();
    this.age = 0;
    this.alive = true;

    // Build 3D glowing mana orb
    this.orbGroup = new THREE.Group();
    this.el.setObject3D('manaOrbMesh', this.orbGroup);

    // Inner bright core
    const coreGeo = new THREE.SphereGeometry(this.data.radius * 0.7, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.orbGroup.add(this.coreMesh);

    // Outer plasma aura
    const auraGeo = new THREE.SphereGeometry(this.data.radius, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.data.color),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.auraMesh = new THREE.Mesh(auraGeo, auraMat);
    this.orbGroup.add(this.auraMesh);

    // Dynamic energy ring trailing behind
    const ringGeo = new THREE.TorusGeometry(this.data.radius * 1.1, 0.012, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.energyRing = new THREE.Mesh(ringGeo, ringMat);
    this.orbGroup.add(this.energyRing);
  },

  setTrajectory: function (startPos, forwardDir) {
    this.el.object3D.position.copy(startPos);
    this.velocity.copy(forwardDir).normalize().multiplyScalar(this.data.speed);

    // Orient projectile along velocity vector
    this.el.object3D.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forwardDir.clone().normalize());
  },

  explode: function (hitPoint, spiritEl) {
    if (!this.alive) return;
    this.alive = false;

    // Spawn impact explosion burst at hit point
    const scene = this.el.sceneEl;
    const burstEl = document.createElement('a-entity');
    burstEl.setAttribute('position', `${hitPoint.x} ${hitPoint.y} ${hitPoint.z}`);
    burstEl.setAttribute('impact-burst', '');
    scene.appendChild(burstEl);

    // Notify spirit component
    if (spiritEl && spiritEl.components['spirit-creature']) {
      spiritEl.components['spirit-creature'].onHit(hitPoint);
    }

    // Despawn projectile entity
    this.el.parentNode.removeChild(this.el);
  },

  checkCollisions: function () {
    const projPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(projPos);

    // Query all spirit entities in the scene
    const spirits = this.el.sceneEl.querySelectorAll('[spirit-creature]');
    for (let i = 0; i < spirits.length; i++) {
      const spiritEl = spirits[i];
      const spiritComp = spiritEl.components['spirit-creature'];
      if (!spiritComp || spiritComp.state !== 'ALIVE') continue;

      const spiritPos = new THREE.Vector3();
      spiritEl.object3D.getWorldPosition(spiritPos);

      // Distance-based bounding sphere collision
      const distance = projPos.distanceTo(spiritPos);
      const collisionRadius = this.data.radius + spiritComp.data.radius;

      if (distance <= collisionRadius) {
        this.explode(projPos, spiritEl);
        return true;
      }
    }
    return false;
  },

  tick: function (time, delta) {
    if (!this.alive) return;
    const dt = Math.min(delta / 1000, 0.1);
    this.age += dt;

    // Check timeout
    if (this.age >= this.data.lifetime) {
      this.alive = false;
      this.el.sceneEl.emit('projectile-missed');
      this.el.parentNode.removeChild(this.el);
      return;
    }

    // Move projectile forward along velocity
    const displacement = this.velocity.clone().multiplyScalar(dt);
    this.el.object3D.position.add(displacement);

    // Rotate visual energy rings
    if (this.energyRing) {
      this.energyRing.rotation.z += dt * 15;
    }
    if (this.auraMesh) {
      const pulse = 1.0 + Math.sin(this.age * 24) * 0.15;
      this.auraMesh.scale.set(pulse, pulse, pulse);
    }

    // Run collision detection
    this.checkCollisions();
  }
});

// Impact Explosion / Particle Shockwave Component
AFRAME.registerComponent('impact-burst', {
  schema: {
    duration: { type: 'number', default: 0.45 },
    particleCount: { type: 'number', default: 18 }
  },

  init: function () {
    this.age = 0;
    this.burstGroup = new THREE.Group();
    this.el.setObject3D('burstMesh', this.burstGroup);

    // 1. Expanding shockwave ring
    const ringGeo = new THREE.RingGeometry(0.05, 0.12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this.shockwaveRing = new THREE.Mesh(ringGeo, ringMat);
    this.burstGroup.add(this.shockwaveRing);

    // 2. High-speed spark particles
    this.particles = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.04, 0);

    for (let i = 0; i < this.data.particleCount; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: (i % 2 === 0) ? 0x00f0ff : 0xff00aa,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
      });
      const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);

      // Random isotropic velocity direction
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = 1.8 + Math.random() * 2.8;

      const vel = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * speed,
        Math.sin(theta) * Math.sin(phi) * speed,
        Math.cos(theta) * speed
      );

      this.burstGroup.add(sparkMesh);
      this.particles.push({ mesh: sparkMesh, vel: vel });
    }

    // Orient shockwave towards viewer camera
    const camera = this.el.sceneEl.camera;
    if (camera) {
      this.shockwaveRing.quaternion.copy(camera.quaternion);
    }
  },

  tick: function (time, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    this.age += dt;
    const progress = this.age / this.data.duration;

    if (progress >= 1.0) {
      this.el.parentNode.removeChild(this.el);
      return;
    }

    const fade = 1.0 - progress;

    // Expand shockwave ring
    const ringScale = 0.5 + progress * 5.0;
    this.shockwaveRing.scale.set(ringScale, ringScale, 1);
    this.shockwaveRing.material.opacity = fade;

    // Update spark particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(fade * 0.9);
      p.mesh.material.opacity = fade;
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 10;
    }
  }
});

// Arcane Caster Controller - Coordinates hand tracking, gestures, and spell firing
AFRAME.registerComponent('caster-controller', {
  schema: {
    cooldownDuration: { type: 'number', default: 0.85 } // Seconds between casts
  },

  init: function () {
    this.onCooldown = false;
    this.cooldownTimer = 0;
    this.spellRingEl = document.getElementById('playerSpellRing');
    this.cameraEl = this.el.sceneEl.camera.el;

    // Listen for cast events (from gesture thrust, pinch, or UI button)
    window.addEventListener('arcanecast', this.castSpell.bind(this));
  },

  castSpell: function (e) {
    if (this.onCooldown) return;

    // Check if game is in active state
    if (window.gameState && window.gameState.isGameOver) return;

    this.onCooldown = true;
    this.cooldownTimer = this.data.cooldownDuration;

    // 1. Play synthesized Web Audio cast SFX
    if (window.soundEngine) {
      window.soundEngine.playCastSound();
    }

    // 2. Trigger Arcane Spell Ring pulse animation
    if (this.spellRingEl && this.spellRingEl.components['arcane-spell-ring']) {
      this.spellRingEl.components['arcane-spell-ring'].pulseCast();
    }

    // 3. Determine spawn point and trajectory
    const spawnPos = new THREE.Vector3();
    if (this.spellRingEl) {
      this.spellRingEl.object3D.getWorldPosition(spawnPos);
    } else {
      this.cameraEl.object3D.getWorldPosition(spawnPos);
      spawnPos.y -= 0.15;
    }

    // Forward direction: from camera through center of screen
    const forwardDir = new THREE.Vector3();
    const camera = this.el.sceneEl.camera;
    camera.getWorldDirection(forwardDir);

    // Calculate aim target point ahead along camera gaze
    const aimTarget = new THREE.Vector3();
    camera.getWorldPosition(aimTarget);
    aimTarget.addScaledVector(forwardDir, 12.0); // 12m forward target point

    // Direction vector from hand spawn point towards the aim target
    const trajectory = aimTarget.sub(spawnPos).normalize();

    // 4. Instantiate Mana Projectile
    const scene = this.el.sceneEl;
    const projEl = document.createElement('a-entity');
    projEl.setAttribute('mana-projectile', '');
    scene.appendChild(projEl);

    // Initialize trajectory on component
    projEl.addEventListener('loaded', () => {
      projEl.components['mana-projectile'].setTrajectory(spawnPos, trajectory);
    });

    // 5. Fire game state event for shot tracking
    this.el.sceneEl.emit('spell-fired', { source: (e && e.detail && e.detail.source) || 'button' });

    // 6. Update HUD cooldown bar
    const cooldownBar = document.getElementById('cooldownFill');
    if (cooldownBar) {
      cooldownBar.style.width = '0%';
      cooldownBar.classList.add('charging');
    }
  },

  tick: function (time, delta) {
    const dt = Math.min(delta / 1000, 0.1);

    if (this.onCooldown) {
      this.cooldownTimer -= dt;
      const progress = Math.max(0, 1.0 - (this.cooldownTimer / this.data.cooldownDuration));

      const cooldownBar = document.getElementById('cooldownFill');
      if (cooldownBar) {
        cooldownBar.style.width = `${progress * 100}%`;
      }

      if (this.cooldownTimer <= 0) {
        this.onCooldown = false;
        if (cooldownBar) {
          cooldownBar.style.width = '100%';
          cooldownBar.classList.remove('charging');
        }
        if (window.soundEngine) {
          window.soundEngine.playReadyChime();
        }
      }
    }
  }
});
