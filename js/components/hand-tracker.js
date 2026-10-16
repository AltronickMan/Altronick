/**
 * Arcane Strike: WebAR Spirit Hunter - Hand Tracking & Gesture Recognition
 * Handles 8th Wall Hand Tracking pipeline events, joint attachments, forward palm thrust,
 * pinch detection, and fallback virtual caster mode.
 */
AFRAME.registerComponent('hand-tracker', {
  schema: {
    spellRingId: { type: 'string', default: 'playerSpellRing' },
    thrustVelocityThreshold: { type: 'number', default: -0.65 }, // Forward movement in Z
    pinchThreshold: { type: 'number', default: 0.045 } // Meters between thumb and index
  },

  init: function () {
    this.spellRingEl = document.getElementById(this.data.spellRingId);
    this.cameraEl = this.el.sceneEl.camera.el;
    this.isHandTracked = false;
    this.lastPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.velocityHistory = [];
    this.cooldown = false;

    // Default virtual hand position (relative to camera)
    this.virtualOffset = new THREE.Vector3(0.25, -0.22, -0.65);
    this.targetPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Euler();

    // Bind event handlers
    this.onHandLoading = this.onHandLoading.bind(this);
    this.onHandFound = this.onHandFound.bind(this);
    this.onHandUpdated = this.onHandUpdated.bind(this);
    this.onHandLost = this.onHandLost.bind(this);

    this.setupListeners();
  },

  setupListeners: function () {
    // 8th Wall hand tracking global events
    window.addEventListener('xrhandloading', this.onHandLoading);
    window.addEventListener('xrhandfound', this.onHandFound);
    window.addEventListener('xrhandupdated', this.onHandUpdated);
    window.addEventListener('xrhandlost', this.onHandLost);

    // Also support custom document event forwarding for XR8 pipeline
    window.addEventListener('xr:handfound', (e) => this.onHandFound(e.detail));
    window.addEventListener('xr:handupdated', (e) => this.onHandUpdated(e.detail));
    window.addEventListener('xr:handlost', () => this.onHandLost());

    // Mouse / Touch aiming for fallback and desktop testing
    window.addEventListener('pointermove', (e) => {
      if (!this.isHandTracked) {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -(e.clientY / window.innerHeight) * 2 + 1;
        this.virtualOffset.x = 0.22 + nx * 0.12;
        this.virtualOffset.y = -0.2 + ny * 0.1;
      }
    });
  },

  onHandLoading: function () {
    const statusEl = document.getElementById('handTrackingStatus');
    if (statusEl) {
      statusEl.textContent = '✋ INITIALIZING HAND AR...';
      statusEl.className = 'status-tag status-loading';
    }
  },

  onHandFound: function (detail) {
    this.isHandTracked = true;
    const statusEl = document.getElementById('handTrackingStatus');
    if (statusEl) {
      statusEl.textContent = '✋ HAND ANCHORED';
      statusEl.className = 'status-tag status-active';
    }
    if (this.spellRingEl) {
      this.spellRingEl.setAttribute('visible', 'true');
    }
  },

  onHandUpdated: function (detail) {
    this.isHandTracked = true;
    if (!detail) return;

    // detail can come from 8th Wall xrhandupdated event
    const palm = detail.transform || detail.palm || (detail.attachmentPoints && detail.attachmentPoints.wrist);
    if (palm && palm.position) {
      this.targetPosition.set(palm.position.x, palm.position.y, palm.position.z);
    }
    if (palm && palm.rotation) {
      this.targetRotation.set(palm.rotation.x, palm.rotation.y, palm.rotation.z);
    }

    // Gesture detection: Pinch Check
    if (detail.attachmentPoints) {
      const thumb = detail.attachmentPoints.thumbTip;
      const index = detail.attachmentPoints.indexTip;
      if (thumb && index && thumb.position && index.position) {
        const d = thumb.position.distanceTo(index.position);
        if (d < this.data.pinchThreshold) {
          this.triggerGestureCast('pinch');
        }
      }
    }

    // Gesture detection: Palm Thrust Check (forward delta Z)
    if (palm && palm.position) {
      const now = performance.now();
      this.velocityHistory.push({
        z: palm.position.z,
        time: now
      });

      // Keep last 180ms
      while (this.velocityHistory.length > 0 && now - this.velocityHistory[0].time > 180) {
        this.velocityHistory.shift();
      }

      if (this.velocityHistory.length >= 2) {
        const oldest = this.velocityHistory[0];
        const latest = this.velocityHistory[this.velocityHistory.length - 1];
        const dt = (latest.time - oldest.time) / 1000;
        if (dt > 0.05) {
          const vz = (latest.z - oldest.z) / dt;
          if (vz < this.data.thrustVelocityThreshold) {
            this.triggerGestureCast('thrust');
          }
        }
      }
    }
  },

  onHandLost: function () {
    this.isHandTracked = false;
    const statusEl = document.getElementById('handTrackingStatus');
    if (statusEl) {
      statusEl.textContent = '✋ VIRTUAL SPELL RING ACTIVE';
      statusEl.className = 'status-tag status-fallback';
    }
  },

  triggerGestureCast: function (gestureType) {
    if (this.cooldown) return;
    this.cooldown = true;

    // Dispatch global cast event
    window.dispatchEvent(new CustomEvent('arcanecast', {
      detail: { source: gestureType }
    }));

    setTimeout(() => {
      this.cooldown = false;
    }, 850);
  },

  tick: function (time, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    if (!this.spellRingEl) return;

    if (this.isHandTracked) {
      // Smoothly interpolate to tracked hand position
      const currentPos = this.spellRingEl.object3D.position;
      currentPos.lerp(this.targetPosition, dt * 14);

      // Align rotation
      this.spellRingEl.object3D.rotation.copy(this.targetRotation);
    } else {
      // Fallback: Attach smoothly to camera view space (Caster perspective)
      const camera = this.el.sceneEl.camera;
      if (camera) {
        // Floating idle oscillation
        const bobX = Math.sin(time / 450) * 0.015;
        const bobY = Math.cos(time / 380) * 0.02;

        const offset = new THREE.Vector3(
          this.virtualOffset.x + bobX,
          this.virtualOffset.y + bobY,
          this.virtualOffset.z
        );

        // Convert camera local offset to world position
        offset.applyQuaternion(camera.quaternion);
        offset.add(camera.position);

        this.spellRingEl.object3D.position.lerp(offset, dt * 10);
        this.spellRingEl.object3D.quaternion.slerp(camera.quaternion, dt * 8);
      }
    }
  }
});
