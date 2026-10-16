/**
 * Arcane Strike: WebAR Spirit Hunter - AR & SLAM Environment Manager
 * Integrates Niantic 8th Wall XR Engine pipeline modules, SLAM ground anchoring,
 * 5m x 5m boundary planes, and universal WebAR video/gyro fallback.
 */

AFRAME.registerComponent('ar-manager', {
  schema: {
    arenaRadius: { type: 'number', default: 5.0 }, // 5m radius play space
    enableGyroFallback: { type: 'boolean', default: true }
  },

  init: function () {
    this.cameraEl = this.el.sceneEl.camera.el;
    this.is8thWallActive = false;
    this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    this.initialAlpha = null;

    this.setupGroundPlane();
    this.setupArenaGrid();
    this.initXR8Pipeline();
    this.initUniversalCameraPassthrough();
  },

  // 1. Invisible ground plane for spatial collisions & bounds
  setupGroundPlane: function () {
    const scene = this.el.sceneEl;

    // Invisible ground plane
    const groundEl = document.createElement('a-plane');
    groundEl.setAttribute('id', 'arGroundPlane');
    groundEl.setAttribute('rotation', '-90 0 0');
    groundEl.setAttribute('width', (this.data.arenaRadius * 2).toString());
    groundEl.setAttribute('height', (this.data.arenaRadius * 2).toString());
    groundEl.setAttribute('position', '0 0 0');
    groundEl.setAttribute('material', 'opacity: 0.0; transparent: true;');
    groundEl.setAttribute('class', 'collidable-ground');
    scene.appendChild(groundEl);
  },

  // 2. Glowing Arcane Floor Ring & Spatial Arena Boundary
  setupArenaGrid: function () {
    const scene = this.el.sceneEl;
    const r = this.data.arenaRadius;

    const arenaBoundary = document.createElement('a-entity');
    arenaBoundary.setAttribute('id', 'arenaBoundary');
    arenaBoundary.setAttribute('position', '0 0.02 0');

    // Procedural glowing circular boundary
    const ringGroup = new THREE.Group();

    // Outer neon border ring
    const borderGeo = new THREE.RingGeometry(r - 0.06, r, 64);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(borderMesh);

    // Inner concentric warning ring
    const innerRingGeo = new THREE.RingGeometry(r * 0.5 - 0.03, r * 0.5, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(innerRingMesh);

    arenaBoundary.setObject3D('arenaRings', ringGroup);
    scene.appendChild(arenaBoundary);
  },

  // 3. 8th Wall Camera & Hand Pipeline Integration
  initXR8Pipeline: function () {
    const setupPipeline = () => {
      if (!window.XR8) return;
      this.is8thWallActive = true;
      console.log('[Arcane Strike] 8th Wall XR Engine active. Configuring camera pipeline...');

      const statusPill = document.getElementById('xr8StatusPill');
      if (statusPill) {
        statusPill.textContent = '🌐 8TH WALL SLAM ACTIVE';
        statusPill.className = 'status-tag status-active';
      }

      // Hide standalone fallback video when 8th Wall takes over rendering
      const videoBg = document.getElementById('arCameraFeed');
      if (videoBg) videoBg.style.display = 'none';

      // Custom pipeline module for Arcane Strike
      const arcanePipelineModule = () => ({
        name: 'arcanestrike-pipeline',
        onStart: () => {
          console.log('[Arcane Strike] 8th Wall Camera Pipeline Started.');
          if (statusPill) statusPill.textContent = '🌐 8TH WALL SLAM ON';
        },
        listeners: [
          {
            event: 'reality.ready',
            process: (event) => {
              console.log('[Arcane Strike] 8th Wall Reality Surface Tracking Ready.');
            }
          },
          {
            event: 'reality.projectchange',
            process: (event) => {
              // Surface / floor anchoring updates from 8th Wall SLAM
              if (event && event.detail && event.detail.position) {
                const groundEl = document.getElementById('arGroundPlane');
                if (groundEl) groundEl.object3D.position.y = event.detail.position.y;
              }
            }
          },
          {
            event: 'handcontroller.handloading',
            process: (event) => {
              window.dispatchEvent(new CustomEvent('xrhandloading', { detail: event }));
            }
          },
          {
            event: 'handcontroller.handfound',
            process: (event) => {
              window.dispatchEvent(new CustomEvent('xrhandfound', { detail: event }));
            }
          },
          {
            event: 'handcontroller.handupdated',
            process: (event) => {
              window.dispatchEvent(new CustomEvent('xrhandupdated', { detail: event }));
            }
          },
          {
            event: 'handcontroller.handlost',
            process: (event) => {
              window.dispatchEvent(new CustomEvent('xrhandlost', { detail: event }));
            }
          }
        ]
      });

      if (window.XR8.addCameraPipelineModules) {
        const modules = [
          window.XR8.GlTextureRenderer ? window.XR8.GlTextureRenderer.pipelineModule() : null,
          window.XR8.Threejs ? window.XR8.Threejs.pipelineModule() : null,
          window.XR8.XrController ? window.XR8.XrController.pipelineModule() : null,
          window.XR8.HandController ? window.XR8.HandController.pipelineModule() : null,
          window.XRExtras && window.XRExtras.AlmostThere ? window.XRExtras.AlmostThere.pipelineModule() : null,
          window.XRExtras && window.XRExtras.FullWindowCanvas ? window.XRExtras.FullWindowCanvas.pipelineModule() : null,
          window.XRExtras && window.XRExtras.Loading ? window.XRExtras.Loading.pipelineModule() : null,
          window.XRExtras && window.XRExtras.RuntimeError ? window.XRExtras.RuntimeError.pipelineModule() : null,
          arcanePipelineModule()
        ].filter(Boolean);

        window.XR8.addCameraPipelineModules(modules);
        console.log(`[Arcane Strike] Registered ${modules.length} 8th Wall pipeline modules.`);
      }
    };

    if (window.XR8) {
      setupPipeline();
    } else {
      window.addEventListener('xrloaded', setupPipeline, { once: true });
    }
  },

  // 4. Universal WebAR Camera Stream Fallback (Safari iOS & Chrome Android)
  initUniversalCameraPassthrough: function () {
    if (this.is8thWallActive) return;

    // Check camera video element
    const videoBg = document.getElementById('arCameraFeed');
    if (!videoBg || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('[Arcane Strike] Web camera feed fallback initialized.');
      this.initDeviceSensors();
      return;
    }

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        videoBg.srcObject = stream;
        videoBg.play();
        videoBg.style.display = 'block';
        console.log('[Arcane Strike] Passthrough WebAR video active.');
        this.initDeviceSensors();
      })
      .catch((err) => {
        console.warn('[Arcane Strike] Camera access request rejected or not available:', err);
        this.initDeviceSensors();
      });
  },

  // Device Gyroscope / Orientation for 360 AR look-around on mobile
  initDeviceSensors: function () {
    if (!this.data.enableGyroFallback) return;

    const requestOrientation = () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then((response) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', this.handleOrientation.bind(this), true);
            }
          })
          .catch(console.warn);
      } else {
        window.addEventListener('deviceorientation', this.handleOrientation.bind(this), true);
      }
    };

    // Trigger on user gesture (e.g. clicking start button)
    window.addEventListener('startgame', requestOrientation, { once: true });
    window.addEventListener('click', requestOrientation, { once: true });
  },

  handleOrientation: function (event) {
    if (this.is8thWallActive) return; // 8th Wall handles camera rotation natively

    const { alpha, beta, gamma } = event;
    if (alpha === null || beta === null) return;

    if (this.initialAlpha === null) {
      this.initialAlpha = alpha;
    }

    const rad = Math.PI / 180;
    const currentAlpha = (alpha - this.initialAlpha) * rad;
    const currentBeta = (beta - 90) * rad; // Pitch from holding phone vertically
    const currentGamma = -gamma * rad; // Roll

    const camObj = this.cameraEl.object3D;
    if (camObj) {
      // Smoothly update camera rotation based on device sensors
      camObj.rotation.set(currentBeta, -currentAlpha, currentGamma, 'YXZ');
    }
  }
});
