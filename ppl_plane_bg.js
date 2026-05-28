(function () {
  'use strict';

  var GLB = 'docs/Meshy_AI_Elixir_Aircraft_Conce_0528193216_texture.glb';
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
  var GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 640px)').matches;

  var SVG =
    '<svg class="ppl-elixir-svg" viewBox="0 0 200 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs><linearGradient id="pplElixirGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#5b8af0" stop-opacity="0.55"/>' +
    '<stop offset="55%" stop-color="#93b8fb" stop-opacity="0.75"/>' +
    '<stop offset="100%" stop-color="#7c6cf6" stop-opacity="0.5"/>' +
    '</linearGradient></defs>' +
    '<g class="ppl-elixir-prop"><ellipse cx="14" cy="21" rx="7" ry="7" stroke-dasharray="2 3"/>' +
    '<line x1="14" y1="14" x2="14" y2="28"/><line x1="7" y1="21" x2="21" y2="21"/></g>' +
    '<path class="ppl-elixir-body" d="M 188 21 L 118 21 Q 98 21 82 19.5 L 48 18.5 Q 28 18 12 19.5 L 4 20.5 Q 2 20.5 2 21 Q 2 21.5 4 21.5 L 12 22.5 Q 28 24 48 23.5 L 82 22.5 Q 98 21 118 21 L 188 21 Z"/>' +
    '<ellipse class="ppl-elixir-canopy" cx="58" cy="17" rx="14" ry="5.5"/>' +
    '<path class="ppl-elixir-wing" d="M 62 21.5 L 98 21.5 L 92 27.5 L 52 27.5 Z"/>' +
    '<path class="ppl-elixir-tail" d="M 168 21 L 188 12 L 186 21 L 188 30 Z"/>' +
    '<path class="ppl-elixir-wing" d="M 172 21 L 182 21 L 180 24 L 170 24 Z" opacity="0.6"/>' +
    '<text class="ppl-elixir-label" x="78" y="25">ELIXIR</text></svg>';

  function assetUrl(rel) {
    var script = document.querySelector('script[src*="ppl_plane_bg"]');
    if (script && script.src) {
      try { return new URL(rel, script.src).href; }
      catch (e) { /* ignore */ }
    }
    return rel;
  }

  function insertSky(el) {
    if (document.getElementById('ppl-sky')) return null;
    var mesh = document.querySelector('.mesh-bg');
    if (mesh && mesh.parentNode) mesh.parentNode.insertBefore(el, mesh.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
    return el;
  }

  function planeSvg(cls, uid) {
    var d = document.createElement('div');
    d.className = 'ppl-sky-plane ' + cls;
    d.innerHTML = SVG.replace(/pplElixirGrad/g, 'pplElixirGrad' + uid);
    return d;
  }

  function mountSvg() {
    if (document.getElementById('ppl-sky')) return;
    var sky = document.createElement('div');
    sky.id = 'ppl-sky';
    sky.className = 'ppl-sky ppl-sky--svg';
    sky.setAttribute('aria-hidden', 'true');
    sky.appendChild(planeSvg('ppl-sky-plane--ltr', 'A'));
    sky.appendChild(planeSvg('ppl-sky-plane--rtl', 'B'));
    insertSky(sky);
  }

  function prepareModel(root, THREE) {
    root.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(root);
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    root.position.sub(center);
    var maxDim = Math.max(size.x, size.y, size.z) || 1;
    root.scale.setScalar(1.35 / maxDim);
    root.rotation.set(0, Math.PI / 2, 0);
    return root;
  }

  function tuneMaterials(root, THREE) {
    root.traverse(function (child) {
      if (!child.isMesh || !child.material) return;
      var mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(function (mat) {
        mat.transparent = true;
        mat.opacity = 0;
        if (mat.emissive) {
          mat.emissive.setHex(0x1e3058);
          mat.emissiveIntensity = 0.22;
        }
        if ('envMapIntensity' in mat) mat.envMapIntensity = 0.35;
        if ('metalness' in mat) mat.metalness = Math.min(mat.metalness, 0.65);
        if ('roughness' in mat) mat.roughness = Math.max(mat.roughness, 0.35);
      });
    });
  }

  function clonePlane(model) {
    var clone = model.clone(true);
    clone.traverse(function (child) {
      if (!child.isMesh || !child.material) return;
      if (Array.isArray(child.material)) {
        child.material = child.material.map(function (m) { return m.clone(); });
      } else {
        child.material = child.material.clone();
      }
    });
    return clone;
  }

  function flyOpacity(progress) {
    if (progress < 0.06) return progress / 0.06;
    if (progress < 0.14) return 1;
    if (progress < 0.78) return 1;
    if (progress < 0.9) return 1 - (progress - 0.78) / 0.12;
    return 0;
  }

  function setPlaneOpacity(root, alpha) {
    var o = Math.max(0, Math.min(0.62, alpha * 0.62));
    root.traverse(function (child) {
      if (!child.isMesh || !child.material) return;
      var mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(function (mat) { mat.opacity = o; });
    });
  }

  async function init3d() {
    if (reduced) {
      mountSvg();
      return;
    }

    var sky = document.createElement('div');
    sky.id = 'ppl-sky';
    sky.className = 'ppl-sky ppl-sky--3d ppl-sky--loading';
    sky.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    canvas.className = 'ppl-sky-canvas';
    sky.appendChild(canvas);
    insertSky(sky);

    try {
      var THREE = await import(THREE_URL);
      var GLTF = await import(GLTF_URL);
      var loader = new GLTF.GLTFLoader();
      var gltf = await loader.loadAsync(assetUrl(GLB));
      var base = prepareModel(gltf.scene, THREE);
      tuneMaterials(base, THREE);

      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: !mobile,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.85;

      var scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x080b12, 0.04);

      var camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 40);
      camera.position.set(0, 0.05, 5.2);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0x5b8af0, 0.45));
      var key = new THREE.DirectionalLight(0x93b8fb, 1.1);
      key.position.set(4, 6, 5);
      scene.add(key);
      var fill = new THREE.DirectionalLight(0x34d3a8, 0.35);
      fill.position.set(-5, 2, -3);
      scene.add(fill);
      var rim = new THREE.PointLight(0x7c6cf6, 0.5, 12);
      rim.position.set(0, -1, 2);
      scene.add(rim);

      var configs = mobile
        ? [{ dir: 1, phase: 0, y: 0.08, z: 0, speed: 0.11, span: 7.5, roll: 0.04 }]
        : [
            { dir: 1, phase: 0, y: 0.05, z: -0.15, speed: 0.1, span: 8.5, roll: 0.05 },
            { dir: -1, phase: 3.8, y: -0.12, z: 0.2, speed: 0.085, span: 7.8, roll: 0.04 },
          ];

      var planes = configs.map(function (cfg) {
        var mesh = clonePlane(base);
        scene.add(mesh);
        return { mesh: mesh, cfg: cfg };
      });

      var running = true;
      var t0 = performance.now();

      function resize() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }

      function animate(now) {
        if (!running) return;
        requestAnimationFrame(animate);
        if (document.hidden) return;

        var t = (now - t0) * 0.001;
        planes.forEach(function (p, i) {
          var c = p.cfg;
          var cycle = 13 / c.speed;
          var progress = ((t + c.phase) % cycle) / cycle;
          var visible = flyOpacity(progress);
          var x = (progress - 0.5) * c.span * c.dir;
          var bob = Math.sin(t * 0.9 + i * 1.7) * 0.035;

          p.mesh.position.set(x, c.y + bob, c.z);
          p.mesh.rotation.set(
            Math.sin(t * 0.55 + i) * c.roll,
            c.dir > 0 ? Math.PI / 2 : -Math.PI / 2,
            Math.sin(t * 0.35 + i * 0.8) * 0.03
          );
          setPlaneOpacity(p.mesh, visible);
          p.mesh.visible = visible > 0.02;
        });

        renderer.render(scene, camera);
      }

      window.addEventListener('resize', resize, { passive: true });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) t0 = performance.now();
      });

      resize();
      sky.classList.remove('ppl-sky--loading');
      requestAnimationFrame(animate);

      sky._ppl3dDispose = function () {
        running = false;
        window.removeEventListener('resize', resize);
        renderer.dispose();
      };
    } catch (err) {
      console.warn('[ppl_plane_bg] GLB indisponible, repli SVG.', err);
      sky.remove();
      mountSvg();
    }
  }

  function boot() {
    init3d();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
