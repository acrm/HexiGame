# Color Cell Prototype — Separated Logic & Implementation

This document separates PURE GAME LOGIC (independent of rendering / language) from IMPLEMENTATION DETAILS (current HTML5 canvas prototype). All tunable values are expressed as PARAMETERS. Timing is normalized to a fixed logical game tick where:

`game tick duration = 1/12 second ≈ 83.33 ms`

Frame-based constants from the original prototype are converted to tick-based values.

---
## 1. Parameters (Tunable Configuration)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `GridRadius` | 5 | Radius of the visible world window and movement threshold logic. |
| `InitialColorProbability` | 0.05 | Probability a cell starts with a color. |
| `ColorPaletteStartHue` | 350 | Starting hue angle (0–359) for HSV palette generation. |
| `ColorPaletteHueStep` | 60 | Hue step between colors (generates 6 colors by default). |
| `ColorSaturation` | 40 | Saturation value (0–100) for all colors in palette. |
| `ColorValue` | 60 | Value/brightness (0–100) for all colors in palette. |
| `TurtleOutlineColor` | #FFFFFF | Color used for template outline (cursor, grid visualization). |
| `PlayerBaseColorIndex` | 0 | Index in generated `ColorPalette` used as the player's reference color. |
| `TimerInitialSeconds` | 300 | Starting session duration (informational only). |
| `CaptureHoldDurationTicks` | 6 | Minimum continuous Space hold to attempt capture (≈0.5s). |
| `CaptureFailureCooldownTicks` | 36 | Cooldown after failed capture attempt (≈3s). |
| `CaptureFlashDurationTicks` | 2 | Duration of success/failure flash feedback (≈0.1667s). |
| `ChanceBasePercent` | 100 | Base percent before penalties. |
| `ChancePenaltyPerPaletteDistance` | 20 | Percent deducted per palette index distance. |
| `CarryFlickerCycleTicks` | 6 | Period of captured tile flicker cycle (≈0.5s). |
| `CarryFlickerOnFraction` | 0.5 | Fraction of cycle during which flicker is lit. |
| `CarryingMoveRequiresEmpty` | true | Must move only into empty cells while carrying. |
| `GameTickRate` | 12 | Logical ticks per second. |
| `RandomSeed` | (none) | If added, would make grid/capture deterministic. |

Derived formulas:
```
PaletteDistance = |paletteIndex(targetColor) - PlayerBaseColorIndex|
CaptureChancePercent = max(0, ChanceBasePercent - ChancePenaltyPerPaletteDistance * PaletteDistance)
```

---
## 2. Pure Game Logic (Tick-Based, Engine-Agnostic)

### 2.0 Infinite world model
- World is procedurally generated and unbounded.
- At initialization, cells are generated in a disk of radius `2 * GridRadius` around start `(0,0)`.
- During gameplay, on movement ticks, all coordinates in a disk of radius `2 * GridRadius` around protagonist are checked; missing cells are generated lazily.
- Cell generation keeps the same probability model (`InitialColorProbability`) and palette mapping.

### 2.0.1 Moving visible window (camera bounds)
- Visible world window radius is `GridRadius`.
- The window center (`worldViewCenter`) is shifted exactly 1 cell forward along the current facing direction.
- On session start, the spawn area guarantees a clear forward corridor from protagonist to the furthest visible cell on that facing axis.
- This makes the first visible frontier reachable immediately while keeping the visible field biased toward exploration direction.

### 2.1 Entities & State
- `Cell`: `{ q, r, colorIndex | null }`.
- `Cursor`: current axial position `(q, r)`.
- `CapturedCell`: reference to a cell currently being carried (anchor) or `null`.
- `CaptureCooldownTicksRemaining`: integer ≥ 0.
- `CaptureChargeStartTick`: tick when Space began charging, or `null`.
- `FlashState`: `{ type: 'success'|'failure', startedTick } | null`.
- `RemainingSeconds`: counts down from `TimerInitialSeconds`.
  - Implementation updates every 12 ticks.

### 2.2 High-Level Modes
1. `Free`: Not carrying; may start charge if conditions met.
2. `ChargingCapture`: Space held; measuring duration; previewing chance if hovered cell colored.
3. `Carrying`: Transporting a color along empty cells.
4. `Cooldown`: Overlaps other modes logically; blocks new charge attempts until `CaptureCooldownTicksRemaining` == 0.
5. `FlashFeedback`: Temporary visual state (success/failure); does not block actions except its own duration handling.

### 2.3 Tick Update Algorithm (Executed Once per Game Tick)
```
function tick():
  if CaptureCooldownTicksRemaining > 0:
      CaptureCooldownTicksRemaining -= 1

  if FlashState != null and (currentTick - FlashState.startedTick) >= CaptureFlashDurationTicks:
      FlashState = null

  // Flicker phase is derived from (currentTick % CarryFlickerCycleTicks) < CarryFlickerCycleTicks * CarryFlickerOnFraction

  // Timer update (every GameTickRate ticks = 1 second)
  if currentTick % GameTickRate == 0 and RemainingSeconds > 0:
      RemainingSeconds -= 1
```

### 2.4 Movement Logic
```
function attemptMove(directionVector):
  target = neighbor(Cursor, directionVector)
  if target does not exist: return  // outside disk
  if target.colorIndex != null: return  // colored world cells are impassable

  if CapturedCell != null:  // carrying
      // transport color
      target.colorIndex = CapturedCell.colorIndex
      CapturedCell.colorIndex = null
      CapturedCell = target
  // always move cursor if not blocked
  Cursor = target.position
```

### 2.5 Capture Attempt Lifecycle
```
// On Space key down when free (not carrying) and not cooling down:
if CapturedCell == null and CaptureCooldownTicksRemaining == 0:
    CaptureChargeStartTick = currentTick

// On Space key up:
// - if the button was held for less than the threshold, the charge is cancelled
// - if the threshold has already been reached, capture will auto-complete inside tick()
if CaptureChargeStartTick != null:
    heldTicks = currentTick - CaptureChargeStartTick
    if heldTicks < CaptureHoldDurationTicks:
        // too early — cancel the charge
        CaptureChargeStartTick = null
    else:
        // long enough — tick() will finish the capture,
        // here we only clear the charging flag
        CaptureChargeStartTick = null

function attemptCapture(cell):
  if cell == null or cell.colorIndex == null or CapturedCell != null or CaptureCooldownTicksRemaining > 0: return
  distance = |cell.colorIndex - PlayerBaseColorIndex|
  chance = max(0, 100 - distance * ChancePenaltyPerPaletteDistance)
  roll = random(0,100)
  if roll <= chance:
      CapturedCell = cell
      FlashState = { type: 'success', startedTick: currentTick }
  else:
      CaptureCooldownTicksRemaining = CaptureFailureCooldownTicks
      FlashState = { type: 'failure', startedTick: currentTick }
```

### 2.6 Dropping Carried Color
```
// On Space press while carrying (not a charge initiation):
if CapturedCell != null:
    CapturedCell = null  // Color stays on tile
```

### 2.7 Capture Chance Preview
When cursor hovers a colored cell while `CapturedCell == null` and cooldown is zero, compute `CaptureChancePercent` using the formula above. Display or use for UI; no effect on logic.

### 2.8 Termination Conditions
No hard end: when `RemainingSeconds == 0` logic continues; only time display stops decrementing.

### 2.9 Edge Cases
- Attempting capture without meeting preconditions is a no-op.
- Movement into a colored world cell is blocked even when not carrying.
- Dropping (Space press) during a charge is interpreted as charge start only if not carrying.
- If the player begins a charge over an empty cell, releasing Space does nothing.
- Clicking or dragging toward an unreachable world cell triggers failure feedback instead of partial movement.

### 2.10 Auto-Move (Click-to-Move)
When the player clicks on a non-adjacent hex cell:
- **`autoFocusTarget`**: Target cell where focus should land after protagonist arrives and faces it.
- **Reachability**: Colored world cells are obstacles; the turtle never steps onto them.
- **`autoMovePath`**: Walkability-aware pathfinding computes a route through empty cells to a free cell adjacent to the clicked target; the route is stored as a list of intermediate cells.
- **Movement**: Every 2 ticks, protagonist moves one step along the precomputed reachable route.
- **Focus visuals during movement**: World focus outline is hidden while auto-move is active; target cell shows static frozen marker.
- **Arrival**: When adjacent to `autoFocusTarget`, protagonist orients to face it, focus updates to the target, and `autoFocusTarget` clears.
- **Invalid target feedback**: If no reachable adjacent cell exists, the click is rejected, the target cell receives a temporary red outline, and failure audio plays.
- **Cancellation**: Dragging (hold + move current focus/protagonist) cancels auto-move and clears the path.

---
## 3. Implementation Details (Current Prototype)

These are specifics of the existing HTML5 canvas version and not required by the abstract logic:
- Rendering uses frame-based `requestAnimationFrame`; FPS varies; logic tick abstraction assumes stable 12 ticks/sec for design purposes.
- Visual cursor edge rotates using frame count and measured FPS.
- Capture charge visualization expands edges progressively from the start edge.
- Flicker implemented via `frameCount % 30 < 15`; mapped to `CarryFlickerCycleTicks = 6` at 60 FPS (≈0.5s cycle).
- Success/failure flash uses stroke color and lasts 10 frames ≈ 0.1667s → `CaptureFlashDurationTicks = 2`.
- Cooldown and hold durations both 30 frames (≈0.5s @60FPS) → `6` ticks.
- Randomness via `Math.random()`; no seed or reproducible sequence.
- Hex size (`HEX_SIZE = 10`) influences rendering only; not part of pure logic.
- HUD shows dynamic chance string; logic only supplies numeric chance.
- Optional tasks are freely selectable in HexiPedia; each task can be `pending`, `active`, or `complete`, and completed tasks can be restarted on demand.
- Task flow is widget-driven and uses three UI phases: `pending` (orange pulsing inner glow with short task name), `active` (live progress), and `complete` (green pulsing inner glow with completion message).
- Clicking the task widget in `pending` opens a short intro modal with turtle setup + objective and two actions: `Postpone` (close modal, keep task pending) and `Start` (apply task setup, close modal, switch widget to `active`).
- Task setup is start-gated: until the player presses `Start`, the selected task does not apply sandbox cell changes, target markers, or task-bound UI conditions.
- Task completion only fires on state transition (incomplete → complete), but advancing to the next pending task happens only after the player clicks the widget in `complete` phase.
- The hotbar and HexiLab are disabled at session start and remain disabled through `task_1_explore`; they are explicitly unlocked when `task_2_collect_beyond_visibility` starts. The palette widget becomes available from task 4 onward, and the structures widget appears during the final Yin-Yang task.
- Tasks run in one continuous world: starting the next task does not rebuild the whole sandbox. Task setup only applies minimal targeted injections (task-specific cells/structures), while turtle position, hotbar contents, and surrounding world state are preserved.
- Top overlay widgets share the standard `»` edge button for quick navigation to the corresponding HexiPedia panel. The task widget body controls task flow, and the structure widget opens the `Structures` panel.
- HexiPedia panel defaults: `Tasks` is enabled and pinned; other panels (`Stats`, `Structures`, `Colors`) start disabled (not rendered).
- Enabled panels that are not pinned auto-hide after leaving HexiPedia; pinned panels remain enabled across tab switches.
- Disabled panels are completely removed from the DOM (not just collapsed). They can be restored via the search bar dropdown which lists all panels. Clicking a panel in the dropdown enables and scrolls to it.
- Panel header controls (left → right): widget visibility toggle (tasks/structures/colors) | ▲▼ reorder | 📌 pin. No enable/disable toggle button — panel disappears automatically when not pinned and not active.
- Panel section order is synced between HexiPedia and GameOverlays; overlay widgets (task, palette, structure) stack in section order.
- The `Tasks`, `Structures`, and `Colors` panels include eye-toggle controls for their corresponding overlay widgets.
- Mobile gameplay layout uses a fixed design width (`420px`, clamped by device width) and adapts vertically to the device height.
- Mobile control blocks (tab bar + widget stack) are placed in normal document flow, so they do not overlap the playable field.
- If device height is insufficient, the game field shrinks proportionally (canvas uses available container height) to keep all controls visible without overlap.
- **Auto-move visualization**: 
  - Target cell displays frozen focus (3 mutable edges with flicker effect, opacity 0.4–1.0 over 8-tick cycle).
  - Intermediate path cells display flickering white dots (2.5px radius, opacity 0.3–1.0, offset flicker phase per cell for wave effect).
  - Protagonist focus animation *disappears* during auto-move; reappears with normal rotating-edges animation when auto-move completes.
  - Path is computed only across walkable empty cells and stored in `GameState.autoMovePath` for rendering.
  - Rejected destination cells show a temporary red border via `invalidMoveTarget`.
- World click/touch interaction is clamped to currently visible world cells (`axialDistance(cell, worldViewCenter) <= GridRadius`); pointer events outside the visible dotted field boundary are ignored.
- Off-screen point-of-interest highlighting follows a step-by-step 6-neighbor pathfinding route from the turtle to the hidden target (ignoring obstacles), finds the last visible path cell, and lights only that cell corners that coincide with the real rendered dotted-field boundary.
- **Start screen** (shown while guest gameplay is disconnected) uses HexiPedia visual language (dark section blocks, compact header, in-panel controls) and stays inside the same forced-portrait mobile viewport container as gameplay:
  - Header contains a single-tab title: **HexiOS v<marketing-version>** (for example `v0.1.0`, sourced from `version.json` marketing metadata).
  - Settings are opened from a gear button in the top-right corner (same interaction model as in-game mobile tab bar).
  - If an active resumable session exists: **Connect** is shown.
  - Always available: **New session**.
  - If history contains records: **Session history** opens a sub-view with per-session **Continue** actions.
  - Session panel title is **Сессии**.
  - Language switching is rendered as a dedicated selector row on the start screen (search bar is not shown).
- Language is persisted in `hexigame.lang` (localStorage) and propagated reactively via a subscriber set in `i18n.ts`; all UI components re-render without a page reload.
- Session lifecycle contract: a game session starts only after the player acts on the start screen (Connect or Start new), persists continuously on every game-state update via `hexigame.session.state` and `hexigame.session.active.*`, survives page reload, and can be detached from gameplay via **Disconnect** (in in-game Settings) without clearing persisted state.
- Session history switch contract: pressing **Continue** in history first persists the currently active session snapshot, then loads the selected session snapshot, then connects into that selected saved state.
- Audio contract: background music and UI sounds use the same controller lifecycle on both start screen and gameplay; transitioning between these UI states does not pause music unless music is disabled or the document becomes hidden.
- In-game Settings action model is context-dependent:
  - when opened during active gameplay, **Disconnect** is shown instead of **Reset Session**;
  - when opened from the start screen, **Disconnect** is hidden.
- Session snapshots are stored both as active session state and per-session history state (`hexigame.session.byId.<sessionId>`), enabling switching between history entries without data loss.

## 3.1 Current Session UX Updates (2026-04-08)

- Mobile tabs are named `Map`, `Lab`, and `Hexipedia`.
- Disconnect is a dedicated in-game tab-bar button and is visually aligned with Settings (same size/background).
- Settings is always rendered above start-screen overlays (higher z-order), so it is visible both in gameplay and on session-selection screen.
- Start screen layout is split into independent zones:
  - fixed non-scroll header (`HexiOS + Settings`),
  - standalone language panel with its own scroll,
  - standalone sessions panel with its own scroll and collapse toggle (expanded by default).
- Session list is unified (no separate “current session” card) and sorted by most recent activity.
- Each session card exposes continue/download/rename actions and renders the same metrics:
  - start time,
  - last action time,
  - action count,
  - game ticks and game time,
  - total wall-clock session time.
- Missing metric values render as `—` instead of hiding rows.
- New sessions receive auto-generated codenames in strict two-part format: `color + flower`.
- Russian codename generation applies grammatical gender agreement for flower names (masculine/feminine color inflection).
- Session management supports bulk delete with selection mode, select-all, and explicit confirmation.
- In HexiOS start-screen header, a dedicated play button (left of Settings) resumes the most recent session.
- Session-card Continue action uses the same play icon metaphor as start-screen resume.
- Bulk-delete confirmation is inline and full-width (`Confirm` left in red, `Cancel` right in gray), without browser/system dialogs.
- In-game Settings no longer include a `Reset Session` action.
- Hexipedia `Session` section keeps playback controls on a single row and mirrors the same row in a dedicated Session overlay widget.
- Session overlay widget defaults to `off` and is controlled by the eye-toggle in the `Session` section header.
- `Download session` action is placed inside Session panel content (not in section header controls).
- Session panel includes expanded metadata plus a scrollable action log ordered from newest to oldest.
- Page reload is treated as resume, not as a new session boundary; the latest persisted state is restored before gameplay loop resumes.
- `Restart session` creates a fresh RNG from `Date.now()` seed so each new game has a different procedural world.
- Startup animation timings are accelerated by a factor of 3 while preserving the same phase order and visual beats.
- Initial and dynamic world generation both use the reduced color density (`InitialColorProbability = 0.05`).

### Frame → Tick Conversion Rationale
Assuming a target render frame rate of 60 FPS:
```
30 frames ≈ 0.5s ≈ 6 ticks
10 frames ≈ 0.1667s ≈ 2 ticks
```
If actual FPS differs, frame-based visuals may desync from intended logical timing; adopting tick-based timers in code would remove this variance.

### Suggested Refactor (Future)
1. Introduce a fixed-step game loop accumulating real time and executing logic ticks at 1/12s intervals.
2. Replace frame-count conditions with tick-based counters (`captureHoldTicks`, `cooldownTicks`, `flashTicks`).
3. Separate rendering layer to interpolate visual effects between ticks if desired.
4. Add optional `RandomSeed` for deterministic tests.

---
## 4. Mapping Original Constants → Tick Parameters

| Original | Meaning | Tick Parameter | Converted Value |
|----------|---------|----------------|-----------------|
| 30 frames (hold) | Capture charge duration | `CaptureHoldDurationTicks` | 6 |
| 30 frames (cooldown) | Failure cooldown | `CaptureFailureCooldownTicks` | 6 |
| 10 frames (flash) | Feedback flash | `CaptureFlashDurationTicks` | 2 |
| 30-frame cycle | Flicker period | `CarryFlickerCycleTicks` | 6 |
| 15 frames on | Flicker on half-cycle | `CarryFlickerOnFraction` | 0.5 |

---
## 5. Success Chance Formula (Unchanged)
```
CaptureChancePercent = max(0, 100 - 20 * PaletteDistance)
PaletteDistance = |cell.colorIndex - PlayerBaseColorIndex|
```

---
## 7. Structure System

The structure system allows players to create spatial color patterns following predefined templates. Internally these authored patterns are still stored as templates, but the player-facing UX treats them as structures. Structures provide puzzle-like challenges that reward careful color matching and spatial planning, and each started structure is tracked as a separate in-session instance.

### 7.1 Core Concepts

**Template Definition** (`BuildTemplate`)
```typescript
{
  id: string;                          // Unique identifier
  name: { en, ru };                    // Localized template name
  description?: { en, ru };            // Optional description
  difficulty: 'easy' | 'medium' | 'hard';
  structure: {
    anchorCell: { q, r };              // Which authored cell is the anchor
    cells: TemplateCell[];             // Authored cell definitions
  };
  hints?: { en?, ru? };                // Player hints (array)
}
```

**Template Cell** (`TemplateCell`)
```typescript
{
  q, r: number;                        // Position in template-local coordinates
  relativeColor: number | null;        // -50..50 (percentage) or null (empty)
}
```

`anchorCell` points to one of the authored template cells. World placement uses cell offsets relative to that anchor.

**Relative Color System**
Colors are percentages from base (anchor) color in the palette:
- **0%**: Exact base color
- **25%**: +1 step (2 indices in 8-color palette)
- **±25%**: ±1/4 around palette
- **±50%**: Opposite/antagonist (+4 indices)

Absolute color formula:
```
absoluteColorIndex = (baseColorIndex + round(relativeColor/100 × paletteSize) + paletteSize) % paletteSize
```

### 7.2 Template Lifecycle

**Phase 1: Activation**
1. Player selects a structure type in HexiPedia UI and presses `Start new`
2. `activateTemplate(state, templateId)` is called
3. A new `instanceId` is created and appended to `structureInstances`
4. The active structure enters **flickering mode**: attached to focus position, opacity = 0.4 + 0.2 × sin((tick/6) × π)
5. It rotates with `facingDirIndex` (0–5)

**Phase 2: Anchoring**
1. Player places hex at an expected template cell position
2. System detects match → calls `determineTemplateAnchor()`
3. Base color calculated: `baseColorIndex = (placedColorIndex - offset + paletteSize×10) % paletteSize`
4. Template **anchors to world** at that position
5. First cell recorded as filled

**Phase 3: Validation**
1. `updateTemplateState()` called after any grid modification (eatToHotbar, exchangeWithHotbarSlot, performHotbarTransfer)
2. `validateTemplate()` checks each cell:
   - **Correct**: Matches expected color → white border, `cell_correct` event
   - **Wrong**: Mismatched color → black border, `cell_wrong` event, `hasErrors = true`
   - **Empty**: Awaits filling → semi-transparent preview
3. `filledCells` set updates with all correctly filled cell keys ("q,r" format)

**Phase 4: Completion & Reset**
1. When all required cells are correctly filled:
   - `isTemplateCompleted()` returns true
   - `completedAtTick` is set on both `activeTemplate` and the matching structure instance
   - Template ID is added to `completedTemplates`
   - `template_completed` audio event fires (fanfare)
2. If the player removes all cells, the structure resets to **flickering mode**, but the started instance remains in `structureInstances`

### 7.3 Rotation System

Templates rotate with player heading via `facingDirIndex` (0–5):
```
function rotateAxial(pos, rotation):
  repeat rotation times:
    (q, r) → (-r, q + r)  // 60° clockwise rotation

localOffset = cellPos - anchorCell
worldPos = anchorPos + rotate(localOffset)
```

### 7.4 Rendering

**Flickering Mode** (not anchored):
- Opacity animation: `0.4 + 0.2 × sin((tick/6) × π)` ≈ 0.5s period
- All template cells shown at anchor opacity
- Follows focus position continuously
- All cells drawn with colored fill/white stroke

**Anchored Mode** (fixed in world):
- Correctly filled cells: Not drawn (actual hex grid visible)
- Empty/wrong cells: Semi-transparent preview at base opacity
- Stroke color: White (correct) or black (errors in template)
- Rotation: Locked to anchoring direction

### 7.5 Game State Integration

```typescript
// In GameState:
activeTemplate?: {
  instanceId: string;                  // Session-scoped active structure instance
  templateId: string;
  anchoredAt: {
    q: number; r: number;              // World coordinates
    baseColorIndex: number;            // Anchor color
    rotation: number;                  // 0–5 (facing direction)
  } | null;                            // null = flickering
  hasErrors: boolean;                  // Any wrong-colored cells?
  filledCells: Set<string>;            // "q,r" format
  completedAtTick?: number;            // Completion timestamp
};
structureInstances?: Array<{
  instanceId: string;
  templateId: string;
  startedAtTick: number;
  anchoredAt: { q: number; r: number; baseColorIndex: number; rotation: number } | null;
  hasErrors: boolean;
  filledCells: Set<string>;
  completedAtTick?: number;
}>;
completedTemplates?: Set<string>;      // Finished template IDs within the active session
```

### 7.6 Available Structures (Template Library)

| Template ID | Name | Difficulty | Cells | Description |
|-------------|------|-----------|-------|-------------|
| `ring_r1` | Simple Ring | Easy | 7 | Center + 6 adjacent, all same color. Simple starter structure. |
| `triangle` | Rainbow Triangle | Easy | 3 | Small triangle with gradient: 0%, 12.5%, 25% |
| `flower` | Flower | Medium | 7 | Center (0%) + 6 petals alternating (0%, 25%) |
| `yin_yang` | Yin-Yang | Hard | 7 | Balanced opposites: 0%, 25%, 50%, -25%. Compact legacy variant. |
| `horseshoe_shelter` | Horseshoe Shelter | Easy | 5 | One-color horseshoe structure available from the Structures panel. |
| `yin_yang_v2` | Yin-Yang | Hard | 19 | Large two-color yin-yang with mirrored eyes used as the final scripted task. |
| `rainbow_spiral` | Rainbow Spiral | Hard | 10 | Optional full-palette spiral; not part of the active scripted task chain. |

Each template includes localized name/description and optional hints array.

### 7.7 Audio Feedback Events

| Event | Sound | When |
|-------|-------|------|
| `cell_correct` | UI tone | Hex placed with correct color |
| `cell_wrong` | Retro click | Cell has wrong color; `hasErrors` → true |
| `template_completed` | Fanfare | All required cells correctly filled |

Events triggered in `Game.tsx` via `useEffect` watch on `gameState.activeTemplate`.

### 7.8 Logic Functions (Pure)

Defined in `src/templates/templateLogic.ts`:

| Function | Purpose |
|----------|---------|
| `getAbsoluteColor(relative, base, paletteSize)` | Convert relative % to palette index |
| `rotateAxial(pos, rotation)` | Rotate coordinate by 60° steps |
| `getTemplateCellWorldPos(cell, anchor, rotation)` | Compute world position |
| `getTemplateCellsWithWorldPos(template, anchor, base, rotation, palette)` | All cells with colors |
| `validateTemplate(template, anchor, base, rotation, grid, palette)` | Check correctness |
| `isTemplateCompleted(...)` | All cells correct? |
| `isTemplateEmpty(...)` | All cells empty? (for reset) |
| `determineTemplateAnchor(template, placedPos, placedColor, focusPos, rotation)` | Calculate anchor from first hex |

### 7.9 Design Extensibility

- **More Structures**: Add to `templateLibrary.ts` following `BuildTemplate` interface
- **Custom Difficulty**: Difficulty filter already implemented in UI
- **Hints Localization**: `hints` array supports multi-language strings
- **Persistence**: `completedTemplates` and `structureInstances` persist for the active session and across reloads
- **Future: User-Created Structures**: Architecture supports dynamic template definition

---
## 8. User Interface & UX (v0.22–0.26)

### 8.0 Startup sequence
- On cold start, the app shows a full-screen loading screen while platform integration and critical audio assets are preloaded.
- After loading, user confirms entry via Guest Start overlay.
- A startup animation then plays, assembling the turtle avatar from hexagons before gameplay UI is fully revealed.
- Startup turtle silhouette/orientation matches the in-game mascot (same shell/head/limb proportions and facing).
- Initial world focus is aligned to the mascot-facing direction so the turtle on HexiMap looks in the same direction at session start.
- Mobile default tab at startup is **HexiMap** (world view), not HexiPedia.

### 8.1 Task & Structure UX
- **TaskProgressWidget**: Displays active task progress using task-defined metrics (visited cells, collected marked hexes, excavated cells, 3+3 opposite-color set, placed structure cells)
  - **Pending phase**: orange pulsing inner highlight, start icon, and short task name (1-2 words)
  - **Active phase**: numeric progress and metric label
  - **Complete phase**: green pulsing inner highlight with explicit completion phrase (for example, `All target cells visited`)
  - Widget click behavior is phase-dependent (`pending` opens the task modal, `complete` advances to the next pending task; `active` only shows live progress)
  - Standard right-edge `»` button opens the `Tasks` section in HexiPedia in every phase
- **Task intro modal**:
  - Opened by clicking the pending task widget
  - Contains short turtle story setup + objective text
  - Action buttons: left `Postpone`, right `Start`
  - `Postpone` closes modal without state change; `Start` closes modal, applies task setup, and switches widget to active progress tracking
- **HexiPedia task entries**:
  - Each task row uses the same short localized name as the task widget pending phase
  - Expanded content shows turtle story setup, goal text, current progress, and the task-specific action hint
- **Scripted task flow**:
  - `task_1_explore`: visit three distant target sectors
  - `task_2_collect_beyond_visibility`: collect four marked hexes hidden beyond the visible frontier
  - `task_3_excavate_rings`: clear both debris rings and remove the hidden core cell from the map
  - `task_4_collect_opposites`: collect a 3+3 set of any opposite color pair in the hotbar (colors must be 50% apart on the palette)
  - `task_5_yin_yang`: complete the large two-color Yin-Yang structure
- **StructureProgressWidget**:
  - Appears when an active structure exists during the final scripted task
  - Shows structure name, progress, validation state, and locked base color swatch
  - Standard right-edge `»` button opens the `Structures` section in HexiPedia
  - Template preview cells are rendered only inside the visible world field

### 8.1.1 Points of Interest Highlighting
- **Off-screen target indication**: Active task target cells and active structure filled cells outside the visible area are indicated with highlight dots on the boundary of the visible game field (not in non-playable canvas gutters).
- For `task_2_collect_beyond_visibility`, target highlights persist until the corresponding target hex is actually collected (removed from map), not merely visited.
- **Visibility states**:
  - **Fully visible target**: All 6 corner dots of the target hex are highlighted (white, blinking).
  - **Partially off-screen target** (within 3 visible-radius diameters): 2 orange highlight dots appear on the field boundary, positioned perpendicular to the boundary edge.
  - **Far target** (>3 diameters beyond boundary): 1 orange highlight dot appears on the field boundary at the projection point.
- **Structural highlighting**:
  - **Active structure (current widget target)**: Filled cells of the active structure are treated as POI targets.
  - **Off-screen active structure cells**: Filled cells outside visibility are projected to boundary highlight dots to guide return navigation.
- **Visual feedback**: Highlight dots use warm orange color (`rgba(255, 200, 100, alpha)`) to distinguish from world navigation elements; they blink with the same 12-tick cycle as target cells (6 ticks on, 6 ticks at 35% opacity).

### 8.1.1 Input reliability
- **Hotbar hit-testing**:
  - Mobile hotbar click/tap detection uses the same geometry values as hotbar rendering
  - Prevents neighbor-slot activation when tapping lower ring cells
- **Touch target commit timing**:
  - While the finger is held on HexiMap, only focus/cursor preview is updated to the touched cell
  - Turtle movement (path start) is triggered only after finger release (`touchend`) using the final touched cell
  - Reduces off-by-one mis-targeting caused by immediate movement start during finger-down

### 8.2 HexiPedia (Information Hub)
- **Section Management**:
  - Four collapsible sections: Tasks, Stats, Structures, Colors
  - Each section can be collapsed with toggle arrow (▼/▶)
  - Section order customizable with up/down arrows (▲/▼)
  - Section selector remains fixed; all section content below it scrolls as one area
  - Collapsible sections persist in component state during session

- **Task List**:
  - Shows all scripted tasks with completion status (✓)
  - Display format: checkpoint + name + action button
  - Current task highlighted; completed tasks show restart option
  - Expandable task details show objective, hints, and progress

- **Statistics**:
  - Session time (MM:SS format for readability)
  - Session tick count (raw game ticks)
  - Real-time updates as game progresses

- **Structures**:
  - Structure-type dropdown chooses which authored structure family to inspect
  - `Start new` creates a fresh in-session structure instance; `Deactivate` clears the current active structure
  - Only structures started in the current session are listed for the selected type
  - Each instance row shows progress, validation, completion state, and base-color lock status

### 8.3 ColorPaletteWidget (Palette Visualization)
- **Display**: 9-cell color bar showing entire palette
  - Ordered from antagonist color through player base (center) back to antagonist
  - Left icon button toggles auto/manual base color mode for relative percentages
  - **Auto mode**: base color follows focused cell color in active field
  - **Auto mode fallback**: if focused cell has no color, percentages are hidden on all cells
  - **Manual mode (default)**: center color is selected initially; tapping another palette cell sets new `0%` base
  - Format: `±XX%` (e.g., `+50%`, `-33.33%`, `0%`)
  - White border is shown only for manually selected base color (hidden in auto mode)

- **Styling**:
  - Consistent with HexiPedia widget aesthetic
  - Framed with border, background, and shadow
  - Positioned directly below the task progress widget when both widgets are visible
  - Uses the same content width as the task progress widget

### 8.4 Session Persistence
- **Session History Tracking**:
  - Each game session is assigned a unique ID on guest start
  - Session = time from guest start to session reset (new game)
  - Session records track: startTime, endTime, gameTicks, gameTime (MM:SS)
  - Auto-saves every 360 ticks (~30 seconds) via updating existing session record
  - History stores last 20 sessions in localStorage
  - User can toggle session tracking in settings
- **Task Progress**: Tracks selected task, completed task IDs, interaction mode, and in-session scripted metrics (visited targets, collected marked hexes, excavation clears, 3+3 opposite-color set, structure fill counts)
- **Structure Instances**: Active structure instance and the per-session structure history survive page reload inside the same active session
- **Completed Templates**: Finished structure IDs persist for the duration of the active session and across reloads

### 8.5 Audio resume behavior
- **Music state persistence**:
  - Track index and playback time are stored in local storage
  - After page reload, music retries playback on first user interaction automatically
  - No settings toggle required to resume from saved position

---
## 9. Not Implemented (Scope Notes)
Still absent: delivery targets, long-form level objectives beyond the scripted task/structure chain, hard end conditions, and persistence beyond active-session task/structure progress.

---
## 10. Summary
The prototype's gameplay centers on probabilistic single-color capture and spatial transport constrained by empty-cell walkability. All time-sensitive behaviors have been normalized to discrete ticks (12 per second) enabling consistent tuning independent of visual frame rate. The structure system adds creative spatial pattern challenges as an optional gameplay layer, and the scripted task chain now teaches exploration, off-screen collection, excavation, palette opposites, and Yin-Yang construction without relying on random map luck.

---
## 11. Potential Future Parameters (Extensions)
- `MultipleCarryAllowed` (bool)
- `TransportLeavesTrail` (bool, whether previous cell retains color instead of clearing)
- `CaptureChanceMinClamp` (percent)
- `MaxSimultaneousFlashes` (int)
- `TemplateHintRevealCost` (int, ticks spent to unlock hints)
- `TaskSystemLocalization` (language selection for UI/hints)
- `HexiPediaSectionDefaults` (initial collapse state, custom section order)
- `TemplateRotationAllowed` (bool, can player modify template orientation after anchoring)

---
## 12. Multidimensional Field System (Research / Dev Tool)

### 12.0 Overview

A deterministic, seed-based, time-evolving hex field where each cell is either EMPTY or carries one of K colors. The field is defined as a pure function:

```
state(q, r, tick) = G( F6(seed, X0..X5(q, r, tick, params)) )
```

No state history is required — same seed + same (q, r) + same tick always yields the same result. This enables multiplayer consistency, replay, and instant seek-to-any-tick.

The 2D hex grid is treated as a **slice through a 6-dimensional material**: time is dimension 0, and the spatial plane is embedded in dimensions 1–5 via a seed-derived matrix. The resulting field looks like chaotic "background turbulence" with smooth spatial and temporal coherence.

This system is currently implemented in the **Field Lab** developer tool (`/field-lab/`). Game integration is a design-open question (see §12.9).

---

### 12.1 6D Coordinate Mapping

Inputs: axial coordinate (q, r), logical tick t (seconds = tick/12), seed, user params.

```
X0 = (tick/12) * timeScale          // time axis

X1 = a11*q + a12*r
X2 = a21*q + a22*r
X3 = a31*q + a32*r
X4 = a41*q + a42*r + u1             // u1 = extra-dim offset
X5 = a51*q + a52*r + u2             // u2 = extra-dim offset
```

The 5×2 matrix **M = {aij}** is generated deterministically from the seed (mulberry32 RNG) and stays constant for the lifetime of the world. `u1`, `u2` let designers "slide" the 2D slice through 6D space without moving the avatar.

---

### 12.2 Field Generator F6

Two modes, both returning two independent values `(density, hueNoise) ∈ [0,1]`:

| Mode | Algorithm | Feel |
|------|-----------|------|
| `value` | 6D multilinear value noise, 64-corner lattice, quintic fade | Smooth, cloud-like blobs |
| `hash`  | 6D integer hash, no interpolation | Crispy, cellular, "static" |

Both use separate seeds for density and hue channels (XOR-derived from the world seed) so fill pattern and color pattern are visually decorrelated.

---

### 12.3 State Mapping G

```
if density < densityThreshold:
    cell = EMPTY
else:
    cell = COLORED
    colorIndex = floor(hueNoise * K)   clamped to [0, K-1]
```

Average fill ratio ≈ `1 − densityThreshold`.

---

### 12.4 Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `seed` | 42 | World identity; determines matrix M and all noise offsets |
| `K` | 6 | Number of discrete colors (2–16) |
| `timeScale` | 0.5 | Speed of temporal evolution; 0 = frozen world |
| `baseFreq` | 1.0 | Spatial frequency; lower → larger blobs, higher → finer noise |
| `densityThreshold` | 0.55 | Fill sparsity; higher → fewer colored cells |
| `u1`, `u2` | 0, 0 | Extra-dimension offsets; slide 2D slice through 6D without moving |
| `P` | 12 | Lookahead depth in ticks for time-perspective rendering |
| `blinkOnTicks` | 4 | ON phase duration for perspective blink (ticks) |
| `blinkOffTicks` | 3 | OFF phase duration for perspective blink (ticks) |
| `mode` | `'value'` | Noise algorithm (`'value'` or `'hash'`) |

---

### 12.5 Time-Perspective Rendering (visual layer only)

This layer **does not modify** the underlying field; it changes how cells are displayed.

**EMPTY cells — "future color echo":**
- Sample state at `t + k·Δt` for `k = 1..P`
- On first COLORED sample at depth k:
  - `alpha = 1 − (k−1)/P` (closer future → brighter echo)
  - Blink ON: draw echo color at alpha × 0.6
  - Blink OFF: draw black

**COLORED cells — "near-future decay warning":**
- Sample state at `t + k·Δt` for `k = 1..P`
- On first EMPTY sample at depth k:
  - `proximity = (P − (k−1)) / P` (closer emptiness → stronger tint)
  - `overlayAlpha = 0.2 + 0.4 × proximity`
  - Blink ON: blend base color toward white by overlayAlpha
  - Blink OFF: draw base color only

Perceptual effect: empty space has "ghosts" of near-future colors; colored cells "glow" when they're about to vanish.

---

### 12.6 Determinism Contract

For consistent replays and future multiplayer:
- Use tick index `n` (integer); `t = n / 12`
- All clients must share: `seed`, `params`, `(q, r)`, `n`
- Perspective rendering is client-side only and does not affect authoritative state

---

### 12.7 Performance Notes

- Worst-case perspective cost: up to P additional `evalCell` calls per visible cell
- At radius 8 (217 cells), P=12: ~2 600 `evalCell` calls per frame
- Each `evalCell` (value mode): 64 hash ops + 6 fades + accumulation
- Practical 12 Hz budget is well within reach; P ≤ 20 recommended for gameplay use
- Optimization: skip perspective for cells far from the colorless/colored boundary

---

### 12.8 Designer Qualitative Guide

| Knob | Effect |
|------|--------|
| ↑ `densityThreshold` | Sparser field, more open space |
| ↑ `baseFreq` | Finer granularity, more texture |
| ↑ `timeScale` | Faster "boiling" / evolution |
| ↑ `K` | More color variety; smaller same-color regions |
| ↑ `P` | Stronger depth illusion; more motion cues |
| ↑ `blinkOffTicks` | Stronger strobe; more legible at cost of harshness |
| Adjust `u1`, `u2` | Explore the 6D world; find visually interesting slices |

---

### 12.9 Open Design Questions

1. **Cosmetic vs gameplay**: Should the field be purely background ambience, or affect mechanics (e.g., capture chance modifier, hazard tiles)?
2. **Player agency**: Should `u1`, `u2` be accessible in-game (e.g., movement in extra dims unlocked by collecting certain colors)?
3. **World model**: Global-consistent coordinates (infinite plane) or arena-bounded (relative to player position)?
4. **Perspective as information**: Is the time-echo a gameplay signal players exploit, or purely atmospheric?
5. **Local modifications**: Should player actions temporarily shift `u1`/`u2` locally, creating "ripples" in the field?

---

### 12.10 Dev Tool: Field Lab (`/field-lab/`)

Entry: `field-lab/index.html` → `src/fieldLab.tsx` → `src/fieldLab/FieldLabPage.tsx`

Pure logic: `src/fieldLab/fieldLogic.ts`  
Key exports: `buildMatrix(seed)`, `evalCell(q,r,tick,params,matrix)`, `evalCellPerspective(q,r,tick,params,matrix)`

The Field Lab provides:
- Live canvas visualization of the hex field with animation (12 Hz ticks)
- Controls for all parameters from §12.4
- Toggleable time-perspective overlay
- Play/Pause/1×/2×/4× speed
- Grid radius and hex size controls
- Reset to defaults

These can be added without altering core logic structure.
