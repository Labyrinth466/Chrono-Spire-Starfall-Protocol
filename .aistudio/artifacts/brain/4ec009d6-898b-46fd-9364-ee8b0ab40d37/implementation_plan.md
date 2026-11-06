# Starfall Card Reveal Motion, Borderless Dragging & 2.5D Battlefield Formation Perspective

This plan covers the three targeted refinements requested for **Chrono Spire: Resonator Gambit**: enhancing the **Starfall Card Reveal Modal** with Framer Motion staggered bottom-up entrance animations, removing borders while dragging in **Heroes & Gambit**, and aligning the **Active Tower Squad & Formation** preview perspective with the **Tower Battle** 2.5D battlefield layout.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> All three requirements are clearly specified and map directly to the existing UI and combat engine perspective:

- **Confirmed Decision 1 — Framer Motion Staggered Bottom-Up Card Reveal (`Starfall Card Reveal Modal`)**: Wrap the reveal modal overlay and card grid with Framer Motion (`AnimatePresence` + `motion.div` container and card item variants) so the modal fades in smoothly and each reveal card flies up from the bottom of the screen (`y: 160, opacity: 0, scale: 0.88` → `y: 0, opacity: 1, scale: 1`) with a staggered delay (`staggerChildren: 0.075` / `delay: i * 0.075`) and spring physics.
- **Confirmed Decision 2 — Borderless Dragging in `Heroes & Gambit`**:
  - Remove the outer box/border (`border-2`, card frame background) from the floating 2D Combat Pixel Sprite drag ghost (`draggingHero`) so only the borderless 2D Combat Pixel Sprite (`<PixelPreviewCanvas />`) and floating name/drop badge follow the cursor.
  - Remove the slot container border outlines (`border`, `border-sky-400/45`, `border-amber-300`, `ring-2`) on formation slots during dragging so slots remain completely borderless (indicating drop target hover via pedestal ellipse glow and subtle scale only).
- **Confirmed Decision 3 — Match `Active Tower Squad & Formation` Layout Perspective to `Tower Battle`**:
  - In **Tower Battle**, the 2.5D battlefield floor places **Back Row** on the left (`x = 150`) and **Front Row** on the right (`x = 290`) inside a perspective tactical ellipse ring, divided by an angled dashed midline, with heroes in each row stacked **vertically** (`top` to `bottom`, 1 to 3 units per column) with slight isometric depth stagger.
  - Update the **Active Tower Squad & Formation** preview box in **Heroes & Gambit** to use the exact same 2.5D battlefield perspective: an elliptical tactical arena floor ring, angled dashed midline divider, **Back Row (+ATK%)** stacked vertically on the left, and **Front Row (+DEF%)** stacked vertically on the right with isometric X-depth offset per slot.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Makes 1x and 10x gacha pulls in the **Starfall Card Reveal Modal** feel dynamic and tactile via Framer Motion staggered bottom-up entrance animations.
  2. Eliminates box borders around both the floating 2D combat sprite ghost and formation slots while dragging in **Heroes & Gambit**.
  3. Unifies the visual mental model between **Heroes & Gambit** and **Tower Battle** by rendering the **Active Tower Squad & Formation** preview with the exact same 2.5D battlefield floor perspective and vertical column-row arrangement used in live combat.
- **Target Audience / Persona**: Players organizing their 5-hero squad formation and summoning resonators.
- **Key Value**: Consistent spatial perspective between squad setup and combat, cleaner borderless drag-and-drop visuals, and punchier gacha card reveals.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Starfall Card Reveal Flow**: Clicking `[1x SUMMON]` or `[10x SUMMON]` opens the `Starfall Card Reveal Modal`. An `AnimatePresence` backdrop and `motion.div` card grid animate the cards flying in from the bottom of the viewport one after another (`staggerChildren: 0.075s`, spring damping `20`, stiffness `260`).
  2. **Borderless Hold-to-Drag Flow**: Pressing and holding an unlocked hero card in **Heroes & Gambit** spawns the floating 2D Combat Pixel Sprite directly under the cursor without any outer rectangular card border or frame, and formation slots highlight only their ground pedestal ellipse without rectangular slot borders.
  3. **2.5D Battlefield Formation Perspective**: Looking at **Active Tower Squad & Formation** in **Heroes & Gambit** mirrors the left-half of the **Tower Battle** canvas:
     - Outer 2.5D perspective elliptical floor ring (`rgba(56, 189, 248, 0.25)` border + radial glow).
     - **Back Row (+ATK%)** column on the Left, stacking its 2–3 pedestals vertically from top to bottom with slight isometric slant.
     - Angled dashed tactical midline (`skew-x-[-10deg]`) separating Back Row and Front Row, matching the canvas `moveTo(235, horizonY + 12) -> lineTo(195, height - 12)` divider.
     - **Front Row (+DEF%)** column on the Right, stacking its 2–3 pedestals vertically from top to bottom facing right toward the boss side.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Container + Item Variants in `Starfall Card Reveal Modal`**
  - *Chosen Approach*: Use `AnimatePresence` around the modal and explicit Framer Motion `variants` (`hidden` → `visible` with `staggerChildren: 0.075`) on the grid container and each card (`y: 160` → `0`, `opacity: 0` → `1`, `scale: 0.88` → `1`).
  - *Why*: Guarantees smooth, deterministic stagger timing for both 1x and 10x pulls without CSS transition conflicts on initial mount.
- **Decision 2 — Pure Sprite Ghost & Pedestal-Only Highlighting During Drag**
  - *Chosen Approach*: Strip `border-2 bg-slate-950/90` from the floating drag ghost container and remove `border` classes from the formation slot wrapper in `renderSlotPedestal`.
  - *Why*: Keeps the 2D pixel character sprite clean as if lifting the unit directly onto the battlefield floor.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           App Shell & State                                │
├─────────────────────────────────────┬──────────────────────────────────────┤
│     Heroes & Gambit Tab             │     Starfall Card Reveal Modal       │
│  ┌───────────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │ Borderless 2D Sprite Drag     │  │  │ AnimatePresence + motion.div   │  │
│  │ • No box border on ghost      │  │  │ • Grid staggerChildren: 0.075s │  │
│  │ • No slot border while drag   │  │  │ • Card initial: y:160, op:0    │  │
│  └──────────────┬────────────────┘  │  │ • Card animate: y:0, op:1      │  │
│                 ▼                   │  └────────────────────────────────┘  │
│  ┌───────────────────────────────┐  │                                      │
│  │ 2.5D Battlefield Perspective  │  │                                      │
│  │ [Back Row]  ╱  [Front Row]    │  │                                      │
│  │  (Vertical  ╱   (Vertical     │  │                                      │
│  │   Stack)    ╱    Stack)       │  │                                      │
│  │   Slot #4   ╱    Slot #1      │  │                                      │
│  │   Slot #5   ╱    Slot #2      │  │                                      │
│  │             ╱    Slot #3      │  │                                      │
│  └───────────────────────────────┘  │                                      │
└─────────────────────────────────────┴──────────────────────────────────────┘
```
