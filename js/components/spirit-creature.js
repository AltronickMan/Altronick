/**
 * Arcane Strike: WebAR Spirit Hunter - Elemental Spirit AI Component
 * Procedural low-poly floating fantasy spirits with organic hovering,
 * circular wandering AI, hit reactions, and respawning lifecycle.
 */
AFRAME.registerComponent('spirit-creature', {
  schema: {
    type: { type: 'string', default: 'pyro' }, // pyro, cryo, void
    radius: { type: 'number', default: 0.38 },
    boundsRadius: { type: 'number', default: 4.5 },
    minHeight: { type: 'number', default: 0.9 },
    maxHeight: { type: 'number', default: 2.2 }
  },

  init: function () {
    this.spiritGroup = new THREE.Group();
    this.el.setObject3D('spiritMesh', this.spiritGroup);

    this.state = 'ALIVE'; // ALIVE, HIT_REACTION, DESPAWNING, DEAD, SPAWNING
    this.time = Math.random() * 100;
    this.bobSpeed = 1.8 + Math.random() * 0.8;
    this.bobAmp = 0.12 + Math.random() * 0.08;
    this.orbitRadius = 0.8 + Math.random() * 1.4;
    this.orbitSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.3);
    this.orbitAngle = Math.random() * Math.PI * 2;

    this.anchorPosition = new THREE.Vector3();
    this.spinVelocity = new THREE.Vector3(0, 0, 0);
    this.flashTimer = 0;

    // Build procedural 3D model according to elemental type
    this.buildElementalMesh();

    // Spawn at initial randomized location
    this.spawnAtRandomLocation(true);
  },

  buildElementalMesh: function () {
    const type = this.data.type;
    let primaryColor, secondaryColor, emissiveColor;

    if (type === 'pyro') {
      primaryColor = 0xff2244;
      secondaryColor = 0xffaa00;
      emissiveColor = 0xff3300;
    } else if (type === 'cryo') {
      primaryColor = 0x00d9ff;
      secondaryColor = 0xe0ffff;
      emissiveColor = 0x0088cc;
    } else {
      // void / volt
      primaryColor = 0x9d4edd;
      secondaryColor = 0xf72585;
      emissiveColor = 0x5a189a;
    }

    // Material with flat shading for striking low-poly fantasy aesthetic
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.35,
      flatShading: true
    });

    this.glowMat = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    // Core Geometry
    let coreGeo;
    if (type === 'pyro') {
      coreGeo = new THREE.IcosahedronGeometry(this.data.radius, 0); // 20 faces
    } else if (type === 'cryo') {
      coreGeo = new THREE.OctahedronGeometry(this.data.radius, 0); // 8 crystal faces
    } else {
      coreGeo = new THREE.DodecahedronGeometry(this.data.radius, 0); // 12 mystical faces
    }

    this.coreMesh = new THREE.Mesh(coreGeo, this.bodyMat);
    this.spiritGroup.add(this.coreMesh);

    // Glowing Wireframe Aura Core
    const wireGeo = coreGeo.clone();
    this.wireMesh = new THREE.Mesh(wireGeo, this.glowMat);
    this.wireMesh.scale.set(1.14, 1.14, 1.14);
    this.spiritGroup.add(this.wireMesh);

    // Orbiting Elemental Shards / Halo Rings
    this.orbitalGroup = new THREE.Group();
    const shardCount = type === 'cryo' ? 4 : 3;
    const shardGeo = new THREE.ConeGeometry(this.data.radius * 0.16, this.data.radius * 0.6, 4);

    for (let i = 0; i < shardCount; i++) {
      const shardMesh = new THREE.Mesh(shardGeo, this.bodyMat);
      const angle = (i / shardCount) * Math.PI * 2;
      shardMesh.position.set(
        Math.cos(angle) * (this.data.radius * 1.55),
        (Math.random() - 0.5) * 0.15,
        Math.sin(angle) * (this.data.radius * 1.55)
      );
      shardMesh.rotation.z = Math.PI / 2;
      shardMesh.rotation.y = angle;
      this.orbitalGroup.add(shardMesh);
    }

    // Outer gyroscopic energy ring
    const ringGeo = new THREE.TorusGeometry(this.data.radius * 1.4, 0.012, 8, 32);
    this.haloRing = new THREE.Mesh(ringGeo, this.glowMat);
    this.orbitalGroup.add(this.haloRing);

    this.spiritGroup.add(this.orbitalGroup);

    // Floating Eye / Core Beacon
    const eyeGeo = new THREE.SphereGeometry(this.data.radius * 0.18, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending
    });
    this.eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeMesh.position.set(0, 0, this.data.radius * 0.72);
    this.spiritGroup.add(this.eyeMesh);
  },

  spawnAtRandomLocation: function (immediate = false) {
    // Generate randomized coordinate within player's arena bounds (distance: 2.0m - 4.5m)
    const angle = Math.random() * Math.PI * 2;
    const distance = 2.0 + Math.random() * (this.data.boundsRadius - 2.0);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = this.data.minHeight + Math.random() * (this.data.maxHeight - this.data.minHeight);

    this.anchorPosition.set(x, y, z);
    this.orbitAngle = Math.random() * Math.PI * 2;

    this.el.object3D.position.copy(this.anchorPosition);

    if (immediate) {
      this.spiritGroup.scale.set(1, 1, 1);
      this.state = 'ALIVE';
      this.el.setAttribute('visible', 'true');
    } else {
      this.state = 'SPAWNING';
      this.spiritGroup.scale.set(0.01, 0.01, 0.01);
      this.el.setAttribute('visible', 'true');
    }
  },

  onHit: function (hitPoint) {
    if (this.state !== 'ALIVE') return;
    this.state = 'HIT_REACTION';

    // 1. Hit reaction sound via Web Audio API
    if (window.soundEngine) {
      window.soundEngine.playHitSound(this.data.type);
    }

    // 2. Visual flash & spin acceleration
    this.flashTimer = 0.25;
    this.bodyMat.emissive.set(0xffffff);
    this.bodyMat.emissiveIntensity = 1.0;
    this.spinVelocity.set(
      (Math.random() - 0.5) * 35,
      28.0 + Math.random() * 15,
      (Math.random() - 0.5) * 35
    );

    // 3. Notify game state
    this.el.sceneEl.emit('spirit-hit', {
      type: this.data.type,
      position: this.el.object3D.position.clone(),
      points: 100
    });

    // 4. Trigger despawn collapse after brief flash
    setTimeout(() => {
      this.state = 'DESPAWNING';
    }, 280);
  },

  getWorldPosition: function (targetVec) {
    this.el.object3D.getWorldPosition(targetVec);
    return targetVec;
  },

  tick: function (time, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    this.time += dt;

    if (this.state === 'SPAWNING') {
      const s = THREE.MathUtils.lerp(this.spiritGroup.scale.x, 1.0, dt * 8);
      this.spiritGroup.scale.set(s, s, s);
      if (s > 0.96) {
        this.spiritGroup.scale.set(1, 1, 1);
        this.state = 'ALIVE';
      }
    } else if (this.state === 'DESPAWNING') {
      const s = THREE.MathUtils.lerp(this.spiritGroup.scale.x, 0.001, dt * 10);
      this.spiritGroup.scale.set(s, s, s);
      if (s < 0.05) {
        this.spiritGroup.scale.set(0.001, 0.001, 0.001);
        this.state = 'DEAD';
        this.el.setAttribute('visible', 'false');

        // Respawn after 1.5 seconds at a new randomized coordinate
        setTimeout(() => {
          this.spawnAtRandomLocation(false);
        }, 1500);
      }
    }

    if (this.state === 'DEAD') return;

    // Hit reaction spin and flash decay
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        let emissiveColor = 0xff3300;
        if (this.data.type === 'cryo') emissiveColor = 0x0088cc;
        if (this.data.type === 'void') emissiveColor = 0x5a189a;
        this.bodyMat.emissive.set(emissiveColor);
        this.bodyMat.emissiveIntensity = 0.45;
      }
    }

    // Apply spin velocity
    this.spiritGroup.rotation.x += this.spinVelocity.x * dt;
    this.spiritGroup.rotation.y += this.spinVelocity.y * dt;
    this.spiritGroup.rotation.z += this.spinVelocity.z * dt;
    this.spinVelocity.lerp(new THREE.Vector3(0, 0, 0), dt * 3.5);

    // Idle organic hovering & sinusoidal bobbing
    if (this.state === 'ALIVE' || this.state === 'SPAWNING') {
      this.orbitAngle += this.orbitSpeed * dt;

      // Circular pathing around anchor position
      const pathX = this.anchorPosition.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      const pathZ = this.anchorPosition.z + Math.sin(this.orbitAngle) * this.orbitRadius;
      const pathY = this.anchorPosition.y + Math.sin(this.time * this.bobSpeed) * this.bobAmp;

      this.el.object3D.position.set(pathX, pathY, pathZ);

      // Core rotation
      this.coreMesh.rotation.y += dt * 0.9;
      this.coreMesh.rotation.x += dt * 0.4;
      this.wireMesh.rotation.y -= dt * 1.2;

      // Orbital rings rotation
      this.orbitalGroup.rotation.y += dt * 1.8;
      this.orbitalGroup.rotation.z = Math.sin(this.time * 2) * 0.3;

      // Make eye face towards camera
      const camera = this.el.sceneEl.camera;
      if (camera) {
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        const lookDir = camPos.sub(this.el.object3D.position);
        lookDir.y = 0; // Keep horizontal
        if (lookDir.lengthSq() > 0.01) {
          const targetRot = Math.atan2(lookDir.x, lookDir.z);
          this.el.object3D.rotation.y = THREE.MathUtils.lerp(this.el.object3D.rotation.y, targetRot, dt * 3.0);
        }
      }
    }
  }
});
