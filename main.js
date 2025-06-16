// import * as THREE from 'three';
// import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
// import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
// import gsap from 'gsap';

// // Scene setup
// const scene = new THREE.Scene();
// scene.background = new THREE.Color('#FFE4E1');

// const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// camera.position.set(0, 5, 20);

// const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('canvas') });
// renderer.setSize(window.innerWidth, window.innerHeight);

// scene.add(new THREE.AmbientLight(0xffffff, 0.8));
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
// directionalLight.position.set(10, 20, 10);
// scene.add(directionalLight);

// let textMesh, stringMesh;
// const ceilingY = 15;
// renderer.shadowMap.enabled = true;
// directionalLight.castShadow = true;
// const loader = new FontLoader();
// loader.load('/fonts/helvetiker_regular.typeface.json', function (font) {
//     const textGeometry = new TextGeometry('H', {
//         font: font,
//         size: 3,
//         height: 0.5,
//         curveSegments: 20,
//         bevelEnabled: true,
//         bevelThickness: 0.15,
//         bevelSize: 0.08,
//         bevelSegments: 10
//     });

//     textGeometry.computeBoundingBox();
//     const centerOffset = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
//     textGeometry.translate(centerOffset, 0, 0);

//     const textureLoader = new THREE.TextureLoader();
//     const grassTexture = textureLoader.load('/textures/grass.jpg');

//     const material = new THREE.MeshStandardMaterial({
//         map: grassTexture,
//         roughness: 0.8,
//         metalness: 0.1
//     });

//     textMesh = new THREE.Mesh(textGeometry, material);
//     scene.add(textMesh);

//     // Initial position
//     textMesh.position.y = ceilingY;

//     // Create initial placeholder tube string
//     const curve = new THREE.CatmullRomCurve3([
//         new THREE.Vector3(-0.1, ceilingY, 0),
//         new THREE.Vector3(-0.1, textMesh.position.y + 1, 0),
//     ]);

//     const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
//     const tubeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
//     stringMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
//     scene.add(stringMesh);

//     // Animate drop
//     gsap.to(textMesh.position, {
//         y: 0,
//         duration: 1.8,
//         ease: "bounce.out"
//     });
// });

// function updateString() {
//     if (!stringMesh) return;

//     // Swing factor (adds realistic side movement)
//     const swing = 0.1 * Math.sin(Date.now() * 0.002);

//     // Apply swing to text as well
//     textMesh.position.x = -0.1 + swing;

//     const curve = new THREE.CatmullRomCurve3([
//         new THREE.Vector3(-0.1, ceilingY, 0),
//         new THREE.Vector3(-0.1 + swing, (textMesh.position.y + ceilingY) / 2, 0),
//         new THREE.Vector3(-0.1 + swing, textMesh.position.y + 1, 0)
//     ]);

//     stringMesh.geometry.dispose();
//     stringMesh.geometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
// }

// function animate() {
//     requestAnimationFrame(animate);
//     if (textMesh) updateString();
//     renderer.render(scene, camera);
// }
// animate();


import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import gsap from 'gsap';
import SimplexNoise from 'simplex-noise';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#FFE4E1');

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

let textMesh, stringMesh, knotMesh;
const ceilingY = 15;
const textureLoader = new THREE.TextureLoader();
const simplex = new SimplexNoise();

// Group to move text and branch together
let textGroup = new THREE.Group();
scene.add(textGroup);

// Load textures
const barkTexture = textureLoader.load('/textures/bark.jpg', (texture) => {
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});
const grassTexture = textureLoader.load('/textures/grass.jpg');

// Load font and build text
const loader = new FontLoader();
loader.load('/fonts/helvetiker_regular.typeface.json', function (font) {
    const textGeometry = new TextGeometry('H', {
        font: font,
        size: 3,
        height: 0.5,
        curveSegments: 20,
        bevelEnabled: true,
        bevelThickness: 0.15,
        bevelSize: 0.08,
        bevelSegments: 10
    });

    textGeometry.computeBoundingBox();
    const centerOffset = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
    textGeometry.translate(centerOffset, 0, 0);

    const material = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 0.8,
        metalness: 0.2
    });

    textMesh = new THREE.Mesh(textGeometry, material);
    textMesh.castShadow = true;
    textGroup.add(textMesh);
    textMesh.position.y = 0;  // relative to group

    generateProceduralBranch();
    generateWrappingKnot();

    // Animate the whole group
    textGroup.position.y = ceilingY;

    gsap.fromTo(textGroup.position, 
        { y: ceilingY }, 
        { 
            y: 0,
            duration: 1.2,
            ease: "power2.in",
            onComplete: () => {
                spawnLeafParticles();  // launch leaves on impact
                startRealisticWobble();
            }
        }
    );

    // WOBBLE FUNCTION
    function startRealisticWobble() {
        const initialX = (Math.random() - 0.5) * 0.4;  // random tilt direction
        const initialZ = (Math.random() - 0.5) * 0.4;

        gsap.fromTo(textGroup.rotation, 
            { x: initialX, z: initialZ }, 
            { 
                x: 0, z: 0,
                duration: 2,
                ease: "elastic.out(1, 0.3)"
            });
    }

});

// Spawn leaf particles on impact
function spawnLeafParticles() {
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide });
    for (let i = 0; i < 30; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), leafMaterial);
        leaf.position.copy(textGroup.position);
        scene.add(leaf);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        const vx = Math.cos(angle) * speed;
        const vz = Math.sin(angle) * speed;
        const vy = Math.random() * 2 + 1;

        gsap.to(leaf.position, {
            x: leaf.position.x + vx,
            y: leaf.position.y + vy,
            z: leaf.position.z + vz,
            duration: 0.8,
            ease: "power3.out",
            onComplete: () => {
                // gravity drop after burst
                gsap.to(leaf.position, {
                    y: 0,
                    duration: 1.2,
                    ease: "bounce.out"
                });
            }
        });

        gsap.to(leaf.rotation, {
            x: Math.random() * Math.PI,
            y: Math.random() * Math.PI,
            z: Math.random() * Math.PI,
            duration: 2
        });
    }
}


// Create procedural branch
function generateProceduralBranch() {
    const points = [
        new THREE.Vector3(-0.1, ceilingY, 0),
        new THREE.Vector3(-0.1, ceilingY - 4, 0),
        new THREE.Vector3(-0.1, 0, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 60, 0.12, 16, false);
    const posAttr = geometry.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const noise = simplex.noise3D(x * 0.5, y * 0.5, z * 0.5) * 0.08;
        posAttr.setXYZ(i, x + noise, y + noise, z + noise);
    }
    posAttr.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
        map: barkTexture,
        color: 0x8B4513,  // same as knot color
        roughness: 0.9,
        metalness: 0.1
    });

    stringMesh = new THREE.Mesh(geometry, material);
    stringMesh.castShadow = true;
    textGroup.add(stringMesh);  // important: add to group
}

// Create wrapping knot
function generateWrappingKnot() {
    const knotPoints = [];
    const loops = 3;
    const baseRadius = 0.5;
    const verticalHeight = 2.5;
    const centerZ = -0.15; 

    for (let i = 0; i <= 600; i++) {
        const t = i / 600;
        const angle = loops * Math.PI * 2 * t;
        const x = baseRadius * Math.cos(angle);
        const y = baseRadius * Math.sin(angle);
        const z = centerZ + (t - 0.5) * verticalHeight;
        knotPoints.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(knotPoints);
    const geometry = new THREE.TubeGeometry(curve, 800, 0.08, 20, false);
    const posAttr = geometry.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
        const noise = simplex.noise3D(v.x, v.y, v.z) * 0.04;
        v.x += noise;
        v.y += noise;
        posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    posAttr.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
        map: barkTexture,
        color: 0x8B4513,
        roughness: 0.9,
        metalness: 0.1
    });

    knotMesh = new THREE.Mesh(geometry, material);
    knotMesh.castShadow = true;

    knotMesh.rotation.z = 1 / 2;
    knotMesh.position.set(0.1, 1.5, 0.1);

    textGroup.add(knotMesh);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
