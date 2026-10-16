# Arcane Strike: WebAR Spirit Hunter

A complete, production-ready WebAR arcade mini-game built for **Niantic 8th Wall** and **A-Frame WebXR** environments.

**Live WebAR Demo:** [https://altronickman.github.io/Altronick/](https://altronickman.github.io/Altronick/)

---

## 🔮 Core Game Loop

1. **SLAM Anchoring**: Tracks the physical floor and anchors an invisible 5m x 5m arena with glowing neon runes.
2. **Hand Tracking & Spell Ring**: Attaches a glowing, multi-layered 3D Arcane Spell Circle with rotating ancient runes directly to the player's wrist/palm joint.
3. **Kinetic Mana Casting**: Detected forward palm thrusts, pinches, or tapping the on-screen glassmorphic **CAST SPELL ⚡** button fires glowing mana projectiles toward the reticle.
4. **Target Elemental Spirits**: Three low-poly floating fantasy spirits (Ignis / Pyro, Glacies / Cryo, Aether / Void) hover with sinusoidal bobbing and circular wander paths.
5. **Hit Reactions & Scoring**: Hits trigger rapid spin-flash reactions, procedural Web Audio impact chimes, +100 base score, combo streaks (x2, x3, x4), and automatic 1.5s respawns.
6. **Cyberpunk Arcade HUD**: Displays real-time Score, 60-Second Countdown Timer, Spell Channel Cooldown, Accuracy %, Combo Multipliers, and Game-Over Rating Modal.

---

## 🛠️ Architecture & Tech Stack

```text
Altronick/
├── index.html               # Main WebAR entry point & A-Frame scene hierarchy
├── css/
│   └── style.css            # Cyberpunk glassmorphic HUD, neon glows, responsive layouts
├── js/
│   ├── audio.js             # Pure Web Audio API procedural synthesizer (0-latency SFX)
│   ├── game.js              # State manager (Score, 60s Timer, Accuracy, Combos, Modals)
│   └── components/
│       ├── spell-ring.js    # 3D procedural Arcane Ring with canvas runes & glowing shaders
│       ├── hand-tracker.js  # 8th Wall hand events (xrhandfound) & palm thrust/pinch detector
│       ├── spirit-creature.js # Low-poly elemental spirit AI (Pyro, Cryo, Void)
│       ├── projectile.js    # Kinetic mana orb physics, trajectory & collision bursts
│       └── ar-manager.js    # SLAM ground plane, 5m bounds & universal WebAR fallback
├── libs/
│   └── aframe.min.js        # Self-contained local A-Frame library (<1.4MB)
└── server.ps1               # Lightweight local development HTTP server
```

---

## 🎮 How to Play

### Mobile Web (Safari iOS / Chrome Android)
1. Launch the local dev server using PowerShell:
   ```powershell
   .\server.ps1
   ```
2. Open the displayed Network IP URL (e.g., `http://192.168.x.x:8080/`) on your mobile browser.
3. Allow camera access.
4. **Aim at the physical floor** to anchor the play arena.
5. **Raise your hand** to manifest the 3D Arcane Ring on your wrist/palm.
6. **Thrust your palm forward**, **pinch**, or tap **CAST SPELL ⚡** to fire mana orbs at the floating spirits.
7. Banish as many spirits as possible before the 60-second timer expires!

### Desktop Testing
- Move the camera using your mouse / trackpad or `WASD` keys.
- Click **CAST SPELL ⚡**, tap the screen, or press `Spacebar` to cast mana orbs.

---

## 🌐 Niantic 8th Wall XR Integration

### 1. Engine & Libraries
- **8frame (A-Frame v1.4.1 for 8th Wall)**: Loaded directly via `https://cdn.8thwall.com/web/aframe/8frame-1.4.1.min.js`.
- **XRExtras**: Handles loading coaching overlays, runtime error modals, and fullscreen canvas initialization (`https://cdn.8thwall.com/web/xrextras/xrextras.js`).
- **XR8 Camera Pipeline Modules**: Registers `XR8.GlTextureRenderer`, `XR8.Threejs`, `XR8.XrController`, `XR8.HandController`, and custom `arcanestrike-pipeline` via `XR8.addCameraPipelineModules`.

### 2. Hand Tracking Pipeline
- Integrates with 8th Wall hand events: `xrhandloading`, `xrhandfound`, `xrhandupdated`, `xrhandlost`.
- Extracts 8th Wall joint attachment points (`wrist`, `palm`, `indexTip`, `thumbTip`) to anchor the 3D Arcane Ring and compute forward palm thrust velocity ($\Delta Z$).

### 3. Deployment Modes
- **8th Wall Cloud Studio**: When uploaded to 8th Wall Cloud Studio, the platform automatically authenticates without requiring an App Key.
- **Self-Hosted / GitHub Pages**: Click the **⚙️** button in the HUD or pass `?appKey=YOUR_KEY` in the URL to activate your 8th Wall App Key.
- **Local / Universal Fallback**: If running without an 8th Wall key, the built-in fallback camera passthrough with 6DoF gyroscope tracking runs automatically.
