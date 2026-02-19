import { initScene, setScroll } from './scene.js'
import * as LeaderLineLib from 'leader-line-new';
const LeaderLine = LeaderLineLib.default || LeaderLineLib;

initScene();

// --- EXISTING GRAPH ANIMATION HELPERS PRESERVED ---

// Connections Data (Mappings)
const connections = [];

// --- LEADER LINE GRAPH MANAGMENT ---
let graphLines = [];
let dotAnimations = [];
let animationTriggered = false;

// --- SCROLL & TRANSITION LOGIC ---
const aboutOverlay = document.getElementById('about-overlay');
const projectsOverlay = document.getElementById('projects-overlay');
const contactOverlay = document.getElementById('contact-overlay');
const uiContainer = document.getElementById('ui-container'); // Home Container
const navLinks = document.querySelectorAll('.nav-link');
const graphSvg = document.getElementById('graph-svg'); // SVG Layer

// Section Order
const sectionIds = ['ui-container', 'about-overlay', 'projects-overlay', 'contact-overlay'];
const sections = sectionIds.map(id => document.getElementById(id));
let currentSectionIndex = 0;
let isScrolling = false;

// Initialize State
function initLayout() {
    sections.forEach((sec, i) => {
        if (!sec) return;
        if (i === 0) {
            sec.style.transform = 'translateY(0) scale(1)';
            sec.style.opacity = '1';
            sec.style.filter = 'none';
        } else {
            sec.style.transform = 'translateY(100vh)'; // Start off-screen
            sec.style.opacity = '1';
        }
    });
    // Set initial 3D scroll state
    setScroll(0);
    updateNavState(0);
}
initLayout();

// Wheel Event Listener
window.addEventListener('wheel', (e) => {
    // 1. Block Global Scroll if Sector Grid is Open
    const sectorOverlay = document.getElementById('sector-overlay');
    if (sectorOverlay && sectorOverlay.classList.contains('active')) {
        // Stop propagation just in case, but allowing default ensures internal scroll works
        e.stopPropagation();
        return;
    }

    // Projects Page Internal Scroll Logic
    if (currentSectionIndex === 2 && projectsOverlay) {
        const el = projectsOverlay;
        const isScrollingDown = e.deltaY > 0;
        const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        const isAtTop = el.scrollTop <= 2;

        if (isScrollingDown && !isAtBottom) {
            return; // Allow native scroll
        }
        if (!isScrollingDown && !isAtTop) {
            return; // Allow native scroll
        }
    }

    e.preventDefault();
    if (isScrolling) return;

    // Threshold to prevent accidental triggers on hypersensitive trackpads
    if (Math.abs(e.deltaY) < 15) return;

    const direction = e.deltaY > 0 ? 1 : -1;
    const nextIndex = currentSectionIndex + direction;

    if (nextIndex >= 0 && nextIndex < sections.length) {
        changeSection(nextIndex);
    }
}, { passive: false });

// Nav Click Listener
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        let targetIndex = 0;
        if (targetId === 'home') targetIndex = 0;
        else if (targetId === 'about') targetIndex = 1;
        else if (targetId === 'projects') targetIndex = 2;
        else if (targetId === 'contact') targetIndex = 3;

        if (targetIndex !== currentSectionIndex) {
            changeSection(targetIndex);
        }
    });
});

// Hire Me Button Logic
const hireMeBtn = document.querySelector('.hire-me-btn');
if (hireMeBtn) {
    hireMeBtn.addEventListener('click', () => {
        changeSection(3); // Contact Section
    });
}

// Scroll Indicator Click Logic
const scrollIndicator = document.querySelector('.scroll-indicator');
if (scrollIndicator) {
    scrollIndicator.addEventListener('click', (e) => {
        // Only trigger if clicking the arrow (or its children)
        if (e.target.closest('.scroll-arrow') && scrollIndicator.classList.contains('show-up-arrow')) {
            changeSection(0); // Go Back Home
        }
    });
}

// Main Transition Logic
function changeSection(newIndex) {
    if (isScrolling) return;
    isScrolling = true;

    // Control 3D Expansion Duration (Synced with CSS Slide: 2.0s)
    const cssDuration = 2000;

    // FIX: Continuously update graph positions during the CSS transition
    // The nodes move via CSS transform, but LeaderLine (SVG in body) needs manual JS updates.
    if (newIndex === 1 || currentSectionIndex === 1) { // If entering or leaving About
        const startTime = performance.now();
        const updateLoop = () => {
            if (performance.now() - startTime < cssDuration + 500) { // Run slightly longer to be safe
                updateGraphPositions();
                requestAnimationFrame(updateLoop);
            }
        };
        requestAnimationFrame(updateLoop);
    }

    // Determine Delays for "Step-by-Step" Sequence
    let expansionDelay = 0; // When to start 3D expansion
    let uiDelay = 0;        // When to start Page Slide

    // Capture previous index for delayed operations
    const previousIndex = currentSectionIndex;

    // FIX: If leaving About section, remove lines immediately
    if (previousIndex === 1 && newIndex !== 1) {
        disposeGraph();
        // animationTriggered = false; // REMOVED: Keep state true so it doesn't replay
    }

    // Sequence: Home (0) -> About (1)
    if (previousIndex === 0 && newIndex === 1) {
        // 1. Fade out Name Card & Dots Immediately
        const homeTextInner = document.querySelector('.home-text-inner');
        if (homeTextInner) homeTextInner.classList.add('fade-out');

        const dotsContainer = document.querySelector('.bg-dots-container');
        if (dotsContainer) dotsContainer.classList.add('fade-out');

        // 2. Start Net Expansion Immediately (0ms)
        expansionDelay = 0;

        // 3. Start Slide Up Earlier (800ms)
        // Expansion starts at 0ms. Duration 1600ms.
        // We start slide at 800ms (halfway through expansion).
        uiDelay = 800;
    }
    // Sequence: About (1) -> Home (0)
    else if (previousIndex === 1 && newIndex === 0) {
        // 0. Cleanup Graph Immediately so lines don't linger
        disposeGraph();
        // animationTriggered = false; // REMOVED: Keep state true


        // 1. Start Collapse Immediately
        expansionDelay = 0;
        uiDelay = 0;

        // 2. Ensure Fade-Out is applied IMMEDIATELY (Hidden Start)
        const homeTextInner = document.querySelector('.home-text-inner');
        if (homeTextInner) homeTextInner.classList.add('fade-out');

        const dotsContainer = document.querySelector('.bg-dots-container');
        if (dotsContainer) dotsContainer.classList.add('fade-out');

        // 3. Delay Fade-In of Name Card (After 1400ms)
        setTimeout(() => {
            if (homeTextInner) homeTextInner.classList.remove('fade-out');
            if (dotsContainer) dotsContainer.classList.remove('fade-out');
        }, 1400);
    }

    // Update 3D Scene (Expansion) with calculated delay
    if (expansionDelay > 0) {
        setTimeout(() => {
            tweenScrollValue(previousIndex, newIndex, cssDuration);
        }, expansionDelay);
    } else {
        // Immediate Execution for perfect sync
        tweenScrollValue(previousIndex, newIndex, cssDuration);
    }

    // Capture indices for immediate scene update but delayed UI update
    currentSectionIndex = newIndex;

    const updateUI = () => {
        // Apply Transforms
        sections.forEach((sec, i) => {
            if (!sec) return;

            // Ensure Home Text Fade Reset if we return to Home (Active)
            if (i === 0 && i === currentSectionIndex) {
                // If coming from About (Reverse), we rely on delayed timeout (above)
                // Otherwise (e.g. initial load or from Projects), show immediate
                if (previousIndex !== 1) {
                    const homeTextInner = sec.querySelector('.home-text-inner');
                    if (homeTextInner) homeTextInner.classList.remove('fade-out');

                    const dotsContainer = document.querySelector('.bg-dots-container');
                    if (dotsContainer) dotsContainer.classList.remove('fade-out');
                }
            }

            // Future Sections (i > current) -> Slide Down / Stay Down
            if (i > currentSectionIndex) {
                sec.style.transform = 'translateY(100vh)';
                sec.style.opacity = '1';
                sec.style.filter = 'none';
                sec.classList.remove('contact-visible');

                // Hide Up Arrow if leaving Contact (going up)
                if (sec.id === 'contact-overlay') {
                    const scrollInd = document.querySelector('.scroll-indicator');
                    if (scrollInd) scrollInd.classList.remove('show-up-arrow');
                }
            }
            // Current Section -> Center
            else if (i === currentSectionIndex) {
                sec.style.transform = 'translateY(0)';
                sec.style.opacity = '1';
                sec.style.filter = 'none';
                sec.style.pointerEvents = 'auto'; // Enable interaction

                // Special trigger for About animation
                if (sec.id === 'about-overlay') {
                    sec.classList.add('section-active');
                    if (!animationTriggered) {
                        setTimeout(() => triggerScrollAnimation(), 100);
                    } else {
                        // Restore Immediately if already played
                        setTimeout(() => {
                            // Restore Nodes visibility
                            document.querySelectorAll('.graph-node, .leaf-node').forEach(n => {
                                n.style.opacity = '1';
                                n.style.transform = 'scale(1)';
                            });
                            // Re-init lines without animation delay
                            initGraph();
                            // Force show all lines immediately
                            graphLines.forEach(l => {
                                l.show('none'); // Instant show
                                l.position();
                            });
                        }, 100);
                    }
                }
                // Trigger Contact Animation
                if (sec.id === 'contact-overlay') {
                    sec.classList.add('contact-visible');
                    // Show Up Arrow logic
                    const scrollInd = document.querySelector('.scroll-indicator');
                    if (scrollInd) scrollInd.classList.add('show-up-arrow');
                } else {
                    // Handled in other blocks
                }
            }
            // Past Sections (i < current) -> Slide Up / Scale Down / Fade Out
            else {
                sec.style.transform = 'translateY(0) scale(0.95)';
                sec.style.opacity = '0'; // Fade out completely
                sec.style.filter = 'blur(5px) brightness(0.5)';
                sec.classList.remove('contact-visible');
                sec.classList.remove('section-active');
                sec.style.pointerEvents = 'none'; // Disable interaction

                // Hide Up Arrow if leaving Contact
                if (sec.id === 'contact-overlay') {
                    const scrollInd = document.querySelector('.scroll-indicator');
                    if (scrollInd) scrollInd.classList.remove('show-up-arrow');
                }
            }
        });

        // Removed delayed updateNavState(currentSectionIndex) to avoid overwrite/lag
    };

    // Execute UI Update with calculated delay
    setTimeout(() => {
        updateUI();
    }, uiDelay);

    // Immediate Nav Update for responsiveness
    updateNavState(newIndex);

    // Release Lock after global transition completes (Fixed 2000ms)
    // We unlock when the SLOWEST animation (3D Expansion or Slide) finishes.
    setTimeout(() => {
        isScrolling = false;

        if (newIndex !== 1) {
            disposeGraph();
            // animationTriggered = false; // REMOVED
        }

    }, cssDuration);
}

function updateNavState(index) {
    const targets = ['home', 'about', 'projects', 'contact'];
    const activeTarget = targets[index];

    // Initial Highlight Update
    // We need to find the link to set highlight.
    // If we just cycle links, we can do it.

    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === activeTarget) {
            console.log('Active Target:', activeTarget, link);
            link.classList.add('active');
            updateHighlight(link);
        } else {
            link.classList.remove('active');
        }
    });
}

// Tween for Scene Scroll Value
function tweenScrollValue(start, end, duration) {
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / duration, 1);

        // EaseInOutQuad (Starts faster than Cubic)
        progress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const val = start + (end - start) * progress;
        setScroll(val);

        // Continuously update graph paths during transition if in range
        if (val > 0.1 && val < 2.5) {
            if (typeof updateGraphPositions === 'function') updateGraphPositions();
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}


// --- SVG GRAPH ANIMATION LOGIC ---

// Configuration
const GRAPH_COLOR = '#38bdf8'; // Sky 400

// --- LEADER LINE GRAPH MANAGMENT ---
function disposeGraph() {
    // Global nuclear cleanup - remove ANY leader line from the DOM
    document.querySelectorAll('.leader-line').forEach(el => el.remove());

    if (graphLines.length > 0) {
        graphLines.forEach(line => {
            try {
                // Also call remove on instance to clean listeners/timers
                line.remove();
            } catch (e) {
                // Ignore errors if element already gone
            }
        });
        graphLines = [];
    }
}

function initGraph() {
    // Clean up any existing lines first
    disposeGraph();

    // Clear dots if needed
    document.querySelectorAll('.neon-dot').forEach(d => d.remove());

    const startNode = document.getElementById('node-start');
    const eduNode = document.getElementById('node-edu');
    const expNode = document.getElementById('node-exp');
    const skillNode = document.getElementById('node-skill');

    if (!startNode || !eduNode) return; // Wait for DOM

    try {
        // Helper to create line
        const createLine = (start, end, startX = '50%', pathType = 'straight') => {
            if (!LeaderLine) {
                console.error('LeaderLine not loaded');
                return null;
            }
            const line = new LeaderLine(
                LeaderLine.pointAnchor(start, { x: startX, y: '100%' }), // Exact bottom border
                LeaderLine.pointAnchor(end, { x: '50%', y: -10 }),      // FIX: Pulled UP 10px to sit exactly on top
                {
                    color: 'rgba(56, 189, 248, 1)', // Sky-400 (Solid)
                    size: 3,
                    path: pathType,
                    startSocket: 'bottom',
                    endSocket: 'top',
                    // Square dashes
                    dash: { len: 5, gap: 5, animation: true },
                    dropShadow: false,
                    hide: true // Hide initially to allow 'draw' animation
                }
            );

            // FIX: Remove manual SVG move to avoid breaking LeaderLine reference/animation
            // Instead we rely on Z-Index to place it correctly.

            // Attach raw elements for easier filtering later (since .start/.end are Anchor objects now)
            line._startElem = start;
            line._endElem = end;

            // FIX: Move line to Overlay to fix Z-Index (Lines < Nodes)
            // We find the last SVG added to body which corresponds to this line
            const svgs = document.querySelectorAll('body > .leader-line');
            if (svgs.length > 0) {
                const lastSvg = svgs[svgs.length - 1];
                document.getElementById('about-overlay').appendChild(lastSvg);
                // Reset positioning to absolute relative to overlay
                lastSvg.style.zIndex = '-1'; // On top of BG, Behind Nodes
            }

            graphLines.push(line);
            return line;
        };

        // 1. Root Connections (Single Point Origin)
        // Root uses 'fluid' to CURVE as requested
        createLine(startNode, eduNode, '50%', 'fluid');
        createLine(startNode, expNode, '50%', 'straight');   // Center stays straight
        createLine(startNode, skillNode, '50%', 'fluid');

        // 2. Cascading Connections (Tiered)
        // All vertical drops use 'straight' to avoid glitches

        // --- Education Branch ---
        // Edu -> CS
        const nodeEdu1 = document.getElementById('node-edu-1');
        if (nodeEdu1) createLine(eduNode, nodeEdu1, '50%', 'straight');


        // --- Experience Branch ---
        // Exp -> Freelancing -> Trading -> AI Tuning
        const nodeExp1 = document.getElementById('node-exp-1');
        const nodeExp2 = document.getElementById('node-exp-2');
        const nodeExp3 = document.getElementById('node-exp-3');

        if (nodeExp1) createLine(expNode, nodeExp1, '50%', 'straight');
        if (nodeExp1 && nodeExp2) createLine(nodeExp1, nodeExp2, '50%', 'straight');
        if (nodeExp2 && nodeExp3) createLine(nodeExp2, nodeExp3, '50%', 'straight');


        // --- Skills Branch ---
        // Skill -> Python -> AI/ML -> Algo
        const nodeSkill1 = document.getElementById('node-skill-1');
        const nodeSkill2 = document.getElementById('node-skill-2');
        const nodeSkill3 = document.getElementById('node-skill-3');

        if (nodeSkill1) createLine(skillNode, nodeSkill1, '50%', 'straight');
        if (nodeSkill1 && nodeSkill2) createLine(nodeSkill1, nodeSkill2, '50%', 'straight');
        if (nodeSkill2 && nodeSkill3) createLine(nodeSkill2, nodeSkill3, '50%', 'straight');


    } catch (e) {
        console.error("Graph init failed:", e);
    }
}

// Function to update positions (call on scroll/resize)
function updateGraphPositions() {
    graphLines.forEach(line => line.position());
}


function triggerScrollAnimation() {
    animationTriggered = true;

    // Reset Visuals
    document.querySelectorAll('.graph-node, .leaf-node').forEach(n => {
        n.style.opacity = '0';
        n.style.transform = 'scale(0.8)';
    });

    // Re-Initialize Lines (Hidden)
    initGraph();

    // Ensure positions are correct
    updateGraphPositions();



    // --- STRICT 9-STEP ANIMATION SEQUENCE ---
    // Time Step (Base Unit)
    const STEP_DELAY = 900;
    const DRAW_DURATION = 800;

    // Step 1: Reveal Root (T=0)
    const startNode = document.getElementById('node-start');
    if (startNode) {
        startNode.style.opacity = '1';
        startNode.style.transform = 'scale(1)';
    }

    // Step 2: Draw Root -> Level 1 (T=600)
    setTimeout(() => {
        const rootLines = graphLines.filter(l => l._startElem === startNode);
        rootLines.forEach(l => {
            l.show('draw', { duration: DRAW_DURATION, timing: 'ease-out' });
            l.position();
        });
    }, 600);

    // Step 3: Reveal Level 1 (Edu, Exp, Skill) (T=1400)
    const T_L1_REVEAL = 600 + DRAW_DURATION;
    setTimeout(() => {
        ['node-edu', 'node-exp', 'node-skill'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.opacity = '1';
                el.style.transform = 'scale(1)';
            }
        });
    }, T_L1_REVEAL);

    // Step 4: Draw Level 1 -> Level 2 (Edu->CS, Exp->Free, Skill->Py)
    const T_L2_DRAW = T_L1_REVEAL + 400;
    setTimeout(() => {
        // Collect specific lines
        const targets = ['node-edu-1', 'node-exp-1', 'node-skill-1'];
        const targetEls = targets.map(id => document.getElementById(id));

        const l2Lines = graphLines.filter(l => targetEls.includes(l._endElem));
        l2Lines.forEach(l => {
            l.show('draw', { duration: DRAW_DURATION, timing: 'ease-out' });
            l.position();
        });
    }, T_L2_DRAW);

    // Step 5: Reveal Level 2 (CS, Free, Py)
    const T_L2_REVEAL = T_L2_DRAW + DRAW_DURATION;
    setTimeout(() => {
        ['node-edu-1', 'node-exp-1', 'node-skill-1'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.opacity = '1';
                el.style.transform = 'scale(1)';
            }
        });
    }, T_L2_REVEAL);

    // Step 6: Draw Level 2 -> Level 3 (Free->Trade, Py->AI/ML)
    // Note: Edu branch stops at L2
    const T_L3_DRAW = T_L2_REVEAL + 400;
    setTimeout(() => {
        const targets = ['node-exp-2', 'node-skill-2'];
        const targetEls = targets.map(id => document.getElementById(id));

        const l3Lines = graphLines.filter(l => targetEls.includes(l._endElem));
        l3Lines.forEach(l => {
            l.show('draw', { duration: DRAW_DURATION, timing: 'ease-out' });
            l.position();
        });
    }, T_L3_DRAW);

    // Step 7: Reveal Level 3 (Trade, AI/ML)
    const T_L3_REVEAL = T_L3_DRAW + DRAW_DURATION;
    setTimeout(() => {
        ['node-exp-2', 'node-skill-2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.opacity = '1';
                el.style.transform = 'scale(1)';
            }
        });
    }, T_L3_REVEAL);

    // Step 8: Draw Level 3 -> Level 4 (Trade->Tuning, AI/ML->Algo)
    const T_L4_DRAW = T_L3_REVEAL + 400;
    setTimeout(() => {
        const targets = ['node-exp-3', 'node-skill-3'];
        const targetEls = targets.map(id => document.getElementById(id));

        const l4Lines = graphLines.filter(l => targetEls.includes(l._endElem));
        l4Lines.forEach(l => {
            l.show('draw', { duration: DRAW_DURATION, timing: 'ease-out' });
            l.position();
        });
    }, T_L4_DRAW);

    // Step 9: Reveal Level 4 (Tuning, Algo)
    const T_L4_REVEAL = T_L4_DRAW + DRAW_DURATION;
    setTimeout(() => {
        ['node-exp-3', 'node-skill-3'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.opacity = '1';
                el.style.transform = 'scale(1)';
            }
        });
    }, T_L4_REVEAL);

}


function resetScrollAnimation() {
    animationTriggered = false;
    // Hide Nodes
    document.querySelectorAll('.graph-node, .leaf-node').forEach(n => {
        n.style.opacity = '0';
        n.style.transform = 'scale(0.8)';
    });
    // Clear graph
    disposeGraph();
    const svg = document.getElementById('graph-svg');
    if (svg) svg.innerHTML = '';
}


// --- EVENT LISTENERS ---
// Update line positions on scroll and resize
window.addEventListener('scroll', () => {
    requestAnimationFrame(updateGraphPositions);
}, { passive: true });

window.addEventListener('resize', () => {
    updateGraphPositions();
});

// Initial Reset
resetScrollAnimation();

// Navbar Highlight Logic
function updateHighlight(targetLink) {
    const highlight = document.getElementById('navbar-highlight');
    if (highlight && targetLink) {
        const center = targetLink.offsetLeft + targetLink.offsetWidth / 2;
        highlight.style.left = `${center}px`;
        highlight.style.opacity = '1';
    }
}

// Initial Highlight
const initialHome = document.querySelector('.nav-link[data-target="home"]');
if (initialHome) updateHighlight(initialHome);


// --- DYNAMIC HOME LAYOUT SCALING ---
function handleResize() {
    const width = window.innerWidth;
    const textContainer = document.querySelector('.home-text-inner');
    const mainTitle = document.getElementById('main-name');

    if (textContainer) {
        textContainer.style.transform = 'none';
        textContainer.style.width = 'auto';
        textContainer.style.maxWidth = '500px';
        textContainer.style.transformOrigin = 'center center';
        if (mainTitle) mainTitle.style.fontSize = '';

        if (width < 768) {
            textContainer.style.width = 'max-content';
            textContainer.style.maxWidth = 'none';
            const trueWidth = textContainer.offsetWidth;
            const availableWidth = width * 0.90;
            if (trueWidth > availableWidth) {
                const scale = availableWidth / trueWidth;
                textContainer.style.transform = `scale(${scale})`;
            }
        } else {
            const availableWidth = window.innerWidth * 0.5 - 40;
            const currentCardWidth = textContainer.offsetWidth;
            if (currentCardWidth > availableWidth) {
                const scale = (availableWidth / currentCardWidth) * 0.95;
                textContainer.style.transformOrigin = 'left center';
                textContainer.style.transform = `scale(${scale})`;
            }
        }
    }

    // Ensure graph paths are synced after layout changes
    if (currentSectionIndex === 1) {
        if (typeof updateGraphPositions === 'function') {
            updateGraphPositions();
        }
    }
}

window.addEventListener('resize', handleResize);
document.fonts.ready.then(handleResize);
window.addEventListener('load', handleResize);
setTimeout(handleResize, 100);





// --- DYNAMIC PROJECTS LOGIC ---

const projectsData = [
    // --- TRADING & AUTOMATION ---
    {
        category: 'trading',
        title: 'Arbitrage Bot',
        desc: 'Exploits price differences across multiple exchanges.',
        detail: 'View Details for full info.',
        img: '/assets/images/arbitrage.png',
        goal: 'To seek and exploit pricing inefficiencies between varying exchanges for a risk-free profit.',
        tech: 'Python, ccxt, AsyncIO, Redis',
        platform: 'Binance, Kraken, Coinbase',
        longDesc: `**Overview:** This high-frequency arbitrage system is designed to identify and exploit price discrepancies for the same cryptocurrency across multiple exchanges. The core principle is simple: buy low on one exchange, sell high on another, and pocket the difference. However, the implementation requires sophisticated engineering to handle network latency, partial fills, and fee structures.

**How It Works:** The bot maintains persistent WebSocket connections to 5+ major exchanges (Binance, Kraken, Coinbase, KuCoin, Bybit) to receive real-time order book updates with sub-100ms latency. When the best bid on Exchange A exceeds the best ask on Exchange B by more than a configurable threshold (typically 0.3-0.8% after fees), the system triggers a simultaneous buy/sell execution using AsyncIO for non-blocking parallel order placement. Pre-positioned capital on both exchanges eliminates transfer delays. A Redis cache stores current positions and pending orders to prevent over-exposure. The system includes a sophisticated fee calculator that accounts for maker/taker fees, withdrawal costs, and network gas fees for accurate profit estimation.

**Key Features:** Real-time monitoring of 100+ trading pairs across 5 exchanges; latency compensation algorithm that adjusts order timing based on historical exchange response times; automatic rebalancing when funds become unbalanced between exchanges; configurable minimum profit thresholds; comprehensive logging and Telegram alerts for executed trades.

**Limitations:** Arbitrage opportunities have shrunk significantly as markets mature and more participants compete for similar spreads. The system requires substantial capital pre-positioned on multiple exchanges (reducing capital efficiency). Withdrawal limits, network congestion (especially for ETH-based tokens), and occasional exchange downtime can trap funds. High-frequency trading on some exchanges may trigger API rate limits or account flags. Regulatory considerations vary by jurisdiction.`
    },
    {
        category: 'trading',
        title: 'Copy Trading',
        desc: 'Replicates trades from expert Binance accounts.',
        detail: 'View Details for full info.',
        img: '/assets/images/hft.png',
        goal: 'To democratize professional trading strategies by allowing users to mirror expert positions.',
        tech: 'Node.js, WebSocket, Binance API',
        platform: 'Binance Future/Spot',
        longDesc: `**Overview:** This copy trading engine allows users to automatically mirror the positions of expert traders on Binance Futures and Spot markets. By monitoring public or shared account streams, the system replicates trades in real-time with configurable position sizing, enabling less experienced traders to benefit from professional strategies.

**How It Works:** The system connects to Binance's WebSocket user data streams for the target "leader" account. When a new order or position change is detected (within 50-200ms), the engine calculates the proportional position size based on the follower's configured capital allocation and risk multiplier. Orders are then placed on the follower's account using the Binance API with market orders (for speed) or limit orders (for cost savings). The system maintains a position sync database that tracks the mapping between leader and follower positions, ensuring that partial closes and modifications are properly replicated. Stop-loss and take-profit orders placed by the leader are also mirrored.

**Key Features:** Configurable position multiplier (0.1x to 5x of leader's position size); maximum position limits to cap exposure; automatic stop-loss synchronization; slippage protection that cancels copy if price moves more than X% from leader's entry; real-time P&L dashboard comparing follower vs leader performance; support for multiple leaders with weighted allocation.

**Limitations:** There is an inherent latency (100-500ms) between the leader's trade and the follower's copy, which can result in different entry prices—especially in volatile markets. Large followers copying a leader with limited liquidity can cause market impact. The system relies on the leader's continued performance; past results do not guarantee future success. Binance may impose restrictions on API usage patterns that resemble this activity. Managing leverage appropriately is critical to avoid liquidation.`
    },
    {
        category: 'trading',
        title: 'Volume Bot',
        desc: 'Generates automated trading volume for liquidity.',
        detail: 'View Details for full info.',
        img: '/assets/images/grid.png',
        goal: 'To maintain active market appearance and deepen order book liquidity for new tokens.',
        tech: 'Python, Random Walk Algo',
        platform: 'KuCoin, Gate.io',
        longDesc: `**Overview:** This volume generation bot is designed to create organic-looking trading activity for newly listed tokens that lack natural liquidity. By simulating realistic trading patterns, it helps establish price discovery and attracts genuine traders who might otherwise skip illiquid markets.

**How It Works:** The bot operates using a multi-wallet system where it controls both buy and sell sides. It generates trade sizes following a Gaussian (normal) distribution centered around a typical retail trade size, avoiding suspiciously uniform orders. Trade timing uses a Poisson process to simulate random human activity—sometimes rapid bursts, sometimes quiet periods. The price stays within a configurable band around a target midpoint, executing limit orders that fill against each other. Advanced mode includes "spoofing" prevention by ensuring orders remain on the book for realistic durations before being filled or canceled. The system monitors the real order book and adjusts its behavior when organic traders appear.

**Key Features:** Configurable daily volume targets with automatic pacing; Gaussian randomization of order sizes to appear natural; Poisson-distributed trade timing; multi-wallet support to avoid detection; integration with exchange APIs on KuCoin, Gate.io, MEXC, and others; automatic pause when organic volume exceeds a threshold.

**Limitations:** Wash trading is illegal or against Terms of Service on most regulated exchanges—this tool should only be used where explicitly permitted (e.g., on certain DEXs or for market-making contracts). Excessive or obvious patterns may trigger exchange monitoring systems, leading to account suspension. The cost of trading fees accumulates and represents a real expense. Creating volume without genuine demand does not create sustainable liquidity—once the bot stops, volume will drop unless organic traders have entered.`
    },
    {
        category: 'trading',
        title: 'Market Making',
        desc: 'Provides buy/sell liquidity.',
        detail: 'View Details for full info.',
        img: '/assets/images/hft.png',
        goal: 'To reduce bid-ask spread and ensure stable price discovery for illiquid assets.',
        tech: 'C++, Hummingbot Customization',
        platform: 'DeFi & CEX pairs',
        longDesc: `**Overview:** This market making system continuously provides two-sided liquidity (bid and ask quotes) for trading pairs, profiting from the bid-ask spread while facilitating price discovery. Unlike passive liquidity provision, active market making dynamically adjusts quotes based on inventory, volatility, and order flow.

**How It Works:** The core algorithm is based on the Avellaneda-Stoikov model, implemented in C++ for maximum performance. It calculates optimal bid/ask prices as a function of current inventory position, time horizon, and risk aversion parameter. When inventory accumulates on one side (e.g., too many buys), the system skews quotes to encourage offsetting trades—lowering the ask to attract sellers. The system ingests real-time order book data and trade prints via WebSocket, updating quotes every 100-500ms. For DeFi pairs, it interfaces with Uniswap V3 concentrated liquidity positions, dynamically adjusting price ranges. On CEXs, it uses REST/WebSocket APIs to place and cancel limit orders.

**Key Features:** Avellaneda-Stoikov spread optimization; real-time volatility estimation using EWMA; inventory skew to maintain delta neutrality; configurable risk parameters; support for both CEX (Binance, OKX) and DEX (Uniswap, PancakeSwap) markets; comprehensive P&L tracking including fees and impermanent loss.

**Limitations:** Market making is capital-intensive and carries inventory risk—a strong directional move can leave the system holding a losing position. Competition from professional HFT firms means spreads are often too tight for retail market makers to profit. On DEXs, impermanent loss can exceed fee income during volatile periods. Gas costs on Ethereum mainnet can make frequent position adjustments uneconomical. The system requires continuous uptime; any downtime leaves stale quotes that may be adversely filled.`
    },
    {
        category: 'trading',
        title: 'Telegram Copy',
        desc: 'Executes trades based on Telegram signals.',
        detail: 'View Details for full info.',
        img: '/assets/images/arbitrage.png',
        goal: 'To automate trade execution from premium signal channels instantly.',
        tech: 'Python, Telethon, regex',
        platform: 'Telegram -> Any Exchange',
        longDesc: `**Overview:** This signal copier bridges premium Telegram trading signal channels directly to exchange execution. Instead of manually reading alerts and placing orders, the system parses incoming messages in real-time and executes trades within seconds of signal publication.

**How It Works:** The bot uses the Telethon library to connect to Telegram as a user client (not a bot), allowing it to read messages from private/premium channels. A sophisticated regex and NLP parser extracts structured data from unstructured signal messages—identifying the coin/pair, entry price or range, stop-loss level, and multiple take-profit targets (TP1, TP2, TP3). The parser handles various signal formats from different providers. Once parsed, the system calculates position size based on configured risk percentage and places orders via the exchange API. It supports market entry for immediate signals or limit orders for "buy the dip" setups. Trailing stop-loss updates sent by signal providers are also captured and applied.

**Key Features:** Supports 20+ signal message formats from popular providers; configurable risk per trade (e.g., 1-2% of account); automatic position sizing based on stop-loss distance; multi-TP management with partial closes; response time under 3 seconds from signal to order; comprehensive trade log with provider attribution.

**Limitations:** Signal quality varies dramatically between providers—the system executes whatever is received, so garbage in = garbage out. Slippage can be significant if many users copy the same signal simultaneously. Message parsing can fail for unusual formats or typos in signals. Telegram rate limits may delay message reception during high traffic. The "edge" of signals often diminishes as more people copy them; early subscribers get better fills.`
    },
    {
        category: 'trading',
        title: 'Zerodha EMA',
        desc: 'Automates EMA-crossover strategies.',
        detail: 'View Details for full info.',
        img: '/assets/images/grid.png',
        goal: 'To remove emotional bias from technical trading on the Indian stock market.',
        tech: 'Python, KiteConnect API',
        platform: 'Zerodha (NSE/BSE)',
        longDesc: `**Overview:** This automated trading system implements classic Exponential Moving Average (EMA) crossover strategies on Indian equities via the Zerodha KiteConnect API. It removes emotional decision-making from trading by executing predefined rules with mechanical precision.

**How It Works:** The system fetches real-time and historical candle data for a watchlist of Nifty 50 and BankNifty stocks. It calculates 9-period and 21-period EMAs on 5-minute and 15-minute timeframes. A bullish signal triggers when the 9 EMA crosses above the 21 EMA with confirming volume (above 20-day average), and the current price is above the 200 EMA (long-term trend filter). The system then places a bracket order with a stop-loss based on ATR (Average True Range)—typically 1.5x ATR below entry. Take-profit is set at 2x or 3x the risk (risk-reward ratio). The trailing stop-loss activates once 1x risk profit is achieved, locking in gains while allowing winners to run.

**Key Features:** Multi-timeframe analysis (5m, 15m, 1h); ATR-based dynamic stop-loss placement; bracket orders with automatic SL/TP; position sizing based on account equity and risk percentage; sector rotation logic to avoid correlated positions; daily P&L reports via email.

**Limitations:** EMA crossover strategies work best in trending markets—they suffer during choppy, range-bound conditions ("whipsaws"). The Indian market has specific trading hours (9:15 AM - 3:30 PM IST) and no pre/post-market trading, limiting reaction time to overnight news. KiteConnect API has rate limits and requires daily login token refresh. Brokerage fees and STT (Securities Transaction Tax) can eat into profits on frequent trades. The strategy has modest win rates (40-50%) but relies on larger winners than losers.`
    },
    {
        category: 'trading',
        title: 'IBKR Retracing',
        desc: 'Catches price retracements.',
        detail: 'View Details for full info.',
        img: '/assets/images/hft.png',
        goal: 'To capitalize on mean reversion after significant price deviations.',
        tech: 'Java, IBKR TWS API',
        platform: 'Interactive Brokers',
        longDesc: `**Overview:** This mean reversion trading system scans for stocks that have made extreme intraday moves and places limit orders at Fibonacci retracement levels, betting on a price pullback. It exploits the tendency of overextended moves to retrace before continuing or reversing.

**How It Works:** The system connects to Interactive Brokers TWS (Trader Workstation) via the Java API for real-time data and order execution. It monitors a universe of 500+ liquid US stocks for intraday moves exceeding 5% within 15-minute windows. When detected, it calculates Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8%) from the move's origin to peak. Limit buy orders (for downward retracements in an uptrend) or sell orders (for upward retracements in a downtrend) are placed at the 38.2% and 50% levels. Stop-losses are set just beyond the 0% level (full retrace), and take-profits target a return to the 78.6% level or higher. Position size is calculated based on the distance to stop-loss and maximum risk per trade.

**Key Features:** Real-time scanning of 500+ stocks for extreme moves; automatic Fibonacci level calculation; tiered entry at multiple levels for better average price; strict risk management with predetermined stops; integration with IBKR's professional-grade execution; support for both long and short retracement trades.

**Limitations:** Mean reversion strategies can fail spectacularly during momentum-driven moves (e.g., earnings surprises, FDA announcements) where price does not retrace. The strategy requires precise timing—entering too early catches a "falling knife," too late misses the opportunity. IBKR's PDT (Pattern Day Trader) rules require maintaining $25k minimum equity for US accounts. The Java TWS API is complex and requires careful error handling for production stability. Not all retracements reach the target; some turn into full reversals.`
    },
    {
        category: 'trading',
        title: 'Crypto Liquidity',
        desc: 'Enhances market depth dynamically.',
        detail: 'View Details for full info.',
        img: '/assets/images/grid.png',
        goal: 'To ensure sufficient depth at all price levels to prevent slippage.',
        tech: 'Python, PMM Algo',
        platform: 'Uniswap, PancakeSwap',
        longDesc: `**Overview:** This DeFi liquidity management bot actively manages concentrated liquidity positions in Uniswap V3 and PancakeSwap V3 pools. Unlike passive "set and forget" liquidity provision, it dynamically adjusts price ranges to stay in-range and maximize fee generation while minimizing impermanent loss.

**How It Works:** The bot monitors the current price and recent price history for pools where liquidity is deployed. It uses a Pure Market Making (PMM) algorithm to determine optimal price range width based on recent volatility—wider ranges during high volatility (reducing rebalance frequency), tighter ranges during stable periods (capturing more fees). When price approaches the edge of the current range (within 10%), the bot withdraws liquidity from the old position and redeploys in a new range centered around the current price. This "range following" approach ensures the position is always earning fees. The system also tracks impermanent loss in real-time and can pause rebalancing if cumulative IL exceeds a threshold.

**Key Features:** Automated range rebalancing based on price movement; volatility-adaptive range width; multi-pool support across Uniswap (Ethereum) and PancakeSwap (BSC); real-time P&L tracking including fees earned vs IL incurred; gas cost optimization by batching operations; configurable rebalance thresholds.

**Limitations:** Impermanent loss is a fundamental risk in AMM liquidity provision—it cannot be eliminated, only managed. High gas fees on Ethereum mainnet can make frequent rebalancing unprofitable; Layer 2 (Arbitrum, Optimism) or BSC are more economical. Smart contract risk exists—bugs or exploits in the DEX could result in loss of funds. The strategy works best for stablecoin pairs or highly correlated assets where IL is minimized. Extreme volatility (flash crashes, rug pulls) can result in significant losses before rebalancing occurs.`
    },
    {
        category: 'trading',
        title: 'Grid Bot',
        desc: 'Profitable automation for sideways markets.',
        detail: 'View Details for full info.',
        img: '/assets/images/grid.png',
        goal: 'To harvest volatility in ranging markets with zero directional risk.',
        tech: 'Node.js, React Dashboard',
        platform: 'ByBit, OKX',
        longDesc: `**Overview:** This grid trading bot is designed to profit from price oscillations in sideways (ranging) markets. It places a grid of buy and sell orders at predefined intervals, automatically buying low and selling high as price bounces within the range. The strategy is particularly effective for assets that exhibit consistent volatility without strong trends.

**How It Works:** The user defines a price range (e.g., $25,000 - $35,000 for BTC) and the number of grid levels (e.g., 20 grids). The bot divides the range into equal intervals and places buy limit orders below the current price and sell limit orders above it. As price moves up, sell orders are filled, taking profit; as price moves down, buy orders are filled, accumulating the asset at lower prices. Each filled buy order triggers a new sell order one grid level above, and vice versa. The bot continuously captures small profits from every oscillation. Features include "Trailing Up" mode where the entire grid shifts upward during a breakout, and "Stop Grid" which liquidates all positions if price crashes below the range.

**Key Features:** Configurable grid levels (10-200 grids); arithmetic or geometric grid spacing; trailing grid for trend capture; stop-loss and take-profit for the entire grid; real-time P&L dashboard built with React; support for spot and futures trading; multi-pair grid management.

**Limitations:** Grid bots lose money in strong trending markets—if price breaks out above the range, all sell orders fill and the bot holds only the quote currency (missing further upside). If price crashes below the range, the bot holds a losing position in the base currency. Capital efficiency is low because funds are spread across many grid levels. High grid counts increase fees from frequent small trades. The strategy requires careful range selection based on support/resistance analysis; a poorly chosen range leads to losses.`
    },
    {
        category: 'trading',
        title: 'Triple EMA',
        desc: 'High-frequency scalping engine.',
        detail: 'View Details for full info.',
        img: '/assets/images/hft.png',
        goal: 'To scalp small profits rapidly using trend confirmation indicators.',
        tech: 'Rust, WebSocket, tokio',
        platform: 'Binance Futures',
        longDesc: `**Overview:** This high-frequency scalping bot is built in Rust for maximum performance and minimal latency. It uses a Triple Exponential Moving Average (TEMA) strategy on very short timeframes to capture small, high-probability momentum moves in cryptocurrency futures markets.

**How It Works:** The bot connects to Binance Futures via WebSocket for real-time kline (candlestick) data on 1-minute and 5-minute timeframes. It calculates the TEMA (a smoothed EMA that reduces lag) on periods of 5, 13, and 34. A long signal triggers when the fast TEMA (5) crosses above the medium TEMA (13), both are above the slow TEMA (34), and the ADX (trend strength) exceeds 20. The bot enters with a market order and sets a tight stop-loss (0.3% below entry) and take-profit (0.5% above entry). With 10x-20x leverage, these small moves translate to 3-10% account gains per trade. The Rust implementation using tokio for async I/O achieves order placement within 5-10ms of signal generation, crucial for scalping where milliseconds matter.

**Key Features:** Ultra-low latency Rust implementation; Triple EMA for reduced lag compared to standard EMA; ADX filter to avoid trading in choppy conditions; configurable leverage and position sizing; automatic websocket reconnection; comprehensive trade logging with microsecond timestamps.

**Limitations:** Scalping is highly sensitive to execution quality—slippage and fees can eliminate thin margins. The strategy requires near-perfect uptime; missed signals or delayed execution turns winners into losers. High leverage amplifies both gains and losses; a string of losses can quickly blow up an account. Binance Futures rate limits may affect order frequency during high-activity periods. The strategy works best during volatile market hours (US/EU overlap) and underperforms during low-liquidity Asian sessions. Mental fatigue can set in even for automated systems that require monitoring.`
    },
    {
        category: 'trading',
        title: 'CSV Analyzer',
        desc: 'Robust tool for backtesting strategies.',
        detail: 'View Details for full info.',
        img: '/assets/images/arbitrage.png',
        goal: 'To validate trading hypotheses on historical data before risking capital.',
        tech: 'Python, Pandas, Backtrader',
        platform: 'Local / Cloud',
        longDesc: `**Overview:** This comprehensive backtesting framework allows traders to test their strategies against historical market data before deploying real capital. It ingests large datasets (CSV format) containing tick-level or candlestick data and simulates trade execution with realistic assumptions about slippage, fees, and order fills.

**How It Works:** The system uses Pandas for high-performance data manipulation of multi-gigabyte datasets. Historical data is loaded, indexed by timestamp, and fed into the Backtrader framework which simulates a virtual broker. Trading strategies are defined as Python classes that implement entry/exit logic based on technical indicators (SMA, RSI, MACD, etc.) or custom signals. The backtest engine steps through each bar, triggers orders when conditions are met, and tracks positions, equity curves, and drawdowns. After completion, it generates comprehensive reports including Sharpe Ratio, Sortino Ratio, Maximum Drawdown, Win Rate, Profit Factor, and trade-by-trade logs. Optimization mode runs parameter sweeps (grid search or genetic algorithms) to find optimal settings.

**Key Features:** Supports tick, minute, hourly, and daily data; realistic slippage and commission modeling; multi-asset portfolio backtesting; walk-forward analysis to prevent overfitting; Monte Carlo simulation for robustness testing; HTML report generation with equity curve charts.

**Limitations:** Backtests are inherently subject to overfitting—a strategy that works on historical data may fail in live markets. Data quality is critical; missing data or survivorship bias can skew results. The system cannot account for market impact (large orders moving the market) or liquidity constraints. Past performance does not guarantee future results. Execution in live markets differs from simulated fills.`
    },
    {
        category: 'trading',
        title: 'Renko Charts',
        desc: 'Custom Renko using TV Lightweight library.',
        detail: 'View Details for full info.',
        img: '/assets/images/grid.png',
        goal: 'To visualize price action without noise (time) for clearer trend identification.',
        tech: 'JavaScript, TradingView Lightweight',
        platform: 'Web',
        longDesc: `**Overview:** This project implements Renko charting on top of the TradingView Lightweight Charts library, which natively only supports candlestick, bar, and line charts. Renko charts filter out time and minor price movements, showing only significant price changes as "bricks," making trends easier to identify.

**How It Works:** Renko bricks are drawn only when price moves by a specified "brick size" (e.g., $100 for BTC). Unlike candlesticks that form at fixed time intervals, a Renko brick only appears when price exceeds the previous brick's high (for an up brick) or falls below a low (for a down brick) by the brick size. This JavaScript implementation fetches OHLCV data from an API, processes it through a custom Renko algorithm that calculates brick transitions, then renders the bricks as a custom series on TradingView Lightweight. Colors indicate direction (green up, red down). Support/resistance levels become more obvious as noise is removed.

**Key Features:** Configurable brick size (fixed or ATR-based); real-time updates as new price data arrives; integration with TradingView Lightweight's pan/zoom and crosshair features; optional wicks to show intra-brick price extremes; exportable brick data for algorithmic analysis.

**Limitations:** Renko charts can obscure the timing of moves—you know price moved X bricks but not exactly when during the day. They lose information about volume and intraday volatility. Brick size selection is crucial; too small creates noise, too large misses opportunities. The library requires manual implementation since it's not a native chart type. Not suitable for time-sensitive analysis like news trading.`
    },
    {
        category: 'trading',
        title: 'OCR Signal',
        desc: 'Extracts signals from images/screenshots.',
        detail: 'View Details for full info.',
        img: '/assets/images/vision.png',
        goal: 'To digitize and execute trade setups shared as chart images/screenshots.',
        tech: 'Python, Tesseract, OpenCV',
        platform: 'Desktop / Server',
        longDesc: `**Overview:** This computer vision system extracts trading signals from chart screenshots shared on social media, Discord, or Telegram. Many traders share setups as images with drawn boxes or lines indicating entry zones, stop-loss, and take-profit—this tool converts those visual annotations into executable trades.

**How It Works:** The system uses OpenCV for image preprocessing (cropping, rotation correction, contrast enhancement) and Tesseract OCR for text extraction. For price levels, it detects horizontal lines and colored rectangles (often green for entries, red for stops) using edge detection and contour analysis. Once lines are identified, it reads nearby text labels (e.g., "Entry: 45,000" or "SL: 44,500") using OCR. A trained classifier distinguishes between different annotation styles. The extracted data is structured into a trade signal object with pair, entry, stop-loss, and take-profit levels, which can then be sent to an exchange API for order placement. A confidence score indicates extraction reliability.

**Key Features:** Supports multiple annotation styles and chart platforms (TradingView, TrendSpider, etc.); automatic price scale detection using axis labels; color-based zone classification (green = buy, red = sell/stop); batch processing for analyzing many screenshots; integration with Telegram/Discord bots for real-time image analysis.

**Limitations:** OCR accuracy depends heavily on image quality; blurry or low-resolution screenshots fail. Handwritten annotations are harder to parse than typed text. The system may misinterpret decorative elements as trading zones. Complex multi-timeframe analyses with many lines can confuse the detector. Confirmation by the trader before execution is recommended to avoid costly errors from misreads.`
    },
    {
        category: 'trading',
        title: 'TV Webhook',
        desc: 'Bridges TradingView alerts to exchange.',
        detail: 'View Details for full info.',
        img: '/assets/images/hft.png',
        goal: 'To turn any PineScript strategy into an auto-trading system.',
        tech: 'Python, Flask, Ngrok',
        platform: 'TradingView -> Crypto Exchange',
        longDesc: `**Overview:** This webhook server receives trading alerts from TradingView and automatically executes orders on connected cryptocurrency exchanges. It bridges TradingView's powerful charting and PineScript strategy capabilities with actual trade execution.

**How It Works:** TradingView alerts can include a webhook URL in the notification settings. When an alert fires (e.g., "MACD crossover on BTC"), TradingView sends a POST request with user-defined data to this server. The Flask application parses the incoming JSON payload which contains the ticker symbol, action (buy/sell), quantity, and optional price. After validating the request with a secret key, it routes the order to the appropriate exchange API (Binance, ByBit, Coinbase, etc.) using ccxt. The server runs locally behind Ngrok for a public URL or on a cloud VPS for 24/7 availability. Orders can be market (immediate) or limit (at a specified price). Responses and order IDs are logged and can trigger confirmation alerts back to the user via Telegram.

**Key Features:** Supports multiple exchanges via ccxt; configurable position sizing (fixed or percentage); secret key authentication to prevent unauthorized orders; order type selection (market/limit); retry logic for failed orders; comprehensive logging for trade reconciliation; Telegram notifications for fills and errors.

**Limitations:** There is latency between TradingView's alert and order execution (typically 1-5 seconds depending on network); this matters for fast-moving markets. TradingView free accounts have limited alert counts. The system requires a stable internet connection; downtime means missed signals. Ngrok free tier has connection limits and URL changes on restart. PineScript strategies may repaint (change signals retroactively), leading to different backtest vs live results. Security of API keys on the server is the user's responsibility.`
    },
    {
        category: 'trading',
        title: 'Market Screener',
        desc: 'Real-time scanner for assets.',
        detail: 'View Details for full info.',
        img: '/assets/images/grid.png',
        goal: 'To filter thousands of assets instantly to find trade setups.',
        tech: 'Python, ccxt, Multiprocessing',
        platform: 'All Exchanges',
        longDesc: `**Overview:** This real-time market scanning engine monitors hundreds of cryptocurrency pairs simultaneously, filtering for user-defined technical conditions. It replaces hours of manual chart-checking with instant alerts when setups appear.

**How It Works:** The scanner uses Python's multiprocessing module to parallelize data fetching across 500+ trading pairs from multiple exchanges via ccxt. Each worker process fetches recent OHLCV data and calculates technical indicators (RSI, MACD, Bollinger Bands, Volume, EMAs, etc.). User-defined filter rules are applied, such as "RSI < 30 AND Volume > 2x 20-day average AND Price above 200 EMA." Pairs matching all conditions are flagged. The system runs continuously, checking all pairs every 1-5 minutes. Matches trigger Telegram notifications with the pair name, current price, and which conditions were met. A web dashboard displays all currently matching assets and their indicator values.

**Key Features:** Parallel scanning of 500+ pairs in under 30 seconds; customizable filter rules with AND/OR logic; support for 30+ technical indicators; multi-exchange scanning (Binance, ByBit, OKX, KuCoin); historical alert log; integration with other bots (can auto-trigger trades when conditions match); web UI for real-time monitoring.

**Limitations:** Scanning introduces slight delays—by the time an alert fires, the opportunity may have partially passed. False positives are common; technical conditions don't guarantee profitable trades. Data quality from exchange APIs can vary; occasionally erroneous candles trigger false alerts. High scan frequency increases API load and may hit rate limits. The system requires continuous uptime to not miss setups. Condition tuning is an art—too strict finds nothing, too loose creates noise.`
    },
    {
        category: 'trading',
        title: 'Hedge Bot',
        desc: 'Automates hedging to minimize risk.',
        detail: 'View Details for full info.',
        img: '/assets/images/arbitrage.png',
        goal: 'To protect portfolio value during black swan events or market corrections.',
        tech: 'Python, Delta Neutral Strat',
        platform: 'Deribit Options / Futures',
        longDesc: `**Overview:** This automated hedging system protects a cryptocurrency portfolio from downside risk by dynamically opening short positions or purchasing put options when predefined risk thresholds are breached. It acts as an insurance policy that activates automatically during market stress.

**How It Works:** The bot continuously monitors the portfolio's unrealized P&L and calculates a "beta-weighted" delta exposure—essentially, how much the portfolio would lose for a 1% drop in BTC (the market benchmark). When cumulative drawdown exceeds a threshold (e.g., -5%), the hedging logic activates. It can either (1) open short perpetual futures on Binance/ByBit to offset long exposure or (2) purchase put options on Deribit for defined-risk protection. The hedge size is calculated to achieve a target delta (e.g., reducing portfolio beta from 1.0 to 0.3). As the portfolio recovers or further declines, the hedge ratio is dynamically adjusted. Trailing stop-losses on hedges lock in gains from successful protection.

**Key Features:** Real-time portfolio risk monitoring; automatic hedge activation on drawdown thresholds; choice of futures (cheaper, unlimited risk) or options (premium cost, capped risk); dynamic hedge ratio adjustment; support for multi-asset portfolios with different betas; email and Telegram alerts for hedge events.

**Limitations:** Hedging costs money—futures carry funding rates, options expire worthless if not needed. The system can "whipsaw" if the market drops, triggers a hedge, then immediately recovers (locking in losses). Options pricing on Deribit can be illiquid for certain strikes. Delta estimation for altcoins vs BTC is imperfect. The bot cannot predict crashes—it reacts after drawdown occurs, so the initial loss is not avoided. Overhedging can cap upside during recovery.`
    },
    {
        category: 'trading',
        title: 'IBKR Watcher',
        desc: 'Real-time monitoring for IBKR positions.',
        detail: 'View Details for full info.',
        img: '/assets/images/hft.png',
        goal: 'To provide mobile alerts and safety checks for institutional accounts.',
        tech: 'Node.js, Twilio API, IBKR',
        platform: 'Interactive Brokers',
        longDesc: `**Overview:** This monitoring system provides real-time supervision of Interactive Brokers accounts, sending SMS and phone call alerts when critical thresholds are breached. It acts as a safety net for traders who can't constantly watch their positions, especially during overnight hours.

**How It Works:** The Node.js application connects to IBKR's Client Portal API or TWS to fetch account status every 30 seconds. It tracks Net Liquidation Value (NLV), Excess Liquidity, Margin Requirements, and individual position P&L. User-defined alert rules trigger notifications: "NLV drops below $100,000," "Excess Liquidity below 20%," "Single position loss exceeds $5,000." When a rule triggers, the Twilio API sends an SMS immediately. For critical alerts (margin below 15%), it escalates to a phone call that reads the alert via text-to-speech. The system logs all events and can optionally execute defensive actions (close all positions, cancel open orders) on critical thresholds.

**Key Features:** Real-time account monitoring with 30-second refresh; configurable alert thresholds for NLV, margin, and position P&L; multi-channel notifications (SMS, phone call, email, Telegram); alert escalation (SMS first, then phone if unacknowledged); optional automated defensive actions; historical alert log and account snapshot storage.

**Limitations:** The IBKR Client Portal API requires periodic re-authentication (every 24 hours); if credentials expire, monitoring stops until refreshed. TWS connection requires the desktop application to be running. There is inherent latency (30-60 seconds) between market moves and alert delivery. Twilio has per-message costs. Automated position closure during volatile markets can lock in avoidable losses. Does not prevent overnight gaps—alerts arrive after the damage.`
    },

    {
        category: 'trading',
        title: 'Google Cloud Auto',
        desc: 'GCP infrastructure automation.',
        detail: 'View Details for full info.',
        img: '/assets/images/google_cloud_auto_1770210508124.png',
        goal: 'To reduce manual DevOps overhead by automating the provisioning, scaling, and teardown of cloud resources.',
        tech: 'Python, Google Cloud SDK, Terraform, Pub/Sub',
        platform: 'Google Cloud Platform',
        longDesc: `**Overview:** This infrastructure automation suite eliminates repetitive DevOps tasks on Google Cloud Platform. It programmatically provisions, scales, and tears down cloud resources based on triggers, schedules, or demand—reducing both operational overhead and cloud costs.

**How It Works:** The system combines Terraform for declarative infrastructure-as-code with the Google Cloud SDK for imperative commands. Infrastructure blueprints define VMs, Cloud Functions, BigQuery datasets, and networking in .tf files. A Python orchestration layer triggers Terraform apply/destroy based on events received via Pub/Sub. Example: a Pub/Sub message at 9 AM spins up a 10-node compute cluster for backtesting; another message at 6 PM tears it down. Cloud Scheduler sends these messages on a cron schedule. For dynamic scaling, Cloud Functions monitor resource usage and publish scale-up/down messages. All changes are logged, and alerts fire if provisioning fails.

**Key Features:** Terraform-based infrastructure-as-code for version control and reproducibility; Pub/Sub event-driven triggers for real-time or scheduled actions; automatic teardown to prevent forgotten resources accruing costs; multi-environment support (dev/staging/prod); cost tracking per project; Slack notifications for provisioning events.

**Limitations:** Terraform state management requires careful attention; state file corruption can cause drift. Pub/Sub messages can be delayed during outages, affecting schedule reliability. Complex infrastructure graphs have long apply times. IAM permissions must be carefully scoped to prevent security issues. Debugging failed provisioning across multiple GCP services requires deep platform knowledge. Not suitable for truly instant scaling needs—VM spin-up takes 30-60 seconds.`
    },
    {
        category: 'trading',
        title: 'Sheet Extractor',
        desc: 'Automated data extraction.',
        detail: 'View Details for full info.',
        img: '/assets/images/sheet_extractor_1770210526491.png',
        goal: 'To automate the extraction of structured data from complex, multi-tab Google Sheets into clean formats for analysis.',
        tech: 'Python, gspread, Pandas, OAuth2',
        platform: 'Google Sheets, Local/Cloud Server',
        longDesc: `**Overview:** This ETL (Extract, Transform, Load) tool automates the extraction of data from Google Sheets—often used as ad-hoc databases by non-technical teams—into structured formats suitable for analysis or database ingestion.

**How It Works:** The script authenticates with Google Sheets API using OAuth2 service account credentials, enabling access to shared spreadsheets without user interaction. It reads sheet metadata to discover tabs, then iterates through each tab, mapping columns dynamically based on header rows. Data types are inferred (dates, numbers, strings), null values are handled according to configurable rules (fill with zeros, forward-fill, or drop row), and the cleaned data is exported to CSV, JSON, or directly inserted into PostgreSQL/BigQuery via SQLAlchemy. A schema validation step ensures expected columns exist and data types match. Scheduled via cron or Cloud Scheduler for hourly/daily runs.

**Key Features:** Multi-sheet and multi-tab extraction in a single run; dynamic column mapping for changing schemas; data type inference and validation; null value handling with configurable strategies; direct database insertion; Slack/email notifications for job success/failure; audit logging for data lineage.

**Limitations:** Google Sheets API has rate limits (300 requests per minute per project); large sheets may require pagination. Sheets with merged cells or irregular structures fail the parser. Formula-dependent cells return computed values, not formulas. Changes to sheet structure (renamed columns) can break extraction until mappings are updated. OAuth2 token refresh requires periodic re-authorization for certain grant types.`
    },
    {
        category: 'trading',
        title: 'Selenium Scraper',
        desc: 'Web scraping automation.',
        detail: 'View Details for full info.',
        img: '/assets/images/selenium_scraper_1770210543692.png',
        goal: 'To gather data from dynamic JavaScript-heavy websites where simple HTTP requests fail.',
        tech: 'Python, Selenium, BeautifulSoup, ChromeDriver',
        platform: 'Web (any dynamic site)',
        longDesc: `**Overview:** This web scraping framework handles modern JavaScript-heavy websites that cannot be scraped with simple HTTP requests. Using a headless browser, it renders pages fully before extraction, enabling data collection from sites protected by dynamic loading or login walls.

**How It Works:** Selenium WebDriver controls a headless Chrome browser (via ChromeDriver) to navigate websites exactly as a human would. The framework handles login flows by filling username/password fields, clicking submit buttons, and waiting for session cookies. For infinite scroll pages, it executes JavaScript to scroll down and waits for new content to load. AJAX requests are intercepted and awaited before extraction. Once the page is fully rendered, BeautifulSoup parses the HTML to extract structured data using CSS selectors or XPath. Anti-bot measures are circumvented with randomized delays between actions (2-7 seconds), rotating user-agent strings, and proxy rotation for IP diversity.

**Key Features:** Headless browser for full JavaScript rendering; login flow automation with session persistence; infinite scroll and pagination handling; proxy rotation and user-agent randomization; data export to CSV, JSON, or databases; retry logic for failed page loads; screenshot capture for debugging.

**Limitations:** Selenium is slow compared to HTTP-based scraping—each page load takes 3-10 seconds. ChromeDriver must match the installed Chrome version; updates can break the setup. Heavily protected sites (Cloudflare, reCAPTCHA) may still block access. Scraping may violate website Terms of Service and could have legal implications. Resource-intensive—each browser instance uses significant RAM. Not suitable for scraping thousands of pages quickly.`
    },
    {
        category: 'trading',
        title: 'Sheet Processor',
        desc: 'Complex data processing in Sheets.',
        detail: 'View Details for full info.',
        img: '/assets/images/sheet_processor_1770210846462.png',
        goal: 'To automate complex business logic (calculations, formatting, validation) directly within Google Sheets.',
        tech: 'Google Apps Script, JavaScript',
        platform: 'Google Sheets',
        longDesc: `**Overview:** This Google Apps Script project extends the native capabilities of Google Sheets with custom functions, automated workflows, and integrations. It enables non-technical users to leverage powerful automation within their familiar spreadsheet environment without learning Python or external tools.

**How It Works:** The script is deployed as a bound script within a Google Sheet, providing custom menu items and automated triggers. Custom functions (e.g., =FETCH_PRICE("BTC")) retrieve data from external APIs directly into cells. Automated validation scripts run on every edit, flagging rows that violate business rules (missing data, out-of-range values) with color-coded highlighting. Cross-sheet lookups consolidate data from multiple sheets or even other spreadsheets in the Drive. Time-driven triggers schedule report generation—exporting formatted PDFs and emailing them to stakeholders. For external integration, the script can send POST requests to webhooks, Slack, or other APIs.

**Key Features:** Custom spreadsheet functions callable from any cell; automated validation and formatting on data entry; scheduled report generation and email distribution; integration with external APIs (fetch live data, send notifications); menu-based UI for non-technical users; logging and audit trail for changes.

**Limitations:** Google Apps Script has a 6-minute execution limit for regular scripts (30 minutes for some Google Workspace tiers). API quotas apply (e.g., UrlFetch: 20,000 calls/day). Debugging is less robust than full IDE environments. Complex logic in Scripts makes spreadsheets slow and harder to maintain. No version control integration; code lives in the script editor. Breaking API changes or deprecated methods can silently fail.`
    },
    {
        category: 'trading',
        title: 'Excel Comparator',
        desc: 'Diff tool for Excel sheets.',
        detail: 'View Details for full info.',
        img: '/assets/images/excel_comparator_1770210864258.png',
        goal: 'To identify and highlight differences between two versions of an Excel workbook for audit or reconciliation.',
        tech: 'Python, openpyxl, difflib',
        platform: 'Desktop / Cloud Server',
        longDesc: `**Overview:** This file comparison utility identifies and highlights differences between two versions of an Excel workbook. It is used for audit, reconciliation, and version control of spreadsheet-based reports where changes must be tracked.

**How It Works:** The tool uses openpyxl to load both Excel files (.xlsx) into memory. It iterates sheet-by-sheet, comparing cell values (and optionally formulas) between the "old" and "new" files. A difflib-based algorithm identifies three categories: additions (cells in new file but not in old), deletions (cells in old file but not in new), and modifications (cells with different values). Each category is assigned a highlight color code (green for additions, red for deletions, yellow for changes). A combined output workbook is generated with all differences highlighted in place. A summary sheet lists all changes with sheet name, cell address, old value, and new value. Large files (millions of cells) are processed using memory-mapped reading to avoid RAM exhaustion.

**Key Features:** Sheet-by-sheet comparison with row/column alignment handling; color-coded difference highlighting in output file; summary report of all changes; formula vs value comparison toggle; handling of inserted/deleted rows (not just changed values); PDF summary export for auditors.

**Limitations:** Row insertion/deletion detection relies on heuristics and can produce false positives for heavily restructured sheets. Large files with 1M+ cells can still be slow (minutes to process). Formatting differences (fonts, borders) are not compared—only data. Password-protected sheets must be unlocked first. The tool does not track change history; it only compares two snapshots. Images and charts embedded in Excel are not compared.`
    },

    // --- AI & ML ---
    {
        category: 'ai',
        title: 'RAG ChatGPT',
        desc: 'Custom LLM with document retrieval.',
        detail: 'View Details for full info.',
        img: '/assets/images/rag_chatbot_1770212058012.png',
        goal: 'To build a private, context-aware chatbot that answers questions based on proprietary documents.',
        tech: 'Python, LangChain, OpenAI API, Pinecone/Chroma',
        platform: 'Web App, Local Server',
        longDesc: `**Overview:** This Retrieval-Augmented Generation (RAG) chatbot answers domain-specific questions by grounding LLM responses in your private documents. Unlike vanilla ChatGPT which relies on its training data, this system retrieves relevant context from your knowledge base before generating answers—dramatically reducing hallucinations.

**How It Works:** Documents (PDFs, Word docs, text files) are ingested and split into chunks of ~500 tokens. Each chunk is converted into a dense vector embedding using OpenAI's text-embedding-ada-002 (or open-source alternatives like sentence-transformers). These vectors are stored in a vector database (Pinecone for cloud scale, or Chroma/FAISS for local). When a user asks a question, it is also embedded, and the top-k most similar document chunks are retrieved via cosine similarity. These chunks are injected into the LLM prompt as context: "Based on the following documents: [chunks], answer: [question]." The LLM (GPT-4, Claude, or Llama) generates an answer grounded in retrieved facts. LangChain orchestrates the retrieval and generation pipeline.

**Key Features:** Support for multiple document types (PDF, DOCX, TXT, HTML); automatic chunking with overlap for context continuity; hybrid search (keyword + semantic) for better recall; conversation memory for follow-up questions; citation of source document and page number; web UI with streaming responses.

**Limitations:** RAG accuracy depends on document quality—outdated or contradictory documents lead to wrong answers. Retrieval can fail for questions requiring synthesis across many documents. Embedding models have limits (~8k tokens per call). Large document sets require significant vector database storage. Latency increases with retrieval complexity. The system cannot reason beyond what's in the documents—it won't "know" things not indexed.`
    },
    {
        category: 'ai',
        title: 'Hand Gesture',
        desc: 'Real-time gesture recognition.',
        detail: 'View Details for full info.',
        img: '/assets/images/vision.png',
        goal: 'To enable touchless interaction with computers using hand gestures detected via webcam.',
        tech: 'Python, OpenCV, MediaPipe, TensorFlow',
        platform: 'Desktop (Webcam required)',
        longDesc: `**Overview:** This computer vision project enables touchless control of applications using hand gestures. A webcam captures your hand movements, and a machine learning model recognizes gestures to trigger actions like play/pause, volume control, or presentation navigation—no hardware beyond a camera required.

**How It Works:** Google's MediaPipe Hands library detects 21 hand landmarks (fingertips, knuckles, palm) in real-time from the webcam stream at 30+ FPS. These landmarks are extracted as normalized (x, y, z) coordinates, creating a 63-dimensional feature vector per frame. A custom TensorFlow classifier (a small dense neural network) is trained on a labeled dataset of gestures: thumbs up, peace sign, open palm, fist, pointing, etc. The classifier outputs gesture predictions every frame. Temporal smoothing (majority vote over 5 frames) reduces flickering. Recognized gestures are mapped to keyboard/mouse commands via PyAutoGUI—e.g., "thumbs up" = play, "fist" = pause, "swipe left" (detected via landmark velocity) = previous slide.

**Key Features:** Real-time gesture recognition at 30+ FPS; support for 10+ customizable gestures; MediaPipe for robust hand detection under varying lighting; configurable gesture-to-action mappings; works with any application (sends standard keyboard commands); training mode to add new custom gestures.

**Limitations:** Accuracy drops in poor lighting or when hands are partially occluded. Two-handed gestures are harder to distinguish. Background clutter with skin-tone colors can confuse detection. Latency of ~100-200ms may feel slow for gaming. The model was trained on adult hands—children's smaller hands may have reduced accuracy. Requires a clear view of the hand; gestures under a table or off-camera edges won't work.`
    },
    {
        category: 'ai',
        title: 'Fingerprint AI',
        desc: 'Image enhancement for latent prints.',
        detail: 'View Details for full info.',
        img: '/assets/images/vision.png',
        goal: 'To enhance low-quality fingerprint images for forensic analysis and matching.',
        tech: 'Python, OpenCV, U-Net (Segmentation), GAN',
        platform: 'Desktop / Server',
        longDesc: `**Overview:** This forensic image processing project takes degraded, partial, or noisy fingerprint images ("latent prints") and enhances them to a quality suitable for comparison against clean reference prints. It aids law enforcement and forensic analysts in identifying suspects from crime scene evidence.

**How It Works:** The pipeline consists of multiple stages. First, classical image processing (OpenCV) applies Gaussian blur, morphological operations, and Gabor filter banks to enhance ridge structure. A U-Net segmentation model isolates the fingerprint region from background noise and debris. Ridge orientation estimation calculates the local direction of ridges, which informs a directional filter that sharpens along ridge lines. Finally, a Generative Adversarial Network (super-resolution GAN) upscales and reconstructs missing ridge details by hallucinating plausible patterns based on training on high-quality prints. The output is a clean, high-contrast binary image of ridges suitable for minutiae extraction and AFIS (Automated Fingerprint Identification System) matching.

**Key Features:** Multi-stage enhancement pipeline combining classical CV and deep learning; U-Net for precise fingerprint region segmentation; Gabor filter banks for ridge enhancement; Super-resolution GAN for reconstructing degraded areas; batch processing for multiple images; export compatible with AFIS systems.

**Limitations:** The GAN can "hallucinate" ridge patterns that don't exist in the original—potentially creating false minutiae. Extremely damaged prints (over 70% missing) cannot be reliably enhanced. The model was trained primarily on optical sensor prints; latent prints from crime scenes (which may have different textures) require fine-tuning. Forensic use requires careful validation; enhanced prints should be treated as leads, not evidence. GPU recommended for GAN inference speed.`
    },
    {
        category: 'ai',
        title: 'MCP Server',
        desc: 'Model Context Protocol implementation.',
        detail: 'View Details for full info.',
        img: '/assets/images/rag.png',
        goal: 'To create a standardized interface for connecting AI tools and models to various data sources.',
        tech: 'Python, FastAPI, MCP Spec',
        platform: 'Server / Cloud',
        longDesc: `**Overview:** This project implements Anthropic's Model Context Protocol (MCP)—an open standard for connecting AI assistants to external data sources and tools. It acts as a bridge between AI models (Claude, ChatGPT, local LLMs) and your private files, databases, and APIs.

**How It Works:** The server is built with FastAPI, exposing endpoints that conform to the MCP specification. It defines "resources" (data sources) and "tools" (actions). A resource might be a folder of documents, a PostgreSQL database, or a REST API. When an MCP-compatible AI assistant needs information, it queries the MCP server: "List files in /reports" or "Read row 42 from users table." The server performs the operation and returns structured data. Tools allow the AI to take actions: "Send email to X" or "Create a calendar event." Authentication uses API keys or OAuth2 for security. The schema is discoverable—the AI can ask the server what resources/tools are available.

**Key Features:** Full implementation of MCP resource and tool specifications; file system, database (PostgreSQL, SQLite), and API resource types; tool execution with sandboxed permissions; API key and OAuth2 authentication; schema discovery for dynamic integration; logging of all AI interactions for audit.

**Limitations:** MCP is a new, evolving specification—breaking changes may occur. Not all AI clients support MCP natively (may require plugins or adapters). Tool execution poses security risks if permissions are too broad; careful scoping is essential. Performance depends on the underlying data source—slow database queries mean slow AI responses. The server must run continuously for AI access; downtime breaks integrations. No built-in caching—repeated queries hit the data source each time.`
    },
    {
        category: 'ai',
        title: 'Price Predictor',
        desc: 'LSTM/Transformer based forecasting.',
        detail: 'View Details for full info.',
        img: '/assets/images/price_predictor_1770212076445.png',
        goal: 'To forecast future price movements of financial assets using deep learning.',
        tech: 'Python, TensorFlow/Keras, LSTM, Transformer',
        platform: 'Cloud (GPU required for training)',
        longDesc: `**Overview:** This deep learning project forecasts future price movements of financial assets (stocks, crypto) using sequence models. It ingests historical OHLCV data and outputs a probability of price direction (up/down) or a predicted price level for the next time period.

**How It Works:** Historical data is fetched via APIs and preprocessed: normalized to 0-1 range, sequenced into sliding windows (e.g., 60 timesteps), and split into train/validation/test sets (80/10/10). The architecture is a hybrid LSTM-Transformer: LSTM layers capture short-term temporal dependencies, while a Transformer attention mechanism identifies long-range patterns (e.g., weekly cycles). The model outputs either (a) a binary classification (up/down) with sigmoid activation or (b) a regression value (predicted price) with linear activation. Training uses Adam optimizer with learning rate scheduling and early stopping. Feature engineering includes technical indicators (RSI, MACD, Bollinger Bands) as additional input channels. Walk-forward validation prevents train/test leakage.

**Key Features:** Hybrid LSTM-Transformer architecture; support for multi-asset training; technical indicator feature engineering; walk-forward validation for realistic evaluation; probability calibration for trading thresholds; model explainability via attention weights.

**Limitations:** Financial markets are inherently unpredictable; even 60% directional accuracy is considered good. Overfitting is a severe risk—models can memorize spurious patterns. Performance degrades during regime changes (bull to bear market). High-frequency prediction (minute bars) is much harder than daily/weekly. Latency and execution costs are not modeled. The model cannot predict black swan events (sudden news, crashes). Profitable backtests often fail in live trading due to slippage, fees, and market impact.`
    },
    {
        category: 'ai',
        title: 'CNN Patterns',
        desc: 'Identifies candlestick patterns via CNN.',
        detail: 'View Details for full info.',
        img: '/assets/images/cnn_patterns_1770212097689.png',
        goal: 'To automate the detection of bullish/bearish candlestick formations traditionally spotted by human analysts.',
        tech: 'Python, TensorFlow/Keras, CNN (VGG16 variant)',
        platform: 'Cloud / Local GPU',
        longDesc: `**Overview:** This computer vision project trains a Convolutional Neural Network to recognize traditional Japanese candlestick patterns (Hammer, Doji, Engulfing, etc.) from chart images. It automates a task typically performed by visual inspection, enabling faster pattern screening across many assets.

**How It Works:** A dataset of 50,000+ labeled chart screenshots is prepared, each showing a specific candlestick pattern in the final 3-5 bars. Labels include 20+ pattern types: Hammer, Inverted Hammer, Doji, Bullish/Bearish Engulfing, Morning/Evening Star, Three White Soldiers, etc. The CNN architecture uses transfer learning from VGG16 (pre-trained on ImageNet), replacing the classification head with pattern-specific dense layers. Data augmentation (slight shifts, brightness variations) improves robustness. The model is trained with cross-entropy loss and validated on a held-out test set. At inference, real-time chart screenshots are captured, resized, and fed to the model, which outputs pattern probabilities. Patterns above a confidence threshold trigger alerts.

**Key Features:** Recognition of 20+ candlestick patterns; transfer learning from VGG16 for faster training; data augmentation for robustness; real-time inference pipeline (capture → classify → alert); confidence thresholds to reduce false positives; integration with trading systems for automated entries.

**Limitations:** Pattern recognition does not imply profitable trading—many patterns fail to predict the expected move. Screenshot quality affects accuracy; low-resolution or cluttered charts fail. The model was trained on a specific charting style; different platforms (light mode, different candle colors) require retraining. Class imbalance (rare patterns) can skew predictions. Visual pattern recognition inherently loses the numerical precision of raw data. Some patterns are subjective even for humans, introducing label noise.`
    },
    {
        category: 'ai',
        title: 'GAN Generator',
        desc: 'Generative Adversarial Network for art.',
        detail: 'View Details for full info.',
        img: '/assets/images/vision.png',
        goal: 'To generate creative digital artwork using AI.',
        tech: 'Python, PyTorch, StyleGAN2-ADA',
        platform: 'Cloud (A100/V100 GPU)',
        longDesc: `**Overview:** This generative AI project creates original digital artwork using StyleGAN2-ADA. The model learns the statistical patterns of a curated art dataset and can generate infinite unique images in that style.

**How It Works:** StyleGAN2-ADA is trained on a dataset of ~10,000 curated art images (abstract, surrealist, or a specific artist's style). The GAN consists of a Generator (creates images from random noise) and a Discriminator (distinguishes real from generated). Through adversarial training, the Generator learns to produce increasingly convincing images. The "-ADA" suffix indicates Adaptive Discriminator Augmentation, which prevents overfitting on small datasets. Once trained (requires ~24-48 hours on an A100 GPU), the Generator can produce unlimited novel images by sampling different latent vectors. Style mixing interpolates between two generated images, creating smooth morphing animations. Truncation tricks control the diversity vs quality tradeoff.

**Key Features:** High-resolution image generation (1024x1024); style mixing for creative variations; latent space interpolation for morphing animations; truncation control for diversity; trained model checkpoint for instant generation; web interface for non-technical users.

**Limitations:** Training requires expensive GPU hardware (A100 recommended, V100 minimum). Generated images inherit biases from the training dataset. The model cannot generate specific requested content—only random samples in the learned style. Copyright status of AI-generated art is legally ambiguous. Outputs can occasionally include artifacts or deformities. Fine-tuning on new styles requires retraining or transfer learning.`
    },
    {
        category: 'ai',
        title: 'Flappy Bird AI',
        desc: 'Reinforcement learning agent.',
        detail: 'View Details for full info.',
        img: '/assets/images/vision.png',
        goal: 'To train an AI agent to play Flappy Bird at superhuman levels using reinforcement learning.',
        tech: 'Python, Pygame, NEAT Algorithm',
        platform: 'Local Desktop',
        longDesc: `**Overview:** This reinforcement learning project evolves neural networks to play Flappy Bird using the NEAT (NeuroEvolution of Augmenting Topologies) algorithm. It serves as an educational demonstration of how evolution-inspired algorithms can produce intelligent behavior without explicitly coding rules.

**How It Works:** The game is implemented in Pygame. Each "bird" is controlled by a small neural network that takes inputs (bird Y position, distance to next pipe, pipe gap position) and outputs a single action (flap or not). NEAT starts with minimal networks (no hidden layers) and evolves complexity over generations. Each generation, hundreds of birds play simultaneously. Fitness is determined by how long they survive (how many pipes they pass). The top performers are selected, and their "genomes" (network topology + weights) undergo crossover (combining two parents) and mutation (random weight changes, node/connection additions). Over ~20-50 generations, networks evolve that can achieve infinite scores. A visual mode shows all birds playing in real-time, illustrating natural selection in action.

**Key Features:** Visual demonstration of neuroevolution; real-time multi-agent gameplay display; configurable NEAT parameters (population size, mutation rates); fitness graphs showing progress across generations; ability to save/load evolved champions; educational codebase for learning NEAT.

**Limitations:** NEAT is computationally expensive for complex environments—Flappy Bird is ideal due to its simplicity. Evolution can get stuck in local optima (e.g., birds that only dodge low pipes). Results vary between runs due to stochastic nature. Not applicable to games requiring long-term planning or complex state. The learned behavior is specific to the environment—different pipe physics require retraining.`
    },
    {
        category: 'ai',
        title: 'GenAI Optimizer',
        desc: 'Optimizes LLM/Diffusion settings.',
        detail: 'View Details for full info.',
        img: '/assets/images/rag.png',
        goal: 'To automatically find optimal hyperparameters for generative AI models based on output quality.',
        tech: 'Python, Optuna, Weights & Biases',
        platform: 'Cloud / Local',
        longDesc: `**Overview:** This hyperparameter optimization framework automates the tuning of generative AI models (LLMs and diffusion models) to maximize output quality. Instead of manually experimenting with settings, the system runs intelligent search to find optimal configurations.

**How It Works:** The framework uses Optuna for Bayesian optimization, which learns from previous trials to suggest promising hyperparameter combinations. For LLMs, it tunes: temperature (creativity), top_p (nucleus sampling), frequency_penalty, and presence_penalty. For diffusion models (Stable Diffusion, DALL-E), it tunes: guidance scale, inference steps, scheduler type, and noise schedule. Each trial generates sample outputs which are scored automatically (CLIP score for images, perplexity for text) or via human preference (A/B testing interface). Weights & Biases tracks all experiments, visualizing the parameter-performance landscape. Early stopping automatically halts unpromising trials. The result is a configuration file specifying optimal settings for the use case.

**Key Features:** Bayesian optimization for efficient hyperparameter search; support for LLMs (GPT, Claude, Llama) and diffusion models; automatic CLIP/perplexity scoring; human preference collection interface; W&B integration for experiment tracking; early stopping for cost efficiency; exportable optimal config.

**Limitations:** Optimization requires many API calls—can be expensive for commercial APIs (GPT-4). Quality metrics (CLIP score) don't always correlate with human preference. Different prompts may have different optimal settings; results may not generalize. Human labeling for preference data is time-consuming. The search space grows exponentially with parameters—focus on 3-5 key hyperparameters.`
    },
    {
        category: 'ai',
        title: 'PPO Predictor',
        desc: 'Proximal Policy Optimization for trading.',
        detail: 'View Details for full info.',
        img: '/assets/images/hft.png',
        goal: 'To develop a self-learning trading agent using state-of-the-art reinforcement learning.',
        tech: 'Python, Stable-Baselines3, OpenAI Gym',
        platform: 'Cloud (GPU for training)',
        longDesc: `**Overview:** This reinforcement learning project trains a trading agent using the Proximal Policy Optimization (PPO) algorithm. The agent learns to make buy/sell/hold decisions by maximizing cumulative profit in a simulated market environment, discovering trading strategies through trial and error.

**How It Works:** The environment is built using the OpenAI Gym interface. State includes: current position (long/short/flat), unrealized P&L, recent price history (as normalized returns), and technical indicators (RSI, MACD). Action space is discrete: buy, sell, or hold. The reward function is the change in portfolio value with penalties for excessive drawdown and high volatility (Sharpe-like shaping). PPO, implemented via Stable-Baselines3, trains a neural network policy by sampling trajectories, computing advantage estimates, and updating the policy within a trust region (preventing catastrophic forgetting). Training runs for millions of timesteps over historical data. Walk-forward evaluation tests on unseen periods. The trained policy can be deployed for live signal generation, though actual execution is handled by a separate system.

**Key Features:** Gym-compatible trading environment; PPO with custom reward shaping for Sharpe optimization; support for multiple assets; walk-forward backtesting; TensorBoard logging of training progress; live inference mode for signal generation.

**Limitations:** Reinforcement learning for trading is notoriously difficult—most agents overfit to training data and fail on new data. Reward design is crucial and hard to get right. Transaction costs and slippage are approximated in simulation but differ in reality. Training is computationally intensive and unstable (requires many runs). The agent cannot adapt to regime changes without retraining. Live deployment requires robust risk management around the agent's signals.`
    },
    {
        category: 'ai',
        title: 'Medicine Scan',
        desc: 'OCR & classification for meds.',
        detail: 'View Details for full info.',
        img: '/assets/images/vision.png',
        goal: 'To identify medicines from images of pills, tablets, or packaging.',
        tech: 'Python, OpenCV, Tesseract, MobileNet',
        platform: 'Mobile / Desktop',
        longDesc: `**Overview:** This computer vision system identifies medicines from photos of pills, tablets, capsules, or packaging. It helps patients verify medications, especially for those with multiple prescriptions who may confuse similar-looking pills.

**How It Works:** The pipeline has two branches: OCR and visual classification. For packaged medicines, Tesseract OCR reads the drug name from labels, cross-referencing a database (RxNorm, FDA) for verification. For loose pills, a MobileNet classifier (trained on the NIH Pill Image Recognition Dataset) identifies the pill by shape, color, and imprint. Image preprocessing includes background removal, color normalization, and edge enhancement. The combined result returns the drug name, strength, manufacturer, common uses, and potential interactions (via drugbank API). Confidence scores indicate reliability. For ambiguous cases, it presents top-3 candidates for user selection.

**Key Features:** Dual OCR + visual classification pipeline; trained on NIH Pill Image Dataset (10,000+ pill images); drug interaction checking via API; works on mobile (TensorFlow Lite) and desktop; confidence scores for verification; support for multiple pills in one image.

**Limitations:** Accuracy is limited for generic pills without imprints or with worn markings. Similar-looking pills from different manufacturers may be confused. The model was trained on US medications; international drugs may fail. Blurry or poorly lit photos reduce accuracy. The system provides identification, not medical advice—users should always confirm with pharmacists. Pill databases require periodic updates as new drugs are approved.`
    },
    {
        category: 'ai',
        title: 'CNN BMI',
        desc: 'Estimates BMI from facial images.',
        detail: 'View Details for full info.',
        img: '/assets/images/vision.png',
        goal: 'To provide a rough BMI estimate from a photograph for health awareness applications.',
        tech: 'Python, TensorFlow/Keras, VGGFace',
        platform: 'Mobile / Web App',
        longDesc: `**Overview:** This experimental computer vision project estimates Body Mass Index (BMI) from facial photographs. While not clinically accurate, it demonstrates the correlation between facial features and body composition, serving as a gamified health awareness tool.

**How It Works:** Research shows facial features (face width-to-height ratio, cheek fullness, jawline definition) correlate weakly with BMI. The model uses VGGFace (pre-trained for face recognition) with a regression head that outputs a continuous BMI value. Training data comes from public datasets (VisualBMI, VIP) containing face images with self-reported BMI labels. The model is fine-tuned to minimize mean squared error between predicted and actual BMI. At inference, a face is detected, cropped, aligned, and fed to the network. The output BMI is categorized (underweight, normal, overweight, obese) with a confidence range. TensorFlow Lite deployment enables on-device inference for privacy.

**Key Features:** Face detection and alignment preprocessing; VGGFace transfer learning; on-device inference via TensorFlow Lite; BMI category classification with ranges; gamified health awareness UI; privacy-preserving (no images sent to servers).

**Limitations:** This is NOT a medical tool—predictions have high error rates (typically ±5 BMI units). Facial features are poor predictors of body composition compared to weight/height measurement. The training data relies on self-reported BMI, introducing label noise. Accuracy varies by age, ethnicity, and gender (model trained primarily on adults). Face angle, lighting, and expressions affect results. Should never be used for medical decisions.

> [!WARNING]
> This project is for educational and entertainment purposes only. BMI estimation from facial images is inherently inaccurate and should not be used for health decisions.`
    },


    // --- IOT ---
    {
        category: 'iot',
        title: 'Home Auto 485',
        desc: 'RS485 wired home automation.',
        detail: 'View Details for full info.',
        img: '/assets/images/home_auto_485_1770207889229.png',
        goal: 'To create a reliable, low-latency wired home automation system using industrial RS485 protocol.',
        tech: 'ESP32, RS485 Transceiver, Modbus Protocol, Home Assistant',
        platform: 'Embedded / Home Server',
        longDesc: `**Overview:** This wired home automation system uses industrial-grade RS485 communication for rock-solid reliability. Unlike WiFi-based smart home systems that suffer from interference, range issues, and latency, this hard-wired approach provides consistent sub-10ms response times.

**How It Works:** Multiple ESP32 nodes are deployed throughout the home—each controlling lights, fans, motorized blinds, or reading sensor data (temperature, humidity, motion). All nodes connect via twisted-pair cable using RS485 differential signaling, which is noise-resistant and works up to 1km distances. Communication uses the Modbus RTU protocol, where the central controller (also an ESP32) polls each node for status and sends commands. The controller integrates with Home Assistant via MQTT, enabling voice control (Alexa/Google Home), scheduling, and automation rules. Failsafe logic ensures lights default to "on" if communication is lost.

**Key Features:** RS485 differential signaling for industrial-grade reliability; Modbus RTU protocol for standardized communication; sub-10ms latency for instant response; Home Assistant integration for smart home features; support for 127 nodes per bus; fail-safe modes for critical devices.

**Limitations:** Wired installation is labor-intensive compared to WiFi retrofits—best for new construction or renovation. RS485 requires proper cable runs (twisted pair, preferably shielded). Modbus polling introduces slight latency as more devices are added. Firmware updates require physical access or OTA per-node. Debugging bus issues (termination, grounding) can be challenging. Limited to on/off and dimming—complex devices may need custom protocol implementation.`
    },
    {
        category: 'iot',
        title: 'Water Level',
        desc: 'Ultrasonic tank monitoring.',
        detail: 'View Details for full info.',
        img: '/assets/images/water_level_monitor_1770207905600.png',
        goal: 'To remotely monitor water tank levels and receive alerts when levels are critical.',
        tech: 'ESP8266, HC-SR04 Ultrasonic, MQTT, Node-RED',
        platform: 'Embedded Device + Cloud Dashboard',
        longDesc: `**Overview:** This IoT project monitors water tank levels in real-time using an ultrasonic sensor. Readings are sent to a cloud dashboard, and alerts notify homeowners when levels are critically low (pump dry risk) or high (overflow risk).

**How It Works:** An ESP8266 microcontroller powers an HC-SR04 ultrasonic sensor mounted at the top of the tank. The sensor sends ultrasonic pulses and measures the time for echoes to return, calculating the distance to the water surface. Knowing the tank height, the system computes fill percentage (e.g., water at 30cm from top in a 100cm tank = 70% full). Readings are published every 5 minutes via MQTT to a cloud broker. A Node-RED dashboard visualizes the level with a gauge and historical graph. Alert rules trigger push notifications: below 20% ("pump may run dry"), above 95% ("overflow imminent"). The device enters deep sleep between measurements to conserve battery if solar-powered.

**Key Features:** Non-contact ultrasonic measurement (no corrosion issues); WiFi connectivity for remote monitoring; Node-RED dashboard with real-time gauge; configurable high/low alert thresholds; deep sleep mode for battery operation; historical data logging.

**Limitations:** Ultrasonic sensors can give false readings if condensation forms on the sensor face. Narrow tank openings cause echo interference. WiFi range limits outdoor tank placement; a repeater or cellular module may be needed. The HC-SR04 is not rated for outdoor use without enclosure. Battery-powered versions need solar panels or periodic recharging. Accuracy is ±2cm, which may not suffice for small tanks.`
    },
    {
        category: 'iot',
        title: 'Fish Feeder',
        desc: 'Automated aquarium feeder.',
        detail: 'View Details for full info.',
        img: '/assets/images/smart_fish_feeder_1770207945257.png',
        goal: 'To automate daily fish feeding schedules with remote control capabilities.',
        tech: 'Arduino Nano, Servo Motor, RTC Module, Blynk App',
        platform: 'Embedded Device + Mobile App',
        longDesc: `**Overview:** This automated fish feeder ensures your aquarium fish are fed consistently, even when you're away. It dispenses precise portions on a programmable schedule and can be triggered manually via smartphone from anywhere in the world.

**How It Works:** An Arduino Nano controls a servo motor attached to a food hopper with a rotating dispenser disk. When triggered, the servo rotates a calibrated angle, dropping a specific portion of food into the tank. A DS3231 Real-Time Clock module (battery-backed for power outages) maintains accurate time and triggers feeding at preset schedules (e.g., 8 AM and 6 PM). The Blynk IoT platform provides a mobile app interface connected via WiFi (using an ESP01 module or NodeMCU). The app shows the last feeding time, allows manual "Feed Now" commands, and lets users adjust schedules remotely. A simple portion-size dial on the device allows physical adjustment.

**Key Features:** Scheduled feeding via RTC with battery backup; manual remote feeding via Blynk app; adjustable portion sizes; last-feed timestamp display; vacation mode (increased portions); low-food warning (optional sensor).

**Limitations:** The dispenser mechanism can jam with wet or clumped food; dry pellets or flakes are recommended. WiFi connectivity is required for remote features—RTC handles local scheduling offline. The servo can wear over time; periodic maintenance is needed. Overfeeding due to multiple manual triggers is possible—consider a cooldown period. Power outages with depleted RTC battery will reset the schedule. Not suitable for live food or frozen food dispensing.`
    },
    {
        category: 'iot',
        title: 'Ghost Lamp',
        desc: 'Motorized desk lamp.',
        detail: 'View Details for full info.',
        img: '/assets/images/robotic_ghost_lamp_1770207973191.png',
        goal: 'To create an interactive desk lamp inspired by Pixar that responds to sound and gestures.',
        tech: 'Arduino Mega, Servo Motors (x3), Sound Sensor, PCA9685 Driver',
        platform: 'Desktop / Embedded',
        longDesc: `**Overview:** This kinetic desk lamp is inspired by Pixar's iconic lamp "Luxo Jr." It moves on three axes (pan, tilt, nod) in response to sounds and gestures, creating the illusion of a curious, animate object with personality.

**How It Works:** An Arduino Mega controls three servo motors via a PCA9685 PWM driver board for smooth, simultaneous motion. A sound sensor (MAX4466) detects loud sounds (claps, voices) and determines the direction of the sound using stereo microphones. When triggered, the lamp "looks" toward the sound source. Gesture recognition via an IR break-beam sensor or ultrasonic distance sensor enables control: one clap for brightness up, two claps for brightness down, sustained proximity for power toggle. The lamp shade houses an RGB LED strip that changes color temperature. Idle animations (occasional small movements) give the lamp life even when not triggered. All behavior is configurable via serial commands or a simple web interface.

**Key Features:** 3-axis articulated motion (pan, tilt, nod); sound-responsive "listening" behavior; gesture control for brightness and power; RGB LED with color temperature adjustment; idle animations for personality; configurable behavior profiles.

**Limitations:** Servo noise can be audible in quiet environments. The sound-direction detection works best in quiet rooms; background noise confuses it. The mechanical structure requires precise 3D printing or assembly to avoid binding. Servos draw significant current—a dedicated 5V power supply is needed. Repeated rapid movements can wear servo gears. The lamp is a curiosity piece, not practical task lighting due to its motion focus.`
    },
    {
        category: 'iot',
        title: 'Fan Control',
        desc: 'Temp-based speed control.',
        detail: 'View Details for full info.',
        img: '/assets/images/sensor.png',
        goal: 'To automatically regulate fan speed based on ambient temperature for comfort and energy savings.',
        tech: 'ESP32, DHT22 Sensor, TRIAC Dimmer, PID Algorithm',
        platform: 'Embedded / Smart Home',
        longDesc: `**Overview:** This smart fan controller automatically adjusts ceiling or pedestal fan speed based on room temperature. It replaces a manual regulator with a smart TRIAC-based dimmer, integrating with smart home platforms for voice control and schedules.

**How It Works:** An ESP32 microcontroller reads ambient temperature from a DHT22 sensor. A target temperature is set by the user (e.g., 25°C). A PID (Proportional-Integral-Derivative) control algorithm calculates the required fan speed to reach and maintain this target. The output drives a TRIAC-based AC dimmer module to smoothly adjust fan speed (not just on/off steps like traditional regulators). The ESP32 connects to WiFi and integrates with Home Assistant via MQTT, enabling voice commands ("Hey Google, set fan to 70%") and automation rules ("Turn fan on when temperature exceeds 27°C"). A physical button on the device allows manual override.

**Key Features:** PID control for smooth, stable temperature regulation; TRIAC dimming for continuous speed control (not stepped); WiFi connectivity for smart home integration; voice control via Alexa/Google Home; manual override button; temperature logging for analysis.

**Limitations:** TRIAC dimming works for AC induction fans but not DC or BLDC fans (which require different control). Some fans hum or buzz at low speeds due to TRIAC waveform distortion. High-wattage fans may require a beefier TRIAC module. The DHT22 sensor has ±0.5°C accuracy; placement matters (avoid drafts or heat sources). PID tuning requires experimentation for optimal response. Power cuts reset the ESP32; last settings are restored from flash memory. Safety: working with mains AC voltage requires proper electrical knowledge.`
    }
];

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    // Check for custom tags
    const tagsHtml = project.tags
        ? `<div class="card-footer-tags">${project.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
        : '';

    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <div class="card-img-container">
                    <img src="${project.img}" alt="${project.title}">
                </div>
                <div class="card-front-content">
                    <h4>${project.title}</h4>
                    <p class="card-desc">${project.desc}</p>
                </div>
            </div>
            <div class="card-back">
                <p>${project.detail}</p>
                ${tagsHtml}
                <button class="more-btn">More</button>
            </div>
        </div>
    `;
    return card;
}

// 1. Render Preview (Limited to 3-4 per category)
function renderProjectsPreview() {
    const categories = ['trading', 'ai', 'iot'];

    // Determine limit based on width (optional, simplified to 4 for now)
    const limit = window.innerWidth < 768 ? 2 : 4;

    categories.forEach(cat => {
        const container = document.querySelector(`.project-category[data-category="${cat}"] .projects-scroll-row`);
        if (!container) return;

        container.innerHTML = ''; // Clear current

        const filtered = projectsData.filter(p => p.category === cat).slice(0, limit);

        filtered.forEach(p => {
            container.appendChild(createProjectCard(p));
        });
    });
}

// 2. Render Sector Grid (Full View)
function openSectorOverlay(categoryName) {
    const overlay = document.getElementById('sector-overlay');
    const titleEl = overlay.querySelector('.sector-title');
    const gridEl = overlay.querySelector('.sector-grid');

    // Filter Logic
    const filtered = projectsData.filter(p => p.category === categoryName);

    // Populate Grid
    gridEl.innerHTML = '';
    filtered.forEach((p, i) => {
        const card = createProjectCard(p);
        // Stagger Animation
        card.style.animationDelay = `${i * 100}ms`; // 100ms staggering
        card.classList.add('slide-up');
        gridEl.appendChild(card);
    });

    // Set Title
    const titleMap = {
        'trading': 'Trading & Automation',
        'ai': 'AI & Machine Learning',
        'iot': 'Home & IOT'
    };
    titleEl.textContent = titleMap[categoryName] || categoryName.toUpperCase();

    // Show Overlay
    overlay.classList.add('active');

    // UI ISOLATION: Hide Nav, Sidebar, Scroll
    const navbar = document.getElementById('navbar');
    const sidebar = document.getElementById('right-sidebar');
    const scrollInd = document.querySelector('.scroll-indicator');

    if (navbar) navbar.classList.add('ui-hidden');
    if (sidebar) sidebar.classList.add('ui-hidden');
    if (scrollInd) scrollInd.classList.add('ui-hidden');

    document.body.style.overflow = 'hidden'; // Lock Body Scroll
}

function closeSectorOverlay() {
    const overlay = document.getElementById('sector-overlay');
    overlay.classList.remove('active');

    // UI RESTORATION
    const navbar = document.getElementById('navbar');
    const sidebar = document.getElementById('right-sidebar');
    const scrollInd = document.querySelector('.scroll-indicator');

    if (navbar) navbar.classList.remove('ui-hidden');
    if (sidebar) sidebar.classList.remove('ui-hidden');
    if (scrollInd) scrollInd.classList.remove('ui-hidden');

    document.body.style.overflow = ''; // Release Body Scroll
}

// --- EVENT LISTENERS FOR PROJECTS ---

// Category Headers -> Open Grid (Event Delegation)
document.addEventListener('click', (e) => {
    // Check if clicked element is inside a project category header
    const header = e.target.closest('.project-category h3');
    if (header) {
        console.log("Project Category Clicked");
        // Find parent category
        const wrapper = header.closest('.project-category');
        if (wrapper) {
            const cat = wrapper.getAttribute('data-category');
            console.log("Category:", cat);
            if (cat) openSectorOverlay(cat);
        }
    }
});

// Back Button -> Close Grid
const backBtn = document.querySelector('#sector-overlay .back-btn');
if (backBtn) {
    backBtn.addEventListener('click', closeSectorOverlay);
}

// Initial Render
window.addEventListener('load', renderProjectsPreview);
window.addEventListener('resize', () => {
    // Re-render preview on resize to adjust limits if needed
    renderProjectsPreview();
});

// Initial call in case load already fired
// Initial call in case load already fired
renderProjectsPreview();


// --- PROJECT DETAILS VIEW LOGIC ---

function openProjectDetails(project) {
    const detailsOverlay = document.getElementById('project-details-overlay');
    if (!detailsOverlay) return;

    // Populate Data
    detailsOverlay.querySelector('.details-title').textContent = project.title;
    detailsOverlay.querySelector('.details-goal').textContent = project.goal || project.detail; // Fallback

    // Parse longDesc to extract sections
    const longDesc = project.longDesc || project.detail || '';

    // Helper function to extract section content
    function extractSection(text, sectionName) {
        const regex = new RegExp(`\\*\\*${sectionName}:\\*\\*\\s*`, 'i');
        const sections = ['Overview', 'How It Works', 'Key Features', 'Limitations'];
        const currentIndex = sections.findIndex(s => s.toLowerCase() === sectionName.toLowerCase());

        // Find where this section starts
        const match = text.match(regex);
        if (!match) return '';

        const startIndex = text.indexOf(match[0]) + match[0].length;

        // Find where the next section starts (or end of string)
        let endIndex = text.length;
        for (let i = currentIndex + 1; i < sections.length; i++) {
            const nextRegex = new RegExp(`\\*\\*${sections[i]}:\\*\\*`, 'i');
            const nextMatch = text.match(nextRegex);
            if (nextMatch) {
                const nextPos = text.indexOf(nextMatch[0]);
                if (nextPos > startIndex && nextPos < endIndex) {
                    endIndex = nextPos;
                }
            }
        }

        return text.substring(startIndex, endIndex).trim();
    }

    // Extract and populate each section
    const overviewText = extractSection(longDesc, 'Overview');
    const howItWorksText = extractSection(longDesc, 'How It Works');
    const keyFeaturesText = extractSection(longDesc, 'Key Features');
    const limitationsText = extractSection(longDesc, 'Limitations');

    detailsOverlay.querySelector('.details-overview').textContent = overviewText || 'No overview available.';
    detailsOverlay.querySelector('.details-how-it-works').textContent = howItWorksText || 'No details available.';
    detailsOverlay.querySelector('.details-key-features').textContent = keyFeaturesText || 'No features listed.';
    detailsOverlay.querySelector('.details-limitations').textContent = limitationsText || 'No limitations noted.';

    // Tech & Platform
    detailsOverlay.querySelector('.details-tech').textContent = project.tech || 'N/A';
    detailsOverlay.querySelector('.details-platform').textContent = project.platform || 'N/A';

    // Show Overlay
    detailsOverlay.classList.add('active');

    // Ensure UI Hidden (if jumping directly)
    document.getElementById('navbar').classList.add('ui-hidden');
    document.getElementById('right-sidebar').classList.add('ui-hidden');
    document.querySelector('.scroll-indicator').classList.add('ui-hidden');
    document.body.style.overflow = 'hidden';
}

function closeProjectDetails() {
    const detailsOverlay = document.getElementById('project-details-overlay');
    detailsOverlay.classList.remove('active');

    // Restore UI elements when closing project details
    // (They get hidden when opening project details but weren't being restored)
    const navbar = document.getElementById('navbar');
    const rightSidebar = document.getElementById('right-sidebar');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    if (navbar) navbar.classList.remove('ui-hidden');
    if (rightSidebar) rightSidebar.classList.remove('ui-hidden');
    if (scrollIndicator) scrollIndicator.classList.remove('ui-hidden');
    document.body.style.overflow = '';
}

// Event Listeners for Details
// Event Listeners for Details
document.addEventListener('click', (e) => {
    // 1. "View Details" Click (Card Front or Back Button)
    const card = e.target.closest('.project-card');

    // Trigger if card is clicked (works for both Grid and Preview)
    if (card) {
        // Find project data
        const title = card.querySelector('h4').textContent;
        // Match logic: title match
        const project = projectsData.find(p => p.title === title || p.title.includes(title));

        // Populate fallback data if detailed fields are missing (since data update failed)
        // temporary fix until data is robust
        if (project && !project.goal) {
            project.goal = "Full goal details coming soon.";
            project.longDesc = project.detail;
            project.tech = project.tags ? project.tags.join(', ') : "Python, Automated Systems, Details Pending";
            project.platform = "Trading Platform";
        }

        if (project) {
            openProjectDetails(project);
        }
    }

    // 2. Back Button in Details
    if (e.target.closest('.details-back-btn')) {
        closeProjectDetails();
    }

    // 3. Get in Touch CTA
    if (e.target.closest('.cta-btn')) {
        closeProjectDetails(); // Close details
        closeSectorOverlay();  // Close grid
        changeSection(3);      // Go to Contact
    }
});



// --- Dynamic Project Counts & Render Logic ---
(function () {
    function updateCategoryCounts() {
        requestAnimationFrame(() => {
            const categories = document.querySelectorAll('.project-category');
            categories.forEach(cat => {
                const categoryName = cat.dataset.category;
                let count = 0;

                if (categoryName === 'trading') {
                    // Static (8) + Dynamic Automation (5) = 13
                    const staticCount = 8;
                    const dynamicCount = projectsData.filter(p => p.category === 'trading').length;
                    count = staticCount + dynamicCount;
                } else {
                    count = projectsData.filter(p => p.category === categoryName).length;
                }

                const header = cat.querySelector('h3');
                if (header) {
                    let countSpan = header.querySelector('.project-count');
                    if (!countSpan) {
                        countSpan = document.createElement('span');
                        countSpan.className = 'project-count';
                        header.appendChild(countSpan);
                    }
                    // Just the number
                    countSpan.textContent = count;
                }
            });
        });
    }

    // Append Automation to Trading Scroll Row
    const tradingContainer = document.querySelector('.project-category[data-category="trading"] .projects-scroll-row');
    if (tradingContainer) {
        // Clear duplicates if any (though this runs once)
        // projectsData only has the 5 added automation ones for trading
        projectsData.filter(p => p.category === 'trading').forEach(p => {
            // Avoid re-appending if re-running script hot-reload
            // Check if title exists
            // BUT, createProjectCard is global? No it's defined inside 'openObserver'? 
            // Wait, createProjectCard is defined at line 1079. It is global scope (or top level of file).
            if (typeof createProjectCard === 'function') {
                const card = createProjectCard(p);
                tradingContainer.appendChild(card);
            }
        });
    }

    // Delay slightly to ensure DOM is ready if script is strictly deferred
    setTimeout(updateCategoryCounts, 100);
})();
