# Arcane Strike: WebAR Spirit Hunter

A complete, production-ready WebAR arcade mini-game built for **Niantic 8th Wall** and **A-Frame WebXR** environments.

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

## 🌐 Niantic 8th Wall Cloud Studio Integration

To deploy to Niantic 8th Wall Cloud Studio:
1. Create a new A-Frame project in your 8th Wall workspace.
2. Ensure the `hand-tracking` and `world-tracking` features are toggled **ON** in `app.json`.
3. The included `js/components/hand-tracker.js` and `js/components/ar-manager.js` automatically hook into `xrhandloading`, `xrhandfound`, `xrhandupdated`, and `xrhandlost` pipeline events.
