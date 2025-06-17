import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import gsap from 'gsap';
import SimplexNoise from 'simplex-noise';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color("#4CAF50");

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

// Loading textures
const barkTexture = textureLoader.load('/textures/bark.jpg', (texture) => {
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});
const grassTexture = textureLoader.load('/textures/grass.jpg');
const grassBumpTexture = textureLoader.load('/textures/grass-bump.jpg');
const leafTexture = textureLoader.load('/textures/falling_leaves.webp');

// Realistic Ground
const groundGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
const groundMat = new THREE.MeshStandardMaterial({ map: grassTexture, bumpMap: grassBumpTexture, bumpScale: 0.4, roughness: 0.9, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Displace ground for bumps
const groundPos = ground.geometry.attributes.position;
for (let i = 0; i < groundPos.count; i++) {
    const x = groundPos.getX(i);
    const z = groundPos.getZ(i);
    const noise = simplex.noise2D(x * 0.1, z * 0.1) * 1.5;
    groundPos.setY(i, noise);
}
groundPos.needsUpdate = true;
ground.geometry.computeVertexNormals();

function createLeafShape() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.15, 0.3, 0, 0.6);
    shape.quadraticCurveTo(-0.15, 0.3, 0, 0);
    return shape;
}

function createLeafMesh() {
    const shape = createLeafShape();
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
}

function spawnLeafParticles(position) {
    for (let i = 0; i < 30; i++) {
        const leaf = createLeafMesh();
        leaf.position.copy(position);
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
                gsap.to(leaf.position, { y: 0, duration: 1.2, ease: "bounce.out" });
            }
        });

        gsap.to(leaf.rotation, { x: Math.random() * Math.PI, y: Math.random() * Math.PI, z: Math.random() * Math.PI, duration: 2 });
    }
}

function generateProceduralBranch(group) {
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

    const material = new THREE.MeshStandardMaterial({ map: barkTexture, color: 0x8B4513, roughness: 0.9, metalness: 0.1 });

    stringMesh = new THREE.Mesh(geometry, material);
    stringMesh.castShadow = true;
    group.add(stringMesh);
}

function generateWrappingKnot(group) {
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

    const material = new THREE.MeshStandardMaterial({ map: barkTexture, color: 0x8B4513, roughness: 0.9, metalness: 0.1 });

    knotMesh = new THREE.Mesh(geometry, material);
    knotMesh.castShadow = true;
    knotMesh.rotation.z = 1 / 2;
    knotMesh.position.set(0.1, 1.5, 0.1);
    group.add(knotMesh);
}

function animateAlive(letter) {
    // Small periodic movement
    gsap.to(letter.rotation, { 
        x: Math.sin(Math.random()) * 0.05, 
        y: Math.sin(Math.random()) * 0.05, 
        z: Math.sin(Math.random()) * 0.05, 
        repeat: -1, 
        yoyo: true, 
        duration: 2 
    });
}

function addWord(text, yPosition) {
    const loader = new FontLoader();

    loader.load('/fonts/helvetiker_regular.typeface.json', function (font) {
        const phrase = text;
        const letterSpacing = 3.5;
        const startX = -((phrase.replace(/ /g, '').length - 1) * letterSpacing) / 2;

        let letterIndex = 0;

        for (let i = 0; i < phrase.length; i++) {
            const char = phrase[i];
            if (char === ' ') continue;

            const textGeometry = new TextGeometry(char, {
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

            const singleLetterGroup = new THREE.Group();
            singleLetterGroup.name = `letter-${char}`; // <- ADD THIS
            scene.add(singleLetterGroup);

            const text = new THREE.Mesh(textGeometry, material);
            text.castShadow = true;
            text.position.y = 0;
            singleLetterGroup.add(text);

            generateProceduralBranch(singleLetterGroup);
            generateWrappingKnot(singleLetterGroup);
            animateAlive(singleLetterGroup);

            singleLetterGroup.position.x = startX + letterIndex * letterSpacing;
            singleLetterGroup.position.y = ceilingY + yPosition;

            gsap.fromTo(singleLetterGroup.position,
                { y: ceilingY + yPosition },
                {
                    y: yPosition,
                    duration: 1.2,
                    delay: letterIndex * 0.2,
                    ease: "power2.in",
                    onComplete: () => {
                        spawnLeafParticles(singleLetterGroup.position);
                        startRealisticWobble(singleLetterGroup);
                    }
                }
            );

            function startRealisticWobble(group) {
                const initialX = (Math.random() - 0.5) * 0.4;
                const initialZ = (Math.random() - 0.5) * 0.4;

                gsap.fromTo(group.rotation,
                    { x: initialX, z: initialZ },
                    { x: 0, z: 0, duration: 2, ease: "elastic.out(1, 0.3)" }
                );
            }
            letterIndex++;
        }
    });
}

function cutAndRelocateLetters(text, lettersToDrop, delay = 5) {
    lettersToDrop.forEach((letter, idx) => {
        const group = scene.getObjectByName(`letter-${letter.toUpperCase()}`);

        if (group) {
            // find nearby birthday
            const birthdayLetters = scene.children.filter((child) =>
                child.name.startsWith("letter-") &&
                "BIRTHDAY".includes(child.name.split("-")[1]) &&
                child !== group
            );

            if (birthdayLetters.length > 0) {
                const target = birthdayLetters[Math.floor(Math.random() * birthdayLetters.length)];

                // move toward birthday instead of downward drop
                gsap.to(group.position, {
                    x: target.position.x + (Math.random() - 0.5) * 1,
                    y: target.position.y,
                    z: target.position.z + (Math.random() - 0.5) * 1,
                    duration: 2,
                    delay: delay + idx * 0.5,
                    ease: "power2.inOut",
                    onStart: () => {
                        // adding a little spin during move
                        gsap.to(group.rotation, { 
                            x: Math.random() * Math.PI, 
                            y: Math.random() * Math.PI, 
                            z: Math.random() * Math.PI, 
                            duration: 2, 
                            ease: "power2.inOut" 
                        });
                    }
                });
            }
        }
    });
}


// Untie knots
function untieKnots(letters, delay = 0) {
    letters.forEach((letter, idx) => {
        const group = scene.getObjectByName(`letter-${letter.toUpperCase()}`);

        if (group) {
            const knot = group.children.find((child) => child.geometry && child.geometry.attributes?.position?.count > 500);
            if (knot) {
                // Animate knot upward and fade it
                gsap.to(knot.position, { 
                    y: knot.position.y + 2, 
                    duration: 1.5, 
                    delay: delay + idx * 0.5, 
                    ease: "power2.out",
                    onComplete: () => {
                        group.remove(knot);
                        knot.geometry.dispose();
                        knot.material.dispose();
                    }
                });

                // Fade material
                gsap.to(knot.material, { 
                    opacity: 0, 
                    duration: 1.5, 
                    delay: delay + idx * 0.5,
                    ease: "power2.out",
                    onStart: () => { knot.material.transparent = true }
                });
            }
        }
    });
}

// cut A and Y
setTimeout(function(){
    // 1. Untie first
    untieKnots(['A', 'Y'], 2);
    
    // 2. After untying, cut and move letters
    cutAndRelocateLetters("HAPPY", ['A', 'Y'], 4);
}, 4000);


function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();


// Finally, add both words to the scene:
addWord("HAPPY", 5);
addWord("BIRTHDAY", 0);
