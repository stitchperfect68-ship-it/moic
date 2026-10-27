import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Only render scenes that are actually on screen. Rendering every WebGL
// canvas at once was the main cause of scroll lag.
function observeVisibility(element, callback) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => callback(entry.isIntersecting));
    }, { rootMargin: '150px 0px' });
    observer.observe(element);
    return observer;
}

const MAX_PIXEL_RATIO = 1.5;

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

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Close nav when clicking links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Hero Canvas - Animated 3D highway
function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    
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
    
    // Create highway
    const roadGroup = new THREE.Group();
    
    // Main road
    const roadGeometry = new THREE.PlaneGeometry(40, 2);
    const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -1;
    roadGroup.add(road);
    
    // Road markings - dashed lines
    for (let i = -18; i < 20; i += 4) {
        const lineGeometry = new THREE.PlaneGeometry(2, 0.08);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(i, -0.99, 0);
        roadGroup.add(line);
    }
    
    // Edge barriers
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
    
    // Grid floor
    const gridHelper = new THREE.GridHelper(40, 40, 0xea580c, 0x1e293b);
    gridHelper.position.y = -1.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);
    
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible || document.hidden) return;
        time += 0.01;
        
        shapes.forEach((shape, i) => {
            shape.rotation.x += 0.008;
            shape.rotation.y += 0.008;
            shape.position.y = 1.8 + Math.sin(time + i) * 0.4;
        });
        
        camera.position.x = Math.sin(time * 0.1) * 1.5;
        camera.lookAt(0, 0, 0);
        
        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

// About Canvas - Toll plaza model
function initAboutCanvas() {
    const canvas = document.getElementById('about-canvas');
    if (!canvas) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    
    let isVisible = true;
    observeVisibility(canvas, (visible) => { isVisible = visible; });
    
    camera.position.z = 4;
    camera.position.y = 1.5;
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1;
    controls.enableZoom = false;
    controls.enablePan = false;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xff6b35, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const loader = new GLTFLoader();
    loader.load(
        '/assets/models/m3/scene.gltf',
        (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim;
            model.scale.multiplyScalar(scale);
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            scene.add(model);
        },
        undefined,
        (error) => {
            console.error('Error loading about model:', error);
            const group = new THREE.Group();
            const baseGeometry = new THREE.BoxGeometry(3, 0.1, 2);
            const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.y = -0.05;
            group.add(base);
            const pillarGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5);
            const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x333344 });
            for (let x = -1; x <= 1; x += 2) {
                for (let z = -0.5; z <= 0.5; z += 1) {
                    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
                    pillar.position.set(x, 0.75, z);
                    group.add(pillar);
                }
            }
            const roofGeometry = new THREE.BoxGeometry(2.5, 0.05, 1.5);
            const roofMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = 1.5;
            group.add(roof);
            scene.add(group);
        }
    );
    
    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible || document.hidden) return;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

// Project canvases
function initProjectCanvas(canvas, modelName) {
    if (!canvas) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    
    let isVisible = true;
    observeVisibility(canvas, (visible) => { isVisible = visible; });
    
    camera.position.z = 3.5;
    camera.position.y = 1.2;
    camera.lookAt(0, 0, 0);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1;
    controls.enableZoom = false;
    controls.enablePan = false;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xea580c, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const loader = new GLTFLoader();
    const modelPath = `/assets/models/${modelName}/scene.gltf`;
    
    loader.load(
        modelPath,
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
            scene.add(model);
        },
        undefined,
        (error) => {
            console.error('Error loading model:', modelName, error);
        }
    );
    
    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible || document.hidden) return;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        if (canvas.clientWidth === 0) return;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

// Contact Canvas
function initContactCanvas() {
    const canvas = document.getElementById('contact-canvas');
    if (!canvas) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    
    let isVisible = true;
    observeVisibility(canvas, (visible) => { isVisible = visible; });
    
    camera.position.z = 4;
    
    const group = new THREE.Group();
    
    // Create icosahedron
    const geometry = new THREE.IcosahedronGeometry(1.5, 0);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff6b35, 
        wireframe: true,
        transparent: true,
        opacity: 0.6
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    
    // Create smaller spheres
    for (let i = 0; i < 8; i++) {
        const sphereGeom = new THREE.SphereGeometry(0.05, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf7931e });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        const angle = (i / 8) * Math.PI * 2;
        sphere.position.set(Math.cos(angle) * 2, Math.sin(angle) * 2, 0);
        group.add(sphere);
    }
    
    scene.add(group);
    
    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible || document.hidden) return;
        group.rotation.x += 0.01;
        group.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

// Modal functionality
const MODAL_MODELS = {
    m3: 'Traffic Management Systems - Model 03',
    m6: 'Structural Elements - Model 06',
    m4: 'Infrastructure Component - Model 04'
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
    
    function animateModal() {
        requestAnimationFrame(animateModal);
        if (!modal.classList.contains('active') || document.hidden) return;
        modalControls.update();
        modalRenderer.render(modalScene, modalCamera);
    }
    animateModal();
    
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
    
    setModalStatus('Loading 3D model…');
    const loader = new GLTFLoader();
    loader.load(
        `/assets/models/${modelName}/scene.gltf`,
        (gltf) => {
            const template = prepareModalModel(gltf.scene);
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

// Initialize all canvases
document.addEventListener('DOMContentLoaded', () => {
    initHeroCanvas();
    initAboutCanvas();
    initContactCanvas();
    initModal();
    
    document.querySelectorAll('.project-canvas').forEach((canvas) => {
        const modelName = canvas.dataset.model;
        let initialized = false;
        const init = () => {
            if (initialized) return;
            initialized = true;
            initProjectCanvas(canvas, modelName);
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    init();
                    observer.disconnect();
                }
            });
        }, { rootMargin: '400px 0px' });
        observer.observe(canvas);
    });
    
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            openModelModal(card.dataset.model);
        });
    });
});
