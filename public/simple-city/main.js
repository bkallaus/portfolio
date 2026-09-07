/**
 * POP CITY - MASTER ENGINE
 * Phase 1-7 Integrated
 */

// --- 1. CONFIGURATION ---
const CONFIG = {
    gridSize: 10,        // 10x10 Grid
    tileSize: 1.2,       // Spacing between buildings
    tickRate: 1500,      // Speed of the game (ms)
    cameraDist: 7       // Zoom level - Increased for larger grid
};

// --- 2. SCENE SETUP (THREE.JS) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue

// Orthographic Camera for Isometric View
const aspect = window.innerWidth / window.innerHeight;
const d = CONFIG.cameraDist;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

// The "True Isometric" Angle: Look from corner
camera.position.set(20, 20, 20);
camera.lookAt(scene.position);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable Shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Accessibility
renderer.domElement.setAttribute('role', 'application');
renderer.domElement.setAttribute('aria-label', 'Pop City Game Board');
renderer.domElement.tabIndex = 0;

document.body.appendChild(renderer.domElement);

// --- CONTROLS ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.mouseButtons = {
    LEFT: null, // Reserved for game interaction
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE
};
controls.minZoom = 0.5;
controls.maxZoom = 2;
controls.enableZoom = false; // Disable zoom to allow page scrolling

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(10, 20, 0); // Sun angle
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

// --- 3. ASSETS & FACTORY (VISUALS) ---

// --- TEXTURE FACTORY ---
const TextureFactory = {
    createCanvas: function (width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    },

    createTexture: function (drawFn) {
        const canvas = this.createCanvas(256, 256);
        const ctx = canvas.getContext('2d');
        drawFn(ctx, 256, 256);
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter; // Keep it crisp
        return tex;
    },

    // 1. Basic Grid (High Tech)
    grid: function (bgColor, lineColor) {
        return this.createTexture((ctx, w, h) => {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, w, h);

            // Hex/Tech Pattern
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            const step = 32;
            for(let y=0; y<h; y+=step) {
                for(let x=0; x<w; x+=step) {
                    if ((x+y)% (step*2) === 0) {
                        ctx.fillRect(x, y, step, step);
                    }
                }
            }

            // Main Grid
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 6;
            for (let i = 64; i < w; i += 64) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, h);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(w, i);
                ctx.stroke();
            }

            // Glowing centers
            ctx.fillStyle = "#ffffff";
            ctx.globalAlpha = 0.5;
            ctx.fillRect(w/2 - 20, h/2 - 20, 40, 40);
            ctx.globalAlpha = 1.0;

            // Border
            ctx.strokeRect(0, 0, w, h);
        });
    },

    // 2. Residential (Door + Windows)
    residential: function (wallColor, windowColor) {
        return this.createTexture((ctx, w, h) => {
            // Wall Base
            ctx.fillStyle = wallColor;
            ctx.fillRect(0, 0, w, h);

            // Add subtle noise
            ctx.fillStyle = "rgba(0,0,0,0.05)";
            for(let i=0; i<1000; i++) {
                ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
            }

            // Windows
            const cols = 2;
            const rows = 3;
            const padX = 30;
            const padY = 30;
            const winW = (w - (padX * (cols + 1))) / cols;
            const winH = (h - 100 - (padY * (rows + 1))) / rows; // Reserve bottom 100 for door

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = padX + c * (winW + padX);
                    const wy = padY + r * (winH + padY);

                    // Frame
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(wx - 4, wy - 4, winW + 8, winH + 8);

                    // Glass
                    ctx.fillStyle = windowColor;
                    ctx.fillRect(wx, wy, winW, winH);

                    // Reflection/Detail
                    ctx.fillStyle = "rgba(255,255,255,0.3)";
                    ctx.fillRect(wx, wy, winW, winH/2);
                }
            }

            // Door (Bottom Center)
            const doorW = 60;
            const doorH = 90;
            const dx = (w - doorW) / 2;
            const dy = h - doorH;

            // Door Frame
            ctx.fillStyle = "#5d4037";
            ctx.fillRect(dx - 5, dy - 5, doorW + 10, doorH + 5);

            ctx.fillStyle = "#3e2723"; // Dark Wood
            ctx.fillRect(dx, dy, doorW, doorH);

            // Knob
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(dx + doorW - 10, dy + doorH/2, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    // 3. Commercial (Stripes/Glass)
    commercial: function (baseColor, glassColor) {
        return this.createTexture((ctx, w, h) => {
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, w, h);

            // Glass Curtain Wall
            const rows = 6;
            const cols = 4;
            const gap = 10;
            const winW = (w - gap * (cols + 1)) / cols;
            const winH = (h - gap * (rows + 1)) / rows;

            for(let r=0; r<rows; r++){
                for(let c=0; c<cols; c++){
                    const wx = gap + c*(winW+gap);
                    const wy = gap + r*(winH+gap);

                    // Gradient Glass
                    const grd = ctx.createLinearGradient(wx, wy, wx, wy+winH);
                    grd.addColorStop(0, glassColor);
                    grd.addColorStop(1, "#37474f"); // Darker at bottom

                    ctx.fillStyle = grd;
                    ctx.fillRect(wx, wy, winW, winH);
                }
            }
        });
    },

    // 4. Ground (Paved/Grass)
    ground: function () {
        return this.createTexture((ctx, w, h) => {
            ctx.fillStyle = "#88cc88"; // Grass Base
            ctx.fillRect(0, 0, w, h);

            // Noise / Texture
            ctx.fillStyle = "#7abf7a"; // Slightly darker
            for (let i = 0; i < 400; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const s = Math.random() * 6 + 2;
                ctx.fillRect(x, y, s, s);
            }

            // Border (Grid Line)
            ctx.strokeStyle = "#6fb56f";
            ctx.lineWidth = 16;
            ctx.strokeRect(0, 0, w, h);
        });
    },

    // 5. Road (Asphalt)
    road: function () {
        return this.createTexture((ctx, w, h) => {
            // Asphalt Base
            ctx.fillStyle = "#555555";
            ctx.fillRect(0, 0, w, h);

            // Noise
            ctx.fillStyle = "#666666";
            for (let i = 0; i < 500; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const s = Math.random() * 3 + 1;
                ctx.fillRect(x, y, s, s);
            }

            // Lane Markings (Dashed White Line)
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 8;
            ctx.setLineDash([20, 20]);
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
            ctx.stroke();
            ctx.setLineDash([]); // Reset

            // Cross street hint (horizontal light line)
            ctx.strokeStyle = "#666666";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            // Border
            ctx.strokeStyle = "#444444";
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, w, h);
        });
    }
};

// Color Palette
const PALETTE = [
    0xff6b6b, // T1: Red
    0x4ecdc4, // T2: Teal
    0xffd93d, // T3: Yellow
    0x1a535c, // T4: Dark Teal
    0xff9f43, // T5: Orange
    0x5f27cd, // T6: Purple
    0x54a0ff, // T7: Light Blue
    0x2e86de, // T8: Darker Blue
    0xee5253, // T9: Red-Orange
    0xfeca57  // T10: Gold
];

// Material Factory
function createPlasticMat(colorHex) {
    // Reuse via getMaterial
    return getMaterial('standard', {
        color: colorHex,
        roughness: 0.3,
        metalness: 0.1,
        flatShading: true
    });
}

// --- ASSET MANAGEMENT ---
const ASSETS = {
    textures: {},
    geometries: {},
    materials: {}
};

// Initialize common geometries
ASSETS.geometries.box = new THREE.BoxGeometry(1, 1, 1);
ASSETS.geometries.cylinder = new THREE.CylinderGeometry(1, 1, 1, 16); // Base, will be scaled
ASSETS.geometries.cone = new THREE.ConeGeometry(0.6, 0.4, 4);
ASSETS.geometries.torus = new THREE.TorusGeometry(0.3, 0.05, 16, 16);
ASSETS.geometries.plane = new THREE.PlaneGeometry(1, 1);

function getMaterial(type, params) {
    const key = `${type}_${JSON.stringify(params)}`;
    if (!ASSETS.materials[key]) {
        if (type === 'standard') {
            ASSETS.materials[key] = new THREE.MeshStandardMaterial(params);
        } else if (type === 'basic') {
            ASSETS.materials[key] = new THREE.MeshBasicMaterial(params);
        }
    }
    return ASSETS.materials[key];
}

// The Procedural Building Generator
function createBuildingMesh(tier) {
    // Clamp tier to 1-10
    const t = Math.min(Math.max(tier, 1), 10);

    // Generate or Fetch Texture
    if (!ASSETS.textures[t]) {
        const colorHex = PALETTE[t - 1];
        const colorStr = '#' + colorHex.toString(16).padStart(6, '0');

        if (t === -1) {
            ASSETS.textures[t] = TextureFactory.road();
        } else if (t === -2) {
             // Nature / Obstacle (No texture needed, using materials)
        } else if (t <= 3) {
            ASSETS.textures[t] = TextureFactory.residential(colorStr, '#feffdf'); // Light Yellow Windows
        } else if (t <= 6) {
            ASSETS.textures[t] = TextureFactory.commercial(colorStr, '#e0f7fa'); // Cyan Glass
        } else {
            ASSETS.textures[t] = TextureFactory.grid(colorStr, '#ffffff'); // High tech white lines
        }
    }

    if (t === -1) {
        // Road Mesh (Flat plane slightly above ground)
        const roadMat = getMaterial('standard', {
            map: ASSETS.textures[t],
            roughness: 0.9,
            metalness: 0.0
        });

        // Reuse box geometry, scale it
        const mesh = new THREE.Mesh(ASSETS.geometries.box, roadMat);
        mesh.scale.set(1, 0.05, 1);
        mesh.position.y = 0.025;
        mesh.receiveShadow = true;
        return mesh;
    }

    if (t === -2) {
        // Nature Obstacle (Rock)
        const group = new THREE.Group();

        // Rock Geometry & Material (matching generateEnvironment logic)
        const rockGeo = new THREE.DodecahedronGeometry(0.5);
        const rockMat = getMaterial('standard', { color: 0x888888, roughness: 0.6, flatShading: true });

        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.position.y = 0.25; // slightly above ground

        // Random scale variation
        rock.scale.set(1 + Math.random(), 0.5 + Math.random()*0.5, 1 + Math.random());

        group.add(rock);

        // Random slight rotation/scale for variety
        group.rotation.y = Math.random() * Math.PI * 2;
        const s = 0.8 + Math.random() * 0.4;
        group.scale.set(s, s, s);

        return group;
    }

    const mat = getMaterial('standard', {
        map: ASSETS.textures[t],
        roughness: 0.3,
        metalness: 0.1
    });

    // Roof Material (Darker shade of base color)
    const roofColor = new THREE.Color(PALETTE[t - 1]).multiplyScalar(0.6);
    const roofMat = getMaterial('standard', {
        color: roofColor,
        roughness: 0.6,
        flatShading: true
    });

    // Materials Arrays
    // Box: Right, Left, Top, Bottom, Front, Back
    // Note: Mutating shared arrays is bad if we modify them later, but here they are just passed to Mesh
    const boxMaterials = [mat, mat, roofMat, mat, mat, mat];
    const cylMaterials = [mat, roofMat, roofMat];

    let mesh;

    // Procedural Shapes based on Tier
    if (t === 1) {
        // Tier 1: Cottage
        mesh = new THREE.Group();
        const base = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        base.scale.set(0.8, 0.5, 0.8);
        base.position.y = 0.25;
        mesh.add(base);

        const roof = new THREE.Mesh(ASSETS.geometries.cone, roofMat);
        roof.scale.set(1.1, 1, 1.1);
        roof.position.y = 0.7; // 0.5 + 0.2
        roof.rotation.y = Math.PI / 4;
        mesh.add(roof);

        const chimney = new THREE.Mesh(ASSETS.geometries.box, roofMat);
        chimney.scale.set(0.15, 0.4, 0.15);
        chimney.position.set(0.2, 0.6, 0.2);
        mesh.add(chimney);
    }
    else if (t === 2) {
        // Tier 2: Townhouse with Awning
        mesh = new THREE.Group();
        const base = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        base.scale.set(0.7, 0.9, 0.7);
        base.position.y = 0.45;
        mesh.add(base);

        // Flat Roof rim
        const rim = new THREE.Mesh(ASSETS.geometries.box, roofMat);
        rim.scale.set(0.75, 0.05, 0.75);
        rim.position.y = 0.925;
        mesh.add(rim);

        // Awning
        const awning = new THREE.Mesh(ASSETS.geometries.box, roofMat);
        awning.scale.set(0.3, 0.05, 0.2);
        awning.position.set(0, 0.25, 0.4);
        mesh.add(awning);
    }
    else if (t === 3) {
        // Tier 3: Apartment with Balconies
        mesh = new THREE.Group();
        const base = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        base.scale.set(0.85, 1.2, 0.85);
        base.position.y = 0.6;
        mesh.add(base);

        // Roof Shed
        const shed = new THREE.Mesh(ASSETS.geometries.box, roofMat);
        shed.scale.set(0.4, 0.2, 0.4);
        shed.position.y = 1.3;
        mesh.add(shed);

        // Random Balconies
        const balMat = createPlasticMat(0xdddddd);
        for(let i=0; i<3; i++) {
            const b = new THREE.Mesh(ASSETS.geometries.box, balMat);
            b.scale.set(0.25, 0.05, 0.1);
            b.position.set(0, 0.4 + (i*0.3), 0.45);
            mesh.add(b);
        }
    }
    else if (t === 4) {
        // Tier 4: Stepped Office
        mesh = new THREE.Group();
        const b1 = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        b1.scale.set(0.9, 0.6, 0.9);
        b1.position.y = 0.3;
        mesh.add(b1);

        const b2 = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        b2.scale.set(0.6, 1.2, 0.6); // Overlaps b1
        b2.position.y = 0.6;
        mesh.add(b2);

        // HVAC
        const ac = new THREE.Mesh(ASSETS.geometries.box, createPlasticMat(0x888888));
        ac.scale.set(0.2, 0.15, 0.2);
        ac.position.set(0.1, 1.275, 0);
        mesh.add(ac);
    }
    else if (t === 5) {
        // Tier 5: High Rise with Fins
        mesh = new THREE.Group();
        const base = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        base.scale.set(0.7, 1.8, 0.7);
        base.position.y = 0.9;
        mesh.add(base);

        // Fins
        const finMat = createPlasticMat(0x555555);
        const f1 = new THREE.Mesh(ASSETS.geometries.box, finMat);
        f1.scale.set(0.8, 1.7, 0.1);
        f1.position.y = 0.85;
        f1.position.z = 0;
        mesh.add(f1);

        const f2 = new THREE.Mesh(ASSETS.geometries.box, finMat);
        f2.scale.set(0.1, 1.7, 0.8);
        f2.position.y = 0.85;
        f2.position.x = 0;
        mesh.add(f2);
    }
    else if (t === 6) {
        // Tier 6: Twin Tower / Complex
        mesh = new THREE.Group();
        const h = 2.2;

        const t1 = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        t1.scale.set(0.35, h, 0.35);
        t1.position.set(-0.2, h/2, -0.2);
        mesh.add(t1);

        const t2 = new THREE.Mesh(ASSETS.geometries.box, boxMaterials);
        t2.scale.set(0.35, h*0.8, 0.35);
        t2.position.set(0.2, (h*0.8)/2, 0.2);
        mesh.add(t2);

        // Bridge
        const bridge = new THREE.Mesh(ASSETS.geometries.box, createPlasticMat(0x333333));
        bridge.scale.set(0.6, 0.1, 0.1);
        bridge.position.set(0, h*0.5, 0);
        mesh.add(bridge);
    }
    else {
        // Tier 7-10: Sci-Fi Spire
        mesh = new THREE.Group();

        const h = 1.5 + (t * 0.25);
        const w = 0.4;

        // Main Shaft
        const body = new THREE.Mesh(ASSETS.geometries.cylinder, cylMaterials);
        body.scale.set(w, h, w);
        body.position.y = h/2;
        mesh.add(body);

        // Floating Rings
        const numRings = t - 5;
        for(let i=0; i<numRings; i++) {
            const r = new THREE.Mesh(ASSETS.geometries.torus, createPlasticMat(0xffffff));
            const y = (h * 0.2) + (i * (h/numRings) * 0.6);
            r.position.y = y;
            r.rotation.x = Math.PI / 2;
            const s = 1 + (i*0.2);
            r.scale.set(s, s, 1);
            mesh.add(r);
        }

        // Antenna
        const ant = new THREE.Mesh(ASSETS.geometries.cylinder, createPlasticMat(0xaaaaaa));
        ant.scale.set(0.05, 0.8, 0.05);
        ant.position.y = h + 0.4;
        mesh.add(ant);
    }

    // Enable Shadows for all parts
    mesh.traverse((c) => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });

    return mesh;
}

// --- 3.1 PARTICLE SYSTEM ---

const particleGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, z, colorHex, count = 16) {
        // We rely on gridToWorld being hoisted
        const pos = gridToWorld(x, z);

        for (let i = 0; i < count; i++) {
            const material = getMaterial('basic', { color: colorHex });

            const mesh = new THREE.Mesh(particleGeometry, material);
            mesh.position.set(pos.x, 0.5, pos.z);

            // Explosion Physics
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 1.5 + 0.5;
            const height = Math.random() * 3 + 2;

            this.particles.push({
                mesh: mesh,
                vx: Math.cos(angle) * speed,
                vy: height,
                vz: Math.sin(angle) * speed,
                life: 1.0 + Math.random() * 0.5,
                gravity: 15
            });

            // Random rotation
            mesh.rotation.set(Math.random(), Math.random(), Math.random());

            scene.add(mesh);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            p.vy -= p.gravity * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            p.mesh.rotation.x += p.vx * dt * 2;
            p.mesh.rotation.z += p.vz * dt * 2;

            // Scale out
            if (p.life < 0.3) {
                 const s = p.life / 0.3;
                 p.mesh.scale.setScalar(s);
            }
        }
    }
}

const particleSystem = new ParticleSystem();

// --- 3.2 CLOUD SYSTEM ---

class CloudSystem {
    constructor(count = 8) {
        this.clouds = [];
        this.bounds = 30; // Spawn/Despawn distance

        // Shared geometry/material
        // Use Icosahedron for low-poly but "smoother" look compared to Box
        this.geo = new THREE.IcosahedronGeometry(1, 0);
        this.mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            flatShading: true,
            opacity: 0.85,
            transparent: true
        });

        for(let i=0; i<count; i++) {
            this.spawn(true); // Initial spawn random placement
        }
    }

    spawn(randomX = false) {
        const cloud = new THREE.Group();

        // Build cloud shape - More segments for fluffiness
        const segments = 5 + Math.floor(Math.random() * 4);
        for(let i=0; i<segments; i++) {
            const mesh = new THREE.Mesh(this.geo, this.mat);
            mesh.position.set(
                (Math.random() - 0.5) * 2.0,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 1.5
            );
            const scale = 0.5 + Math.random() * 0.6;
            mesh.scale.setScalar(scale);

            // Random rotation for variety
            mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

            // Clouds cast soft shadows
            mesh.castShadow = true;
            cloud.add(mesh);
        }

        // Position
        const z = (Math.random() - 0.5) * 40; // Spread wide
        const y = 8 + Math.random() * 5;     // High up
        let x = -this.bounds;

        if (randomX) {
            x = (Math.random() - 0.5) * this.bounds * 2;
        }

        cloud.position.set(x, y, z);

        // Metadata for movement
        cloud.userData = {
            speed: 1.0 + Math.random() * 1.0
        };

        scene.add(cloud);
        this.clouds.push(cloud);
    }

    update(dt) {
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * dt;

            // Wrap around
            if (cloud.position.x > this.bounds) {
                cloud.position.x = -this.bounds;
                cloud.position.z = (Math.random() - 0.5) * 40;
                cloud.position.y = 8 + Math.random() * 5;
                cloud.userData.speed = 1.0 + Math.random() * 1.0;
            }
        });
    }
}

const cloudSystem = new CloudSystem();

// --- 4. GAME LOGIC (THE BRAIN) ---

class CityGrid {
    constructor(size) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(null));
        this.meshGrid = Array(size).fill().map(() => Array(size).fill(null)); // Stores 3D objects
        this.score = 0;
        this.buildingCount = 0;
    }

    // Check if coordinate is valid
    isValid(x, z) {
        return x >= 0 && x < this.size && z >= 0 && z < this.size;
    }

    // Add building to data
    place(x, z, tier) {
        if (!this.isValid(x, z)) return null;

        // If it's a road, we can overwrite it. If it's a building, we can't.
        // Tier -2 (Obstacle) also cannot be overwritten
        if (this.grid[x][z] !== null && this.grid[x][z].tier !== -1) return null;

        // Remove visualization if overwriting road
        if (this.meshGrid[x][z]) {
            scene.remove(this.meshGrid[x][z]);
            this.meshGrid[x][z] = null;
        }

        // Data
        this.grid[x][z] = { tier: tier, id: Date.now() + Math.random() };

        // Only score if it's a building (tier > 0)
        if (tier > 0) {
            this.score += Math.pow(tier, 2) * 10; // Exponential score
            this.buildingCount++;
        }

        return this.grid[x][z];
    }

    // Remove building from data and scene
    remove(x, z) {
        if (!this.isValid(x, z)) return;

        // Don't remove roads unless forced (tier -1) or obstacles (tier -2)
        // Only buildings (tier > 0) contribute to count

        if (this.grid[x][z] && this.grid[x][z].tier > 0) {
            this.buildingCount--;
        }

        this.grid[x][z] = null;

        if (this.meshGrid[x][z]) {
            const mesh = this.meshGrid[x][z];
            // Shrink animation before deleting
            gsap.to(mesh.scale, {
                x: 0, y: 0, z: 0,
                duration: 0.1,
                onComplete: () => scene.remove(mesh)
            });
            this.meshGrid[x][z] = null;
        }

        // After removing a building, we might need to update roads? 
        // Or maybe just leave them until something overwrites them?
        // Let's leave them for now, it's simpler.
    }

    updateRoads() {
        // Scan for empty spots that should be roads
        // Rule: Empty spot with at least 1 building neighbor becomes a road?
        // Or: Empty spot connected to existing road or building?

        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (let x = 0; x < this.size; x++) {
            for (let z = 0; z < this.size; z++) {
                // Only place roads on empty tiles
                if (this.grid[x][z] === null) {
                    let neighborCount = 0;

                    neighbors.forEach(([dx, dz]) => {
                        const nx = x + dx;
                        const nz = z + dz;
                        if (this.isValid(nx, nz) && this.grid[nx][nz] !== null) {
                            neighborCount++;
                        }
                    });

                    // If it has at least 2 neighbors (building or road), it becomes a road
                    // This prevents flood-filling the entire map
                    if (neighborCount >= 2) {
                        this.place(x, z, -1); // Tier -1 is Road
                        spawnVisual(x, z, -1);
                    }
                }
            }
        }
    }

    // Find all empty tiles
    getEmpties() {
        let empties = [];
        for (let x = 0; x < this.size; x++) {
            for (let z = 0; z < this.size; z++) {
                // Empties or Roads are valid spawn points for buildings
                if (!this.grid[x][z] || this.grid[x][z].tier === -1) empties.push({ x, z });
            }
        }
        return empties;
    }

    // Upgrade a building at x, z
    upgradeBuilding(x, z) {
        if (!this.isValid(x, z)) return null;

        const cell = this.grid[x][z];
        if (cell && cell.tier > 0 && cell.tier < 10) {
            cell.tier++;
            this.score += Math.pow(cell.tier, 2) * 10;
            return cell.tier;
        }
        return null;
    }
}

// --- 5. EXECUTION & LOOP ---

// Init Game State
const city = new CityGrid(CONFIG.gridSize);

// Initial Obstacles
function spawnObstacles() {
    const obstacleCount = 8; // Adjust for difficulty
    for (let i = 0; i < obstacleCount; i++) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 20) {
            const x = Math.floor(Math.random() * CONFIG.gridSize);
            const z = Math.floor(Math.random() * CONFIG.gridSize);

            // Ensure empty spot
            if (city.grid[x][z] === null) {
                // Manually set data to Tier -2
                city.grid[x][z] = { tier: -2, id: 'obstacle' };
                spawnVisual(x, z, -2);
                placed = true;
            }
            attempts++;
        }
    }
}
spawnObstacles();

// New Game State Logic
const gameState = {
    nextTier: 1,
    isGameOver: false,
    isBusy: false
};

function generateNextTier() {
    // Weighted random: 70% Tier 1, 30% Tier 2
    return Math.random() < 0.7 ? 1 : 2;
}

// Initial Generation
gameState.nextTier = generateNextTier();

// Helper: Convert Grid Index to World Position
function gridToWorld(x, z) {
    const offset = (CONFIG.gridSize * CONFIG.tileSize) / 2 - (CONFIG.tileSize / 2);
    return {
        x: (x * CONFIG.tileSize) - offset,
        z: (z * CONFIG.tileSize) - offset
    };
}

// Create the Ground Platform
const platformGeo = new THREE.BoxGeometry(
    CONFIG.gridSize * CONFIG.tileSize,
    0.2,
    CONFIG.gridSize * CONFIG.tileSize
);

// Ground Texture
const groundTex = TextureFactory.ground();
groundTex.wrapS = THREE.RepeatWrapping;
groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(CONFIG.gridSize, CONFIG.gridSize);

const platformMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.8
});

const platform = new THREE.Mesh(platformGeo, platformMat);
platform.position.y = -0.1;
platform.receiveShadow = true;
scene.add(platform);

// --- ENVIRONMENT DECORATION ---
function generateEnvironment() {
    const envGroup = new THREE.Group();
    scene.add(envGroup);

    // Trees
    const treeGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8);

    // Reuse materials or create new ones
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, flatShading: true });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, flatShading: true });

    // Place randomly in a ring
    // Reduced count to avoid clutter now that we have trees on board
    const count = 20;
    const minR = (CONFIG.gridSize * CONFIG.tileSize) / 2 + 4; // Pushed further out
    const maxR = minR + 12;

    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = minR + Math.random() * (maxR - minR);

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        // Chance for Tree or Rock
        const type = Math.random() > 0.3 ? 'tree' : 'rock';

        const obj = new THREE.Group();
        obj.position.set(x, -0.2, z);

        if (type === 'tree') {
            // Trunk
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 0.25;
            trunk.castShadow = true;
            obj.add(trunk);

            // Leaves (2-3 tiers)
            const levels = 2 + Math.floor(Math.random() * 2);
            for(let j=0; j<levels; j++) {
                const leaves = new THREE.Mesh(treeGeo, treeMat);
                const s = 1.0 - (j * 0.2);
                leaves.scale.set(s, s, s);
                leaves.position.y = 0.5 + (j * 0.6);
                leaves.castShadow = true;
                obj.add(leaves);
            }
        } else {
            // Rock
            const rockGeo = new THREE.DodecahedronGeometry(0.5);
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.castShadow = true;
            rock.scale.set(1 + Math.random(), 0.5 + Math.random()*0.5, 1 + Math.random());
            obj.add(rock);
        }

        // Floating Island Base
        const islandGeo = new THREE.CylinderGeometry(1.5, 0.5, 1, 7);
        const islandMat = new THREE.MeshStandardMaterial({ color: 0x7abf7a, flatShading: true });
        const island = new THREE.Mesh(islandGeo, islandMat);
        island.position.y = -0.5;
        island.receiveShadow = true;
        obj.add(island);

        // Random scale variation
        const scale = 0.8 + Math.random() * 0.4;
        obj.scale.setScalar(scale);

        // Animate floating
        gsap.to(obj.position, {
            y: obj.position.y + 0.2,
            duration: 2 + Math.random() * 2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            delay: Math.random() * 2
        });

        envGroup.add(obj);
    }
}
generateEnvironment();

// Helper: Spawn Visual
function spawnVisual(x, z, tier) {
    // Clean up existing if any (safety check)
    if (city.meshGrid[x][z]) scene.remove(city.meshGrid[x][z]);

    const mesh = createBuildingMesh(tier);
    const pos = gridToWorld(x, z);
    mesh.position.set(pos.x, mesh.position.y, pos.z);

    // Start invisible
    mesh.scale.set(0, 0, 0);
    scene.add(mesh);
    city.meshGrid[x][z] = mesh;

    // POP Animation
    gsap.to(mesh.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.2,
        ease: "elastic.out(1, 0.5)"
    });
}

// THE HEARTBEAT
function gameTick() {
    if (gameState.isBusy || gameState.isGameOver) return;

    // Spawn Logic
    const empties = city.getEmpties();
    if (empties.length === 0) {
        console.log("Grid Full! Game Over.");
        triggerGameOver();
        return;
    }

    // Clustering Logic: Filter for empties with neighbors
    const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const candidates = empties.filter(pos => {
        return neighbors.some(([dx, dz]) => {
            const nx = pos.x + dx;
            const nz = pos.z + dz;
            return city.isValid(nx, nz) && city.grid[nx][nz] !== null;
        });
    });

    // Pick from candidates if any, otherwise random (first building)
    const targets = candidates.length > 0 ? candidates : empties;
    const spot = targets[Math.floor(Math.random() * targets.length)];

    city.place(spot.x, spot.z, 1); // Always spawn Tier 1
    spawnVisual(spot.x, spot.z, 1);

    // Resolve merges
    resolveMerges(spot.x, spot.z);
}

// Start Timer
setInterval(gameTick, CONFIG.tickRate);

// --- 6. INTERACTION ---

// Raycaster & Mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Cursor Visual
const cursorGeo = new THREE.BoxGeometry(CONFIG.tileSize, 0.2, CONFIG.tileSize);
const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, opacity: 0.5, transparent: true });
const cursor = new THREE.Mesh(cursorGeo, cursorMat);
scene.add(cursor);
cursor.visible = false; // Initially hidden

// Event Listeners
window.addEventListener('mousemove', (event) => {
    // Normalize mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(platform);

    if (intersects.length > 0) {
        const point = intersects[0].point;

        // Convert to Grid Coords
        const offset = (CONFIG.gridSize * CONFIG.tileSize) / 2 - (CONFIG.tileSize / 2);
        const gx = Math.round((point.x + offset) / CONFIG.tileSize);
        const gz = Math.round((point.z + offset) / CONFIG.tileSize);

        // Snap Cursor
        if (city.isValid(gx, gz)) {
            const worldPos = gridToWorld(gx, gz);
            cursor.position.set(worldPos.x, 0.1, worldPos.z);
            cursor.visible = true;

            // Cursor state UX feedback
            const cell = city.grid[gx][gz];
            if (cell === null || cell.tier === -1) {
                document.body.style.cursor = 'pointer'; // Valid placement spot
            } else {
                document.body.style.cursor = 'not-allowed'; // Invalid placement spot (obstacle or existing building)
            }
        } else {
            cursor.visible = false;
            document.body.style.cursor = 'default';
        }
    } else {
        cursor.visible = false;
        document.body.style.cursor = 'default';
    }
});

// Click Listener
window.addEventListener('pointerdown', (event) => {
    if (gameState.isGameOver || gameState.isBusy) return;
    if (event.button !== 0) return; // Only process Left Click for buildings

    // Reuse mouse coordinates from mousemove if available, or update them
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(platform);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const offset = (CONFIG.gridSize * CONFIG.tileSize) / 2 - (CONFIG.tileSize / 2);
        const gx = Math.round((point.x + offset) / CONFIG.tileSize);
        const gz = Math.round((point.z + offset) / CONFIG.tileSize);

        // Can build on Empty (null) or Road (-1). CANNOT build on Obstacle (-2) or Building (>0)
        if (city.isValid(gx, gz) && (city.grid[gx][gz] === null || city.grid[gx][gz].tier === -1)) {
            // Place Building
            city.place(gx, gz, gameState.nextTier);
            spawnVisual(gx, gz, gameState.nextTier);

            // Resolve Merges
            resolveMerges(gx, gz);

            // Next Turn
            gameState.nextTier = generateNextTier();

            console.log("Next Tier:", gameState.nextTier);
        }
    }
});

function resolveMerges(x, z) {
    if (!city.isValid(x, z) || city.grid[x][z] === null) return;

    const targetTier = city.grid[x][z].tier;
    if (targetTier <= 0 || targetTier >= 10) return;

    const cluster = [];
    const visited = new Set();
    const queue = [{ x, z }];

    visited.add(`${x},${z}`);

    while (queue.length > 0) {
        const current = queue.shift();
        cluster.push(current);

        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        neighbors.forEach(([dx, dz]) => {
            const nx = current.x + dx;
            const nz = current.z + dz;
            const key = `${nx},${nz}`;

            if (city.isValid(nx, nz) && !visited.has(key)) {
                const cell = city.grid[nx][nz];
                if (cell && cell.tier === targetTier) {
                    visited.add(key);
                    queue.push({ x: nx, z: nz });
                }
            }
        });
    }

    if (cluster.length >= 3) {
        gameState.isBusy = true;

        // Clear adjacent obstacles
        cluster.forEach(cell => {
            const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            neighbors.forEach(([dx, dz]) => {
                const nx = cell.x + dx;
                const nz = cell.z + dz;
                if (city.isValid(nx, nz) && city.grid[nx][nz] && city.grid[nx][nz].tier === -2) {
                    city.remove(nx, nz);
                }
            });
        });

        const focalPos = gridToWorld(x, z);

        let animationsComplete = 0;
        const totalAnimations = cluster.length - 1;

        const onComplete = () => {
            animationsComplete++;
            if (animationsComplete >= totalAnimations) {
                const newTier = city.upgradeBuilding(x, z);
                if (newTier) {
                    spawnVisual(x, z, newTier);
                    const color = PALETTE[newTier - 1];
                    if (color) {
                         particleSystem.spawn(x, z, color, 32);
                    }
                }
                gameState.isBusy = false;
                resolveMerges(x, z);
            }
        };

        cluster.forEach((cell) => {
            if (cell.x === x && cell.z === z) return;

            const mesh = city.meshGrid[cell.x][cell.z];
            if (mesh) {
                // Detach mesh so city.remove doesn't trigger shrink animation
                city.meshGrid[cell.x][cell.z] = null;
                // Logically remove immediately to prevent phantom buildings
                city.remove(cell.x, cell.z);

                gsap.to(mesh.position, {
                    x: focalPos.x,
                    z: focalPos.z,
                    duration: 0.5,
                    ease: "power2.in",
                    onComplete: () => {
                        scene.remove(mesh);
                        onComplete();
                    }
                });
            } else {
                city.remove(cell.x, cell.z);
                onComplete();
            }
        });
    }
}

// --- 5.1 AVATAR SYSTEM ---

class Avatar {
    constructor(startGridX, startGridZ) {
        this.gx = startGridX;
        this.gz = startGridZ;

        // Visuals
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const mat = getMaterial('standard', { color: color });

        // Reuse cone geometry
        // ConeGeometry(0.1, 0.3, 8)
        // Shared cone is (0.6, 0.4, 4). 
        // Let's create a specific avatar cone or scale the shared one?
        // Scaling smooth cone (8 segments) from low poly (4 segments) looks bad.
        // Let's add a specific avatar geometry to assets if not present, or just make one here for sharing.

        if (!ASSETS.geometries.avatar) {
            ASSETS.geometries.avatar = new THREE.ConeGeometry(0.1, 0.3, 8);
        }

        this.mesh = new THREE.Mesh(ASSETS.geometries.avatar, mat);

        const startPos = gridToWorld(this.gx, this.gz);
        this.mesh.position.set(startPos.x, 0.15, startPos.z);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Movement State
        this.isMoving = false;
        this.target = null;
        this.speed = 0.5; // Units per second
    }

    update(dt) {
        if (this.isMoving && this.target) {
            const currentPos = this.mesh.position;
            const targetPos = this.target;

            const dist = currentPos.distanceTo(targetPos);

            if (dist < 0.05) {
                // Arrived
                this.mesh.position.copy(targetPos);
                this.isMoving = false;
                this.gx = this.targetGx;
                this.gz = this.targetGz;
                // Decide next move immediately or wait? 
                // Let's decide next frame implicitly by being not moving
            } else {
                // Move towards
                const dir = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();
                this.mesh.position.add(dir.multiplyScalar(this.speed * dt));
            }
        } else {
            // Pick a new target
            this.pickMove();
        }
    }

    pickMove() {
        // Look for valid neighbors (Roads or Buildings)
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const validMoves = [];

        neighbors.forEach(([dx, dz]) => {
            const nx = this.gx + dx;
            const nz = this.gz + dz;

            if (city.isValid(nx, nz)) {
                // Walkable if it's a Road (-1) or a Building (Tier >= 1)
                // Actually, let's say they can walk on everything except empty void?
                // Or maybe strictly Roads and Buildings?
                const cell = city.grid[nx][nz];
                if (cell !== null) {
                    validMoves.push({ x: nx, z: nz });
                }
            }
        });

        if (validMoves.length > 0) {
            // Pick random
            const limit = 10; // Tries to pick a move that isn't previous one logic could go here
            const next = validMoves[Math.floor(Math.random() * validMoves.length)];

            this.targetGx = next.x;
            this.targetGz = next.z;
            const worldPos = gridToWorld(next.x, next.z);
            this.target = new THREE.Vector3(worldPos.x, 0.15, worldPos.z);
            this.isMoving = true;

            // Face direction
            this.mesh.lookAt(this.target);
            // Rotate X to stand up (Cone geometry is weird, points up Y)
            // Actually lookAt points Z axis. Cone points up Y. 
            // We need to rotate geometry or mesh to align. 
            // Simple approach: Just bob up and down
        }
    }

    dispose() {
        scene.remove(this.mesh);
        // Do NOT dispose geometry or material as they are shared now!
    }
}

class AvatarManager {
    constructor() {
        this.avatars = [];
        this.maxAvatars = 20;
        this.spawnTimer = 0;
    }

    update(dt) {
        // Update all avatars
        this.avatars.forEach(a => a.update(dt));

        // Spawn new ones occasionally
        this.spawnTimer += dt;
        if (this.spawnTimer > 2.0 && this.avatars.length < this.maxAvatars) {
            this.spawnTimer = 0;
            this.trySpawn();
        }
    }

    trySpawn() {
        // Find a random building to spawn from
        const buildings = [];
        for (let x = 0; x < city.size; x++) {
            for (let z = 0; z < city.size; z++) {
                if (city.grid[x][z] && city.grid[x][z].tier > 0) {
                    buildings.push({ x, z });
                }
            }
        }

        if (buildings.length > 0) {
            const spot = buildings[Math.floor(Math.random() * buildings.length)];
            this.avatars.push(new Avatar(spot.x, spot.z));
        }
    }
}

const avatarManager = new AvatarManager();

// --- GAME OVER LOGIC ---

function triggerGameOver() {
    if (gameState.isGameOver) return;
    gameState.isGameOver = true;
    gameState.isBusy = true;

    console.log("TRIGGERING GAME OVER EXPLOSION!");

    // Gather all meshes
    const allMeshes = [];
    for (let x = 0; x < CONFIG.gridSize; x++) {
        for (let z = 0; z < CONFIG.gridSize; z++) {
            if (city.meshGrid[x][z]) {
                allMeshes.push(city.meshGrid[x][z]);
            }
        }
    }

    if (allMeshes.length === 0) {
        resetGame();
        return;
    }

    // Explosion Animation
    allMeshes.forEach((mesh, chatIndex) => {
        // Random direction up and out
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 10;
        const tx = mesh.position.x + Math.cos(angle) * dist;
        const tz = mesh.position.z + Math.sin(angle) * dist;
        const ty = 10 + Math.random() * 10;

        gsap.to(mesh.position, {
            x: tx,
            y: ty,
            z: tz,
            duration: 1.5,
            ease: "power2.out"
        });

        gsap.to(mesh.rotation, {
            x: Math.random() * 10,
            y: Math.random() * 10,
            z: Math.random() * 10,
            duration: 1.5,
            ease: "linear"
        });

        gsap.to(mesh.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.5,
            delay: 1,
            ease: "back.in(1.7)"
        });
    });

    // Reset after animation
    setTimeout(resetGame, 1600);
}

function resetGame() {
    // 1. Clear Scene Meshes
    for (let x = 0; x < CONFIG.gridSize; x++) {
        for (let z = 0; z < CONFIG.gridSize; z++) {
            if (city.meshGrid[x][z]) {
                scene.remove(city.meshGrid[x][z]);
                city.meshGrid[x][z] = null;
            }
        }
    }

    // 2. Clear Data
    city.grid = Array(CONFIG.gridSize).fill().map(() => Array(CONFIG.gridSize).fill(null));
    city.meshGrid = Array(CONFIG.gridSize).fill().map(() => Array(CONFIG.gridSize).fill(null));

    // 3. Reset State
    city.score = 0;
    city.buildingCount = 0;

    // Reset Avatars
    avatarManager.avatars.forEach(a => a.dispose());
    avatarManager.avatars = [];

    gameState.isGameOver = false;
    gameState.isBusy = false;
    gameState.nextTier = 1; // Reset next tier

    console.log("Game Reset Complete");
}




// Render Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    const dt = clock.getDelta();
    avatarManager.update(dt);
    particleSystem.update(dt);
    cloudSystem.update(dt);

    // Update UI

    renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});