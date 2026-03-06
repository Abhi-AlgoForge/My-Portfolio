import * as THREE from 'three';

// Module-level variable for scroll sync
let externalScroll = 0;

export function setScroll(val) {
    externalScroll = val;
}

// Helper for circular stars
function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

export function initScene() {
    const canvasContainer = document.getElementById('canvas-container');
    const uiContainer = document.getElementById('ui-container');
    const homeTextContainer = document.getElementById('home-text-container');
    const titleEl = document.getElementById('main-name');
    const heroTexts = document.querySelectorAll('.hero-text');

    // Reset UI
    canvasContainer.style.opacity = '1';
    titleEl.innerHTML = '';
    // Container opacity handled by main.js scroll, but we set initial state here
    // if (homeTextContainer) homeTextContainer.style.opacity = '1';

    // Ensure Title is Light (Slate 100)
    titleEl.style.color = '#f8fafc';
    // Removed glow per user request
    // titleEl.style.textShadow = '0 0 10px rgba(56, 189, 248, 0.5)';

    const scene = new THREE.Scene();
    scene.background = null;
    // FOG: Deep Navy (#020617) matches the gradient edges
    scene.fog = new THREE.Fog(0x020617, 30, 100);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Front View
    camera.position.set(0, 0, 28); // Zoomed in closer for HD/Wide screens

    // Standard Opaque Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    // Transparent clear color so CSS gradient shows through
    renderer.setClearColor(0x000000, 0);

    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly dimmer ambient
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); // Stronger directional for contrast
    dirLight.position.set(10, 30, 20);
    dirLight.position.set(10, 30, 20);
    dirLight.castShadow = false;
    scene.add(dirLight);






    // GALAXY STARFIELD (BACKGROUND)
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const posArray = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
        // Cylindrical distribution so they wrap around 360 degrees
        // Radius 60 to 120 (Camera is at z=45, so this surrounds it comfortably)
        const r = 60 + Math.random() * 60;
        const theta = Math.random() * Math.PI * 2; // Full circle

        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = (Math.random() - 0.5) * 200; // Tall vertical spread

        posArray[i * 3] = x;
        posArray[i * 3 + 1] = y;
        posArray[i * 3 + 2] = z;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const starsMaterial = new THREE.PointsMaterial({
        size: 0.5, // Slightly larger to see circle shape
        color: 0xffffff,
        map: createCircleTexture(),
        transparent: true,
        opacity: 0.4, // Fainter
        sizeAttenuation: true
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // MAIN NETWORK (HOME SECTION)
    const networkGroup = new THREE.Group();
    networkGroup.position.x = 0; // Center (Tip is at 0, grows to left)
    scene.add(networkGroup);

    // MESH
    const maxInstances = 800;
    const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.2,
        metalness: 0.5,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.2
    });
    const nodeMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, maxInstances);
    nodeMesh.castShadow = false;
    nodeMesh.receiveShadow = false;
    nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    networkGroup.add(nodeMesh);

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x38bdf8, // Back to Sky-400
        transparent: true,
        opacity: 0.5
    });
    const lineGeometry = new THREE.BufferGeometry();
    const maxLines = 4000; // Pre-allocate for performance
    const linePositions = new Float32Array(maxLines * 2 * 3); // 2 vertices per line, 3 coords per vertex
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    lines.frustumCulled = false;
    networkGroup.add(lines);

    const nodes = [];

    // Config for Cone
    const tipX = 0;
    const tipY = 0;
    const tipZ = 0;
    const length = 25; // Shorter cone
    const maxSpread = 20;

    function setupMesh() {
        const width = window.innerWidth;
        const isMobile = width < 768; // Mobile breakpoint


        // Responsive Configuration
        let spreadX, spreadY, spreadZ, labelCount, dotCount;

        if (isMobile) {
            spreadX = 40;
            spreadY = 50;
            spreadZ = 30;
            labelCount = 12;
            dotCount = 40;
        } else {
            // Standard Desktop - Expanded to reduce clutter without removing nodes
            spreadX = 160;
            spreadY = 110;
            spreadZ = 80;
            labelCount = 20;
            dotCount = 65; // Increased non-labeled dots significantly
        }

        nodes.length = 0;
        const oldLabels = document.querySelectorAll('.node-label');
        oldLabels.forEach(el => el.remove());

        const addNode = (x, y, z, isLabel, element, text) => {
            const coneVec = new THREE.Vector3(x, y, z);
            const cloudVec = new THREE.Vector3(
                (Math.random() - 0.5) * spreadX, // Random around 0
                (Math.random() - 0.5) * spreadY,
                (Math.random() - 0.5) * spreadZ
            );
            // Ensure startVec is also centered if it was skewed. 
            // It uses x,y,z passed from setup logic.
            const startVec = new THREE.Vector3(x, y, z);
            const delay = ((x + length) / length) * 3.0; // Slower entrance (3s max)

            nodes.push({
                conePos: coneVec.clone(),
                cloudPos: cloudVec.clone(),
                currentPos: startVec.clone(),
                finalPos: coneVec.clone(),
                delay: delay,
                isLabel: isLabel,
                element: element,
                active: false
            });
        };

        // --- RESTORED CONE DISTRIBUTION LOGIC ---
        addNode(tipX, tipY, tipZ, false, null); // Tip

        const wordList = [
            "Python", "JavaScript", "TypeScript", "C++", "Java", "Go", "Rust", "SQL",
            "React", "Vue", "Svelte", "Angular", "Node.js", "Express", "Django", "Flask",
            "FastAPI", "GraphQL", "REST API", "WebSockets", "Three.js", "WebGL", "HTML5", "CSS3",
            "Tailwind", "Bootstrap", "Vite", "NumPy", "Pandas", "Scikit-learn", "TensorFlow",
            "PyTorch", "Jupyter", "Spark", "NLP", "LLMs", "Generative AI", "Data Mining",
            "Visualization", "Git", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux",
            "Nginx", "CI/CD", "Jenkins", "Terraform", "Ansible", "Bash", "Serverless",
            "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "NoSQL", "ORM",
            "Algorithms", "Data Structures", "System Design", "Design Patterns", "Security",
            "Auth", "Testing", "TDD", "Agile", "Scrum", "Performance", "Debugging", "Architecture",
            "Freelancer", "Full Stack", "Backend", "Frontend", "Bot Dev", "Web Scraping",
            "Scrapy", "Selenium", "Puppeteer", "IOT", "Arduino", "Raspberry Pi", "Problem Solving"
        ];

        // Shuffle
        for (let i = wordList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wordList[i], wordList[j]] = [wordList[j], wordList[i]];
        }

        const selectedWords = wordList.slice(0, labelCount);

        selectedWords.forEach((text, i) => {
            let t;
            if (i < 3) {
                // Hero labels at the wide bottom base of the cone (t near 1.0)
                t = 0.85 + Math.random() * 0.15;
            } else {
                // Bias all labels heavily toward the wide base (t=1.0) instead of the pointy tip (t=0.0)
                t = 1.0 - (Math.pow(Math.random(), 2.0) * 0.9);
            }

            const x = tipX - (t * length);
            const maxR = t * maxSpread;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * maxR;
            const y = tipY + Math.cos(angle) * r;
            const z = tipZ + Math.sin(angle) * r;

            const div = document.createElement('div');
            div.className = 'node-label';
            div.textContent = text;
            div.style.opacity = '0';

            // Attach to LABELS LAYER (Fixed)
            // ensuring labels stay with the 3D scene and are visible (z-index 1)
            const labelsLayer = document.getElementById('labels-layer');
            if (labelsLayer) labelsLayer.appendChild(div);

            addNode(x, y, z, true, div, text);
        });

        // Filler Dots
        for (let i = 0; i < dotCount; i++) {
            // Bias filler dots heavily toward the wide base of the cone (t=1.0) instead of the pointy tip
            let t = 1.0 - (Math.pow(Math.random(), 2.5) * 0.95);
            t = Math.max(0.05, Math.min(1.0, t));
            const x = tipX - (t * length);
            const maxR = t * maxSpread;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * maxR;
            const y = tipY + Math.cos(angle) * r;
            const z = tipZ + Math.sin(angle) * r;
            addNode(x, y, z, false, null);
        }
    }

    setupMesh();

    const clock = new THREE.Clock();
    let typeWriterStarted = false;
    const dummyObj = new THREE.Object3D();

    function adjustCameraSettings() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        let targetZ = 45;
        if (aspect < 1.0) {
            // Portrait: Keep closer (45) so it looks big and overflows 
            targetZ = 45;
        } else {
            targetZ = 45;
        }

        // Keep it stable
        return targetZ;
    }

    let baseDistance = adjustCameraSettings();

    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();

        // Sync Camera Parallax with Scroll
        // Move camera X from 0 to 20 as scroll goes 0 to 1
        const targetCamX = 0; // DISABLED PANNING
        camera.position.x += (targetCamX - camera.position.x) * 0.05;

        // Responsive Base Z using calculated baseDistance
        const baseZ = baseDistance;
        // Stable Z
        camera.position.z = baseZ;

        if (networkGroup) {
            // ALWAYS VISIBLE
            networkGroup.visible = true;

            // Continuous rotation
            networkGroup.rotation.x = time * 0.1;
        }

        if (starField) {
            starField.rotation.y += 0.0003; // Slow rotation
        }

        // Calculate Expansion Factor (Morph)
        // 0.0 -> 0.05: Pure Cone (0% Expansion)
        // 0.05 -> 0.85: Transition to Cloud (0% -> 100%) - Increased speed to finish by About (1.0)
        let morphFactor = (externalScroll - 0.05) * 1.2;
        morphFactor = Math.max(0, Math.min(1, morphFactor));

        // On mobile, force the net to be fully expanded instantly
        if (window.innerWidth <= 768) {
            morphFactor = 1.0;
        }

        let activeCount = 0;
        const entranceSpeed = 0.8;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const activationTime = node.delay;
            let progress = 0;

            if (time >= activationTime) {
                node.active = true;
                progress = Math.min((time - activationTime) / entranceSpeed, 1.0);
                const ease = 1 - Math.pow(1 - progress, 3);

                // --- POSITION LOGIC (Clean, No Fly-in) ---
                // Position depends ONLY on Scroll (Morph), not animation time.
                node.currentPos.lerpVectors(node.conePos, node.cloudPos, morphFactor);

                dummyObj.position.copy(node.currentPos);

                // --- DYNAMIC SCALE ANIMATION ---
                // Pop in by scaling from 0 to 1. Fixed flat scale of 1.0 baseline.
                const responsiveNodeScale = 1.0;
                const finalEase = ease * responsiveNodeScale;

                dummyObj.scale.set(finalEase, finalEase, finalEase);

                dummyObj.updateMatrix();
                nodeMesh.setMatrixAt(i, dummyObj.matrix);
                activeCount++;
            } else {
                dummyObj.position.set(9999, 9999, 9999);
                dummyObj.updateMatrix();
                nodeMesh.setMatrixAt(i, dummyObj.matrix);
            }
        }
        nodeMesh.count = nodes.length;
        nodeMesh.instanceMatrix.needsUpdate = true;

        // Update Labels
        networkGroup.updateMatrixWorld();

        nodes.forEach((node, i) => {
            if (node.active && node.isLabel && node.element) {
                const worldPos = node.currentPos.clone().applyMatrix4(networkGroup.matrixWorld);
                // Simple cull if far offscreen
                const projected = worldPos.clone().project(camera);

                if (projected.x > 1.2 || projected.x < -1.2 || projected.z > 1.0) {
                    node.element.style.opacity = '0';
                } else {
                    const x = (projected.x * .5 + .5) * window.innerWidth;
                    const y = (-(projected.y * .5) + .5) * window.innerHeight;

                    // --- ROBUST 3D DISTANCE SCALING ---
                    // By directly inversely scaling by physical 3D distance, we guarantee
                    // that background nodes shrink appropriately relative to the foreground,
                    // preserving true 3D depth perception.
                    const dist = camera.position.distanceTo(worldPos);

                    // 35 is our baseline depth where labels render at 1x CSS font scale.
                    let scale = 35 / dist;

                    // Removed diagonal scaling metric completely.

                    // Clamp absolute scale limits to prevent labels from completely vanishing
                    // or exploding in the user's face.
                    scale = Math.max(0.35, Math.min(1.6, scale));

                    let zIndex = 0;

                    // Foreground Boost
                    if (worldPos.z > -2) {
                        scale *= 1.2;
                        zIndex = 100;
                        node.element.style.opacity = '1';
                    } else {
                        zIndex = 10;
                        node.element.style.opacity = '0.7';
                    }

                    node.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
                    node.element.style.zIndex = zIndex;
                }
            }
        });

        // Update Lines - REMOVED THROTTLING for smoothness per user request
        updateLinesRobust();

        if (time > 2.8 && !typeWriterStarted) {
            typeWriterStarted = true;

            // Set content immediately with reveal class
            titleEl.innerHTML = 'Abhi-<span style="color: #fb923c">AlgoForge</span>';
            titleEl.classList.add('reveal-text');

            // 1. Reveal Text Wrapper (Smooth fade in) & Dots (Synced)
            setTimeout(() => {
                const innerWrapper = document.querySelector('.home-text-inner');
                if (innerWrapper) innerWrapper.classList.add('inner-show');

                const dotsContainer = document.querySelector('.bg-dots-container');
                if (dotsContainer) dotsContainer.classList.add('dots-show');
            }, 100);
        }

        renderer.render(scene, camera);
    }

    function updateLinesRobust() {
        // Zero-allocation update using pre-allocated buffer
        const positions = lineGeometry.attributes.position.array;
        let vertexIndex = 0;

        // Dynamic connect distance
        let morphFactor = (externalScroll - 0.05) * 0.8;
        morphFactor = Math.max(0, Math.min(1, morphFactor));

        const connectDistance = THREE.MathUtils.lerp(7, 18, morphFactor);
        const connectDistSq = connectDistance * connectDistance;

        for (let i = 0; i < nodes.length; i++) {
            if (!nodes[i].active) continue;

            for (let j = i + 1; j < nodes.length; j++) {
                if (!nodes[j].active) continue;

                const distSq = nodes[i].currentPos.distanceToSquared(nodes[j].currentPos);
                if (distSq < connectDistSq) {
                    // Check buffer overflow
                    if (vertexIndex >= positions.length) break;

                    positions[vertexIndex++] = nodes[i].currentPos.x;
                    positions[vertexIndex++] = nodes[i].currentPos.y;
                    positions[vertexIndex++] = nodes[i].currentPos.z;

                    positions[vertexIndex++] = nodes[j].currentPos.x;
                    positions[vertexIndex++] = nodes[j].currentPos.y;
                    positions[vertexIndex++] = nodes[j].currentPos.z;
                }
            }
        }

        lineGeometry.setDrawRange(0, vertexIndex / 3); // Update draw range
        lineGeometry.attributes.position.needsUpdate = true;
    }

    // Typewriter removed in favor of CSS reveal


    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        baseDistance = adjustCameraSettings();
        setupMesh();
    });
}
