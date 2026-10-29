import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MAX_PIXEL_RATIO = 1.5;
const PREVIEW_PIXEL_RATIO = 1.25;
const PREVIEW_FPS = 30;
const HERO_FPS = 30;

// Track scroll activity so expensive render loops can pause while the page
// is moving. Frozen canvases are imperceptible during a scroll but keep the
// main thread and GPU free for compositing.
let isScrolling = false;
let scrollEndTimer = 0;

window.addEventListener('scroll', () => {
    isScrolling = true;
    clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(() => { isScrolling = false; }, 150);
}, { passive: true });

// Shared frame loop: caps FPS and skips rendering when the page is hidden,
// scrolling, or the target is off-screen.
function createFrameLoop(render, { fps = 60, shouldRender = () => true } = {}) {
    const interval = fps >= 60 ? 0 : 1000 / fps;
    let lastTime = 0;

    const tick = (now) => {
        requestAnimationFrame(tick);
        if (document.hidden || isScrolling || !shouldRender()) return;
        if (interval && now - lastTime < interval) return;
        lastTime = now;
        render(now);
    };

    requestAnimationFrame(tick);
}

// Run non-urgent work only when the browser is idle so it never competes
// with scrolling or input handling.
function whenIdle(callback) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout: 2500 });
    } else {
        window.setTimeout(callback, 200);
    }
}

function observeVisibility(element, callback) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => callback(entry.isIntersecting));
    }, { rootMargin: '0px', threshold: 0 });
    observer.observe(element);
    return observer;
}

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

document.documentElement.setAttribute('data-theme', currentTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// Hero Canvas - Animated 3D highway
function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

    let isVisible = true;
    observeVisibility(canvas, (visible) => { isVisible = visible; });

    camera.position.set(0, 4, 8);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xea580c, 1.5);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Highway
    const roadGroup = new THREE.Group();

    const roadGeometry = new THREE.PlaneGeometry(40, 2);
    const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -1;
    roadGroup.add(road);

    for (let i = -18; i < 20; i += 4) {
        const lineGeometry = new THREE.PlaneGeometry(2, 0.08);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(i, -0.99, 0);
        roadGroup.add(line);
    }

    const barrierGeometry = new THREE.BoxGeometry(40, 0.3, 0.05);
    const barrierMaterial = new THREE.MeshBasicMaterial({ color: 0xea580c });
    const barrier1 = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier1.position.set(0, -0.85, 0.98);
    roadGroup.add(barrier1);
    const barrier2 = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier2.position.set(0, -0.85, -0.98);
    roadGroup.add(barrier2);

    scene.add(roadGroup);

    // Floating geometric shapes
    const shapes = [];
    const geometries = [
        new THREE.BoxGeometry(0.25, 0.25, 0.25),
        new THREE.TetrahedronGeometry(0.22),
        new THREE.OctahedronGeometry(0.22),
        new THREE.IcosahedronGeometry(0.2)
    ];

    for (let i = 0; i < 12; i++) {
        const material = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0xea580c : 0xf59e0b,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });
        const mesh = new THREE.Mesh(geometries[i % geometries.length], material);
        mesh.position.set(
            (Math.random() - 0.5) * 18,
            Math.random() * 2.5 + 1.2,
            (Math.random() - 0.5) * 7
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        shapes.push(mesh);
        scene.add(mesh);
    }

    const gridHelper = new THREE.GridHelper(40, 40, 0xea580c, 0x1e293b);
    gridHelper.position.y = -1.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    const clock = new THREE.Clock();
    let time = 0;

    createFrameLoop(() => {
        const delta = Math.min(clock.getDelta(), 0.1);
        time += delta * 0.6;

        shapes.forEach((shape, i) => {
            shape.rotation.x += delta * 0.48;
            shape.rotation.y += delta * 0.48;
            shape.position.y = 1.8 + Math.sin(time + i) * 0.4;
        });

        camera.position.x = Math.sin(time * 0.1) * 1.5;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }, { fps: HERO_FPS, shouldRender: () => isVisible });

    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
}

// Build a canvas texture for the toll plaza sign.
function createSignTexture(text) {
    const canvas = document.createElement('canvas');
    const width = 1024;
    const height = 256;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.fillStyle = '#f8fafc';
    const font = (size) => `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    let fontSize = 132;
    ctx.font = font(fontSize);
    const maxWidth = width - 72;
    const textWidth = ctx.measureText(text).width;
    if (textWidth > maxWidth) {
        fontSize = Math.floor(fontSize * (maxWidth / textWidth));
        ctx.font = font(fontSize);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

// Wide canvas texture sized to the billboard face so the text is not stretched.
function createBillboardTexture(text, aspect) {
    const canvas = document.createElement('canvas');
    const width = 2048;
    const height = Math.max(128, Math.round(width / Math.max(aspect, 0.1)));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const border = Math.max(6, height * 0.05);
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = border;
    ctx.strokeRect(border, border, width - border * 2, height - border * 2);

    ctx.fillStyle = '#f8fafc';
    const font = (size) => `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    let fontSize = Math.round(height * 0.5);
    ctx.font = font(fontSize);
    const maxWidth = width - border * 4;
    const textWidth = ctx.measureText(text).width;
    if (textWidth > maxWidth) {
        fontSize = Math.floor(fontSize * (maxWidth / textWidth));
        ctx.font = font(fontSize);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + height * 0.03);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

let concreteTexture = null;
let asphaltTexture = null;

function getConcreteTexture() {
    if (concreteTexture) return concreteTexture;

    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c7ced8';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 2600; i++) {
        const shade = 165 + Math.floor(Math.random() * 70);
        const alpha = 0.08 + Math.random() * 0.22;
        ctx.fillStyle = `rgba(${shade}, ${shade + 3}, ${shade + 8}, ${alpha})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    concreteTexture = new THREE.CanvasTexture(canvas);
    concreteTexture.colorSpace = THREE.SRGBColorSpace;
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    concreteTexture.repeat.set(2, 2);
    concreteTexture.anisotropy = 4;
    return concreteTexture;
}

function getAsphaltTexture() {
    if (asphaltTexture) return asphaltTexture;

    const canvas = document.createElement('canvas');
    const width = 1024;
    const height = 1024;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#232c38';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 9000; i++) {
        const shade = 40 + Math.floor(Math.random() * 45);
        const alpha = 0.15 + Math.random() * 0.3;
        ctx.fillStyle = `rgba(${shade}, ${shade + 4}, ${shade + 9}, ${alpha})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.lineWidth = 8;
    ctx.setLineDash([46, 34]);
    for (let i = 1; i <= 5; i++) {
        const y = (height / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Tire wear tracks along each lane
    ctx.strokeStyle = 'rgba(10, 14, 20, 0.28)';
    ctx.lineWidth = 18;
    for (let i = 0; i < 6; i++) {
        const laneY = (height / 6) * (i + 0.5);
        for (const offset of [-34, 34]) {
            ctx.beginPath();
            ctx.moveTo(0, laneY + offset);
            ctx.lineTo(width, laneY + offset);
            ctx.stroke();
        }
    }

    // Direction arrows painted on each lane
    const drawArrow = (x, y, size) => {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(-size, -size * 0.16);
        ctx.lineTo(size * 0.18, -size * 0.16);
        ctx.lineTo(size * 0.18, -size * 0.38);
        ctx.lineTo(size, 0);
        ctx.lineTo(size * 0.18, size * 0.38);
        ctx.lineTo(size * 0.18, size * 0.16);
        ctx.lineTo(-size, size * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };

    for (let i = 0; i < 6; i++) {
        const laneY = (height / 6) * (i + 0.5);
        drawArrow(width * 0.32, laneY, 34);
        drawArrow(width * 0.72, laneY, 34);
    }

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(width, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height - 16);
    ctx.lineTo(width, height - 16);
    ctx.stroke();

    asphaltTexture = new THREE.CanvasTexture(canvas);
    asphaltTexture.colorSpace = THREE.SRGBColorSpace;
    asphaltTexture.wrapS = THREE.RepeatWrapping;
    asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.anisotropy = 4;
    return asphaltTexture;
}

function findRoofMesh(root) {
    root.updateMatrixWorld(true);

    let roof = null;
    let bestVolume = -Infinity;

    root.traverse((object) => {
        if (!object.isMesh) return;
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const isFlat = size.y <= Math.min(size.x, size.z) * 0.35;
        const volume = size.x * size.y * size.z;
        if (isFlat && volume > bestVolume) {
            bestVolume = volume;
            roof = object;
        }
    });

    return roof;
}

// The source model carries a tall, thin billboard panel along one roof side.
function findBillboardMesh(root, roofBox) {
    const roofSize = roofBox.getSize(new THREE.Vector3());

    let billboard = null;
    let bestArea = 0;

    root.traverse((object) => {
        if (!object.isMesh) return;
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const thin = size.x < roofSize.x * 0.08;
        const tall = size.y > roofSize.y * 1.1;
        const long = size.z > roofSize.z * 0.35;
        const area = size.y * size.z;
        if (thin && tall && long && area > bestArea) {
            bestArea = area;
            billboard = object;
        }
    });

    return billboard;
}

function styleTollStation(model) {
    const fallback = getConcreteTexture();
    const visited = new Set();

    model.traverse((object) => {
        if (!object.isMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
            if (!material || visited.has(material)) return;
            visited.add(material);
            if (!material.map) material.map = fallback;
            if (material.color) material.color.set(0xffffff);
            if ('roughness' in material) material.roughness = 0.72;
            if ('metalness' in material) material.metalness = 0.05;
            material.needsUpdate = true;
        });
    });
}

function addPlazaGround(group, box, size, center) {
    const geometry = new THREE.PlaneGeometry(size.x * 1.18, size.z * 1.06);
    const material = new THREE.MeshStandardMaterial({
        map: getAsphaltTexture(),
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(
        center.x,
        box.min.y - Math.max(size.y * 0.002, 0.002),
        center.z
    );
    group.add(ground);
}

function addRoofSigns(group, roofMesh, text, billboardBox = null) {
    const roofBox = new THREE.Box3().setFromObject(roofMesh);
    const roofSize = roofBox.getSize(new THREE.Vector3());
    const roofCenter = roofBox.getCenter(new THREE.Vector3());

    const signHeight = Math.min(roofSize.y * 0.32, roofSize.z * 0.03);
    const signWidth = signHeight * 4;
    const geometry = new THREE.PlaneGeometry(signWidth, signHeight);
    const material = new THREE.MeshBasicMaterial({
        map: createSignTexture(text),
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false
    });

    const y = roofBox.min.y + roofSize.y * 0.62;
    const pad = signWidth * 0.02;

    const makeSign = (x, z, rotationY) => {
        const sign = new THREE.Mesh(geometry, material);
        sign.position.set(x, y, z);
        sign.rotation.y = rotationY;
        group.add(sign);
    };

    // Place the left sign beyond the billboard when the billboard owns that wall.
    const leftZ = billboardBox ? roofBox.min.z + roofSize.z * 0.08 : roofCenter.z;
    const onBillboard = billboardBox
        && leftZ > billboardBox.min.z
        && leftZ < billboardBox.max.z;
    const leftX = onBillboard ? billboardBox.min.x - pad : roofBox.min.x - pad;

    makeSign(roofBox.max.x + pad, roofCenter.z, Math.PI / 2);
    makeSign(leftX, leftZ, -Math.PI / 2);
    makeSign(roofCenter.x, roofBox.max.z + pad, 0);
    makeSign(roofCenter.x, roofBox.min.z - pad, Math.PI);
}

// Cover the model's original billboard with a full MOIC banner.
function addBillboardSign(group, billboardMesh, text) {
    const box = new THREE.Box3().setFromObject(billboardMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const signWidth = size.z * 0.98;
    const signHeight = size.y * 0.94;
    const geometry = new THREE.PlaneGeometry(signWidth, signHeight);
    const material = new THREE.MeshBasicMaterial({
        map: createBillboardTexture(text, signWidth / signHeight),
        side: THREE.DoubleSide,
        toneMapped: false
    });

    const sign = new THREE.Mesh(geometry, material);
    sign.position.set(box.min.x - 0.01, center.y, center.z);
    sign.rotation.y = -Math.PI / 2;
    group.add(sign);
}

// Add branding, colour and texture to the toll station model.
function decorateTollStation(model, text = 'MOIC TOLL PLAZA') {
    const group = new THREE.Group();
    group.add(model);
    group.updateMatrixWorld(true);

    const roofMesh = findRoofMesh(model);
    const roofBox = roofMesh ? new THREE.Box3().setFromObject(roofMesh) : null;
    const billboardMesh = roofBox ? findBillboardMesh(model, roofBox) : null;
    const billboardBox = billboardMesh ? new THREE.Box3().setFromObject(billboardMesh) : null;

    styleTollStation(model);
    if (roofBox) addRoofSigns(group, roofMesh, text, billboardBox);
    if (billboardMesh) addBillboardSign(group, billboardMesh, text);

    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    addPlazaGround(group, box, size, center);

    return group;
}

// Work card 3D canvases
function initProjectCanvas(canvas, modelName) {
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, PREVIEW_PIXEL_RATIO));

    let isVisible = true;
    observeVisibility(canvas, (visible) => { isVisible = visible; });

    camera.position.z = 3.5;
    camera.position.y = 1.2;
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
    controls.enableZoom = false;
    controls.enablePan = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xea580c, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const resize = () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    };
    canvas._resize = resize;
    resize();

    const loader = new GLTFLoader();
    loader.load(
        `/assets/models/${modelName}/scene.gltf`,
        (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.2 / maxDim;
            model.scale.multiplyScalar(scale);
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            scene.add(modelName === 'm2' ? decorateTollStation(model) : model);
        },
        undefined,
        (error) => {
            console.error('Error loading model:', modelName, error);
        }
    );

    createFrameLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    }, { fps: PREVIEW_FPS, shouldRender: () => isVisible });

    window.addEventListener('resize', resize);
}

// Modal functionality
const MODAL_MODELS = {
    m1: 'Toll Booth - Model 01',
    m2: 'Toll Station - Model 02',
    m3: 'Traffic Management Systems - Model 03',
    m4: 'Infrastructure Component - Model 04',
    m6: 'Structural Elements - Model 06'
};

let modalScene, modalCamera, modalRenderer, modalControls, currentModalModel;
const modalModelCache = new Map();

function initModal() {
    const modal = document.getElementById('modelModal');
    const modalClose = document.getElementById('modalClose');
    const modalBackdrop = document.querySelector('.model-modal-backdrop');
    const modalCanvas = document.getElementById('modalCanvas');

    if (!modal || !modalCanvas) return;

    modalScene = new THREE.Scene();
    modalCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    modalRenderer = new THREE.WebGLRenderer({ canvas: modalCanvas, alpha: true, antialias: true });
    modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    modalCamera.position.set(2.4, 2, 5.5);
    modalCamera.lookAt(0, 0, 0);

    modalControls = new OrbitControls(modalCamera, modalRenderer.domElement);
    modalControls.enableDamping = true;
    modalControls.dampingFactor = 0.06;
    modalControls.minDistance = 2;
    modalControls.maxDistance = 20;
    modalControls.target.set(0, 0, 0);

    modalScene.add(new THREE.AmbientLight(0xffffff, 2));
    const keyLight = new THREE.DirectionalLight(0xea580c, 1.5);
    keyLight.position.set(5, 5, 5);
    modalScene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1);
    rimLight.position.set(-5, 3, -5);
    modalScene.add(rimLight);

    const resizeModal = () => {
        const width = modalCanvas.clientWidth;
        const height = modalCanvas.clientHeight;
        if (!width || !height) return;
        modalCamera.aspect = width / height;
        modalCamera.updateProjectionMatrix();
        modalRenderer.setSize(width, height, false);
    };
    modal._resize = resizeModal;

    createFrameLoop(() => {
        modalControls.update();
        modalRenderer.render(modalScene, modalCamera);
    }, { fps: 60, shouldRender: () => modal.classList.contains('active') });

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    window.addEventListener('resize', resizeModal);
}

function setModalStatus(message, isError) {
    const loaderEl = document.getElementById('modalLoader');
    const textEl = document.getElementById('modalLoaderText');
    if (!loaderEl) return;
    if (!message) {
        loaderEl.hidden = true;
        return;
    }
    loaderEl.hidden = false;
    loaderEl.classList.toggle('error', Boolean(isError));
    if (textEl) textEl.textContent = message;
}

function prepareModalModel(template) {
    const box = new THREE.Box3().setFromObject(template);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    template.scale.multiplyScalar(3 / maxDim);
    box.setFromObject(template);
    const center = box.getCenter(new THREE.Vector3());
    template.position.sub(center);
    return template;
}

function openModelModal(modelName) {
    const modal = document.getElementById('modelModal');
    const modalTitle = document.querySelector('.model-modal-title');
    if (!modal || !modalScene) return;

    if (modalTitle) modalTitle.textContent = MODAL_MODELS[modelName] || '3D Model Viewer';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (modal._resize) requestAnimationFrame(modal._resize);

    if (currentModalModel) {
        modalScene.remove(currentModalModel);
        currentModalModel = null;
    }

    const addModel = (template) => {
        const model = template.clone(true);
        modalScene.add(model);
        currentModalModel = model;
        modalControls.target.set(0, 0, 0);
        modalControls.update();
        setModalStatus(null);
    };

    if (modalModelCache.has(modelName)) {
        setModalStatus(null);
        addModel(modalModelCache.get(modelName));
        return;
    }

    setModalStatus('Loading 3D modelâ€¦');
    const loader = new GLTFLoader();
    loader.load(
        `/assets/models/${modelName}/scene.gltf`,
        (gltf) => {
            let template = prepareModalModel(gltf.scene);
            if (modelName === 'm2') template = decorateTollStation(template);
            modalModelCache.set(modelName, template);
            addModel(template);
        },
        undefined,
        (error) => {
            console.error('Error loading modal model:', modelName, error);
            setModalStatus('Could not load this 3D model.', true);
        }
    );
}

// Lazily initialize 3D previews only when they are on screen.
function setupProjectCanvases() {
    document.querySelectorAll('.project-canvas').forEach((canvas) => {
        const modelName = canvas.dataset.model;
        let initialized = false;

        const init = () => {
            if (initialized) return;
            if (!canvas.clientWidth || !canvas.clientHeight) return;
            initialized = true;
            whenIdle(() => initProjectCanvas(canvas, modelName));
        };
        canvas._init = init;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) init();
            });
        }, { rootMargin: '200px 0px' });
        observer.observe(canvas);
    });
}

function setupWorkFilters() {
    const buttons = Array.from(document.querySelectorAll('.filter-btn'));
    const cards = Array.from(document.querySelectorAll('.work-card'));
    if (!buttons.length || !cards.length) return;

    const applyFilter = (filter) => {
        cards.forEach((card) => {
            const matches = filter === 'all' || card.dataset.category === filter;
            card.classList.toggle('is-hidden', !matches);
            card.setAttribute('aria-hidden', String(!matches));
        });

        requestAnimationFrame(() => {
            cards.forEach((card) => {
                if (card.classList.contains('is-hidden')) return;
                const canvas = card.querySelector('.project-canvas');
                if (!canvas) return;
                if (typeof canvas._init === 'function') canvas._init();
                if (typeof canvas._resize === 'function') canvas._resize();
            });
        });
    };

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            buttons.forEach((btn) => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            applyFilter(button.dataset.filter || 'all');
        });
    });
}

function setup3DModalTriggers() {
    document.querySelectorAll('.work-card-3d').forEach((card) => {
        const open = () => openModelModal(card.dataset.model);

        card.addEventListener('click', open);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initHeroCanvas();
    initModal();
    setupProjectCanvases();
    setupWorkFilters();
    setup3DModalTriggers();

    // Build the shared canvas textures ahead of time so the first toll-station
    // model does not stall while the user is scrolling.
    whenIdle(() => {
        getConcreteTexture();
        getAsphaltTexture();
    });
});


