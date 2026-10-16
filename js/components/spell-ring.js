/**
 * Arcane Strike: WebAR Spirit Hunter - Arcane Spell Ring Component
 * Procedural 3D multi-layered arcane magic circle with rotating runes and glowing shaders.
 */
AFRAME.registerComponent('arcane-spell-ring', {
  schema: {
    color: { type: 'color', default: '#00f0ff' },
    accentColor: { type: 'color', default: '#ff00aa' },
    radius: { type: 'number', default: 0.22 },
    active: { type: 'boolean', default: true }
  },

  init: function () {
    this.time = 0;
    this.ringGroup = new THREE.Group();
    this.el.setObject3D('spellRingMesh', this.ringGroup);

    this.createRuneTexture();
    this.buildRingLayers();

    // Pulse animation state
    this.pulseFactor = 1.0;
    this.isCharging = false;
  },

  createRuneTexture: function () {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 1024);

    const cx = 512;
    const cy = 512;

    // Glowing style
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;

    // Outer concentric circles
    ctx.beginPath();
    ctx.arc(cx, cy, 470, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 440, 0, Math.PI * 2);
    ctx.stroke();

    // Arcane glyphs / symbols around the outer perimeter
    const runeSymbols = [
      '⚡', '✦', '✧', '᚛', '᚜', '✶', '✹', 'ᛟ',
      'ᛉ', 'ᛃ', 'ᛏ', 'ᚨ', 'ᛊ', 'ᚲ', 'ᛗ', 'ᚹ',
      '▲', '▼', '◆', '◈', '✦', 'Ω', 'Ψ', 'Φ'
    ];

    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const numRunes = runeSymbols.length;
    for (let i = 0; i < numRunes; i++) {
      const angle = (i / numRunes) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * 455, cy + Math.sin(angle) * 455);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(runeSymbols[i], 0, 0);
      ctx.restore();
    }

    // Sacred geometry: Intersecting Squares / Octagram
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00f0ff';
    for (let rot = 0; rot < 2; rot++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 4);
      const halfSize = 250;
      ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
      ctx.restore();
    }

    // Hexagram triangles
    for (let t = 0; t < 2; t++) {
      const offset = (t * Math.PI);
      ctx.beginPath();
      for (let p = 0; p < 3; p++) {
        const theta = offset + (p * (Math.PI * 2) / 3) - Math.PI / 2;
        const x = cx + Math.cos(theta) * 320;
        const y = cy + Math.sin(theta) * 320;
        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Inner circle with tick marks
    ctx.beginPath();
    ctx.arc(cx, cy, 200, 0, Math.PI * 2);
    ctx.stroke();

    const ticks = 48;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2;
      const r1 = i % 4 === 0 ? 175 : 190;
      const r2 = 200;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }

    // Core arcane star
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.stroke();

    this.runeTexture = new THREE.CanvasTexture(canvas);
    this.runeTexture.anisotropy = 4;
  },

  buildRingLayers: function () {
    const r = this.data.radius;

    // 1. Primary Plane with Rune Texture
    const planeGeo = new THREE.PlaneGeometry(r * 2.4, r * 2.4);
    this.runeMaterial = new THREE.MeshBasicMaterial({
      map: this.runeTexture,
      transparent: true,
      opacity: 0.95,
      color: new THREE.Color(this.data.color),
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.runeMesh = new THREE.Mesh(planeGeo, this.runeMaterial);
    this.ringGroup.add(this.runeMesh);

    // 2. Counter-rotating inner energy ring (Torus)
    const torusGeo = new THREE.TorusGeometry(r * 0.75, r * 0.02, 16, 64);
    const torusMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.data.accentColor),
      transparent: true,
      opacity: 0.85,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    this.innerTorus = new THREE.Mesh(torusGeo, torusMat);
    this.ringGroup.add(this.innerTorus);

    // 3. Outer boundary energy ring
    const outerTorusGeo = new THREE.TorusGeometry(r * 1.15, r * 0.015, 16, 64);
    const outerTorusMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.data.color),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.outerTorus = new THREE.Mesh(outerTorusGeo, outerTorusMat);
    this.ringGroup.add(this.outerTorus);

    // 4. Central pulsing mana orb
    const coreSphereGeo = new THREE.SphereGeometry(r * 0.16, 16, 16);
    this.coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.coreOrb = new THREE.Mesh(coreSphereGeo, this.coreMat);
    this.ringGroup.add(this.coreOrb);

    // Initial orientation: facing towards viewer camera
    this.ringGroup.rotation.x = 0;
  },

  pulseCast: function () {
    this.pulseFactor = 1.9;
    this.runeMaterial.color.set('#ffffff');
    if (this.coreMat) this.coreMat.color.set('#ff00aa');

    setTimeout(() => {
      this.runeMaterial.color.set(this.data.color);
      if (this.coreMat) this.coreMat.color.set('#ffffff');
    }, 220);
  },

  tick: function (time, delta) {
    if (!this.data.active) return;
    const dt = delta / 1000;
    this.time += dt;

    // Smoothly decay pulse
    this.pulseFactor = THREE.MathUtils.lerp(this.pulseFactor, 1.0, dt * 6);

    // Primary rune circle rotation
    if (this.runeMesh) {
      this.runeMesh.rotation.z += dt * 0.75;
      const baseScale = 1.0 + Math.sin(this.time * 4) * 0.04;
      const s = baseScale * this.pulseFactor;
      this.runeMesh.scale.set(s, s, s);
    }

    // Counter-rotating inner energy torus
    if (this.innerTorus) {
      this.innerTorus.rotation.z -= dt * 1.4;
      this.innerTorus.rotation.x = Math.sin(this.time * 2.5) * 0.2;
    }

    // Outer boundary torus subtle wobble
    if (this.outerTorus) {
      this.outerTorus.rotation.z += dt * 0.35;
    }

    // Central core pulsing
    if (this.coreOrb) {
      const coreScale = (0.9 + Math.sin(this.time * 8) * 0.25) * this.pulseFactor;
      this.coreOrb.scale.set(coreScale, coreScale, coreScale);
    }
  }
});
