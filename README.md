# Abhi-AlgoForge Portfolio

A visually immersive, single-page developer portfolio featuring an interactive 3D starfield/network scene built with Three.js, smooth full-page scroll transitions, animated skill graphs, and a comprehensive project showcase spanning Trading Bots, AI/ML, and IoT domains.

> **Live Sections:** Home (3D hero) · About (animated skill graph) · Projects (card grid with detail views) · Contact (form + socials)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [File-by-File Walkthrough](#file-by-file-walkthrough)
- [Setup Instructions](#setup-instructions)
- [Dependencies](#dependencies)
- [Usage](#usage)
- [Build & Deployment](#build--deployment)
- [Project Structure](#project-structure)

---

## Project Overview

This portfolio is a **single-page application** designed to showcase the work of a full-stack developer specializing in Python automation, algorithmic trading, AI/ML, and IoT. Key highlights:

- **3D Interactive Background** — A Three.js scene renders a rotating network of nodes (skill labels + filler dots) that morphs from a cone formation into an expanding cloud as the user scrolls between sections.
- **Full-Page Scroll Transitions** — Sections slide vertically with CSS transforms driven by a custom JavaScript scroll controller (wheel events, navbar clicks). No scroll library is used; all transitions are hand-crafted with easing functions.
- **Animated Skill Graph** — The About section uses LeaderLine to draw animated SVG connector lines between DOM nodes, creating a cascading "skill tree" that reveals step-by-step.
- **50+ Project Showcase** — Projects are organized by category (Trading & Automation, AI & ML, IoT) with flip cards, a full grid overlay, and detailed project pages showing goal, overview, how-it-works, key features, limitations, and tech stack.
- **Responsive Design** — Adapts from desktop to mobile with dynamic scaling of the 3D scene, card limits, and layout adjustments.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│  (Single HTML page with all section markup)          │
│                                                      │
│  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ Home      │  │ About     │  │ Projects       │  │
│  │ (hero +   │  │ (skill    │  │ (cards, grid,  │  │
│  │  3D bg)   │  │  graph)   │  │  detail views) │  │
│  └─────┬─────┘  └─────┬─────┘  └───────┬────────┘  │
│        │              │                 │            │
│  ┌─────┴──────────────┴─────────────────┴──────┐    │
│  │              main.js (Entry Point)           │    │
│  │  - Scroll controller & section transitions   │    │
│  │  - LeaderLine graph animation                │    │
│  │  - Project data (50+ items) & card renderer  │    │
│  │  - Navbar highlight logic                    │    │
│  │  - Detail view population                    │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │ imports                        │
│  ┌──────────────────┴──────────────────────────┐    │
│  │              scene.js (Three.js)             │    │
│  │  - WebGL renderer, camera, scene             │    │
│  │  - Starfield (2000 particles, cylindrical)   │    │
│  │  - Instanced node mesh (cone → cloud morph)  │    │
│  │  - Skill label DOM overlays projected to 3D  │    │
│  │  - Network lines (distance-based connections) │    │
│  │  - Typewriter title reveal                   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │              CSS Layer                        │    │
│  │  global.css  — Variables, resets, canvas      │    │
│  │  home.css    — Hero text, stats, scroll ind.  │    │
│  │  about.css   — Skill graph nodes & tooltips   │    │
│  │  projects.css— Cards, grid, detail overlay    │    │
│  │  contact.css — Form, socials, decorations     │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Page Load** → `main.js` calls `initScene()` from `scene.js`, which mounts the Three.js canvas and starts the animation loop.
2. **Scroll/Nav** → Wheel events or navbar clicks trigger `changeSection(index)`, which applies CSS transforms to slide sections and calls `tweenScrollValue()` to morph the 3D network.
3. **About Section** → On activation, `triggerScrollAnimation()` reveals DOM graph nodes in a 9-step timed sequence and draws LeaderLine connectors with animated "draw" effects.
4. **Projects** → Category headers open a full grid overlay (`openSectorOverlay`). Clicking any card opens a detail view (`openProjectDetails`) populated from the `projectsData` array.
5. **Contact** → Static form with Lottie animation and social links.

---

## File-by-File Walkthrough

### `index.html`
The single HTML document containing all section markup:
- **Head**: Google Fonts (JetBrains Mono, Roboto), CSS imports, Three.js import map (CDN), Lottie player script.
- **`#canvas-container`**: Mount point for the Three.js WebGL canvas.
- **`#labels-layer`**: Fixed overlay for 3D-projected skill labels (pointer-events disabled).
- **`<nav>`**: Four nav links (Home, About, Projects, Contact) with a sliding highlight indicator.
- **`#ui-container`** (Home): Hero text with animated reveal, "Hire Me" button, stats line.
- **`#about-overlay`**: Skill graph with root node (bio + avatar), three category branches (Education, Experience, Skills), and leaf nodes with hover tooltips.
- **`#projects-overlay`**: Project categories with horizontal scroll rows (Trading, AI, IoT).
- **`#sector-overlay`**: Full-screen grid view for a selected project category.
- **`#project-details-overlay`**: Detailed view with goal, overview, how-it-works, key features, limitations, tech stack, and platform.
- **`#contact-overlay`**: Contact form with email input, message textarea, send button, Lottie animation, and social icons (Telegram, WhatsApp, GitHub, LinkedIn, Email).
- **`#right-sidebar`**: Fixed vertical social icon bar.
- **Scroll indicator**: Mouse icon (home) / up arrow (contact) with footer copyright.

### `main.js` (~1725 lines)
The main application logic, responsible for everything except the Three.js scene:

| Section | Lines | Description |
|---------|-------|-------------|
| **Imports & Init** | 1–5 | Imports `initScene`/`setScroll` from `scene.js`, imports LeaderLine, initializes the 3D scene. |
| **Scroll Controller** | 17–104 | Manages `currentSectionIndex`, handles wheel events (with trackpad threshold), navbar click routing, "Hire Me" button → Contact, scroll indicator click. |
| **Section Transitions** | 126–324 | `changeSection()` orchestrates CSS transforms (`translateY`, `scale`, `blur`), schedules 3D expansion via `tweenScrollValue()`, manages graph lifecycle (init/dispose), handles the Home ↔ About fade sequence. |
| **Nav Highlight** | 326–343, 661–672 | `updateNavState()` toggles `.active` class and animates the highlight pill position. |
| **Tween Scroll** | 346–371 | `tweenScrollValue()` uses `requestAnimationFrame` + easeInOutQuad to smoothly interpolate the scroll value passed to `scene.js`. |
| **LeaderLine Graph** | 374–495 | `initGraph()` creates animated SVG connector lines between skill-tree DOM nodes. Lines are drawn with dashed animation and reparented into the about overlay for correct z-index. |
| **Graph Animation** | 503–644 | `triggerScrollAnimation()` implements a strict 9-step animation: reveal root → draw lines → reveal L1 → draw → reveal L2 → draw → reveal L3 → draw → reveal L4. Each step uses `setTimeout` chains. |
| **Responsive Layout** | 676–719 | `handleResize()` dynamically scales the home text container to fit viewport, applying CSS `scale()` transforms. |
| **Project Data** | 727–1401 | `projectsData[]` — an array of 50+ project objects, each with `category`, `title`, `desc`, `img`, `goal`, `tech`, `platform`, and `longDesc` (multi-paragraph markdown-like descriptions). |
| **Card Rendering** | 1403–1545 | `createProjectCard()` builds flip-card DOM elements. `renderProjectsPreview()` renders limited cards per category. |
| **Sector Grid** | 1455–1541 | `openSectorOverlay()` / `closeSectorOverlay()` manage the full project grid with staggered slide-up animations and UI isolation (hide nav/sidebar). |
| **Project Details** | 1548–1668 | `openProjectDetails()` parses `longDesc` to extract Overview, How It Works, Key Features, and Limitations using regex. `closeProjectDetails()` restores UI. |
| **Category Counts** | 1672–1724 | IIFE that counts projects per category and appends count badges to category headers. |

### `scene.js` (477 lines)
The Three.js 3D scene module:

| Section | Lines | Description |
|---------|-------|-------------|
| **Scroll Sync** | 1–8 | `externalScroll` variable + `setScroll()` export for cross-module scroll communication. |
| **Circle Texture** | 10–24 | Creates a 32×32 canvas texture for circular star particles. |
| **Scene Setup** | 26–145 | Initializes scene (transparent background, navy fog), PerspectiveCamera at z=45, WebGL renderer (alpha, antialiased, capped at 2x pixel ratio), ambient + directional lights, 2000-star cylindrical starfield, instanced sphere mesh (800 max, sky-blue emissive material), line segments for network connections. |
| **Cone Distribution** | 156–273 | `setupMesh()` creates nodes in a cone shape. 25 skill labels are randomly selected from a list of 80+ tech terms, placed along the cone with labels as projected DOM elements. 50 filler dots complete the mesh. Mobile reduces counts. |
| **Animation Loop** | 300–423 | `animate()` — 60fps loop: updates camera parallax (disabled), rotates network group, rotates starfield, calculates morphFactor from scroll (cone 0% → cloud 100%), lerps node positions, updates instanced mesh matrices, projects label positions to screen coordinates with depth-based scaling, updates network lines, triggers title reveal at t=2.8s. |
| **Network Lines** | 425–461 | `updateLinesRobust()` uses pre-allocated buffers for zero-allocation line updates. Connect distance scales dynamically with morph factor (7→18 units). |
| **Resize Handler** | 468–475 | Updates camera aspect ratio, renderer size, recalculates base distance, and re-runs mesh setup. |

### `css/global.css` (85 lines)
Root CSS variables (theme colors: sky-400, orange-400, slate-950), box-sizing reset, body gradient background (radial gradient from navy to deep slate), hidden scrollbars, canvas container (fixed, full viewport), labels layer (fixed, pointer-events none).

### `css/home.css` (~14,800 chars)
Home section styles: hero text layout (left-aligned on desktop, centered on mobile), glass-morphic card with `backdrop-filter: blur`, animated background dots, reveal animation for title text, scroll indicator (mouse icon + wheel animation, up-arrow variant), navbar (fixed top, glass background, sliding highlight), right sidebar (fixed vertical social icons), stats line, "Hire Me" button with hover gradient, responsive breakpoints.

### `css/about.css` (~11,924 chars)
About overlay (full viewport, grid layout), graph container (flexbox column), node styles (glass background, border, transitions), root node (bio card with avatar), category nodes (wider, distinct style), leaf nodes (smaller, hover-expandable tooltips), branch layout (responsive columns), LeaderLine z-index management, animation keyframes for node entrance.

### `css/projects.css` (~13,712 chars)
Projects overlay (scrollable), category headers with arrow indicators, horizontal scroll rows, project cards (flip animation on hover with `rotateY(180deg)`, glass-morphic front/back faces), sector overlay (full-screen grid with `grid-template-columns: repeat(auto-fill, ...)`), project details overlay (two-column layout: main content + sidebar, section styling), slide-up animation for grid cards, responsive adjustments.

### `css/contact.css` (~9,798 chars)
Contact overlay (centered card layout), decorative floating orbs (animated gradient spheres), glass-morphic contact card, input/textarea styling with focus effects, send button with gradient hover, social icon row (circular icons with brand colors), Lottie container, responsive scaling.

### `public/assets/images/`
21 project thumbnail images (PNG) used as card artwork. Includes category-specific images for trading, AI, IoT, and home sections.

### `package.json`
```json
{
  "name": "my-portfolio",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": { "vite": "^7.2.4" },
  "dependencies": {
    "leader-line-new": "^1.1.9",
    "three": "^0.182.0"
  }
}
```

### `dist/`
Production build output from `vite build`. Contains minified/bundled `index.html`, `assets/index-*.js`, `assets/index-*.css`, and copied images.

---

## Setup Instructions

### Prerequisites
- **Node.js** v18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/My-Portfolio.git
cd My-Portfolio

# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```

Opens a local Vite dev server (default: `http://localhost:5173`) with hot module replacement.

### Production Build

```bash
npm run build
```

Outputs optimized static files to `dist/`.

### Preview Production Build

```bash
npm run preview
```

Serves the `dist/` folder locally for testing.

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **three** | ^0.182.0 | 3D rendering — starfield, node mesh, camera, lines, instanced geometry |
| **leader-line-new** | ^1.1.9 | Animated SVG connector lines for the About skill graph |
| **vite** | ^7.2.4 (dev) | Build tool — dev server, HMR, production bundling |

### External CDN Resources
- **Three.js** (import map): `https://unpkg.com/three@0.160.0/build/three.module.js` — used for browser-native ES module import
- **Lottie Player**: `@lottiefiles/lottie-player` — contact section animation
- **Google Fonts**: JetBrains Mono (monospace), Roboto (sans-serif)

---

## Usage

### Navigation
- **Scroll** (mouse wheel) or **click navbar links** to move between Home → About → Projects → Contact.
- Trackpad users: a 15px delta threshold prevents accidental triggers.

### Projects
- Click a **category header** (e.g., "Trading & Automation →") to open the full grid view.
- Click any **project card** to view detailed information (goal, overview, how it works, features, limitations, tech stack).
- Click **"Get in Touch"** in a project detail to jump to the Contact section.

### About
- The skill graph animates automatically when the About section is first visited.
- Hover over leaf nodes to reveal detailed tooltips.

### Contact
- Fill in email and message, then click **Send** (front-end only — no backend configured).
- Social icons link to Telegram, WhatsApp, GitHub, LinkedIn, and Email.

---

## Build & Deployment

The project is a static site — deploy `dist/` to any static hosting:

- **GitHub Pages**: Push `dist/` contents to a `gh-pages` branch
- **Vercel / Netlify**: Connect the repo and set build command to `npm run build`, output directory to `dist`
- **Manual**: Upload `dist/` contents to any web server

---

## Project Structure

```
My_Portfolio/
├── index.html              # Single-page HTML (all sections)
├── main.js                 # Application logic (scroll, projects, graph)
├── scene.js                # Three.js 3D scene (starfield, nodes, lines)
├── package.json            # Dependencies and scripts
├── .gitignore              # Ignored files (node_modules, dist, logs)
├── css/
│   ├── global.css          # Theme variables, resets, canvas
│   ├── home.css            # Hero section, navbar, sidebar
│   ├── about.css           # Skill graph, tooltips
│   ├── projects.css        # Cards, grid, detail views
│   └── contact.css         # Form, socials, decorations
├── public/
│   ├── vite.svg            # Favicon
│   └── assets/
│       └── images/         # 21 project thumbnails (PNG)
├── dist/                   # Production build (generated)
└── backups/                # Development backups (not deployed)
```
