# Color Cell Prototype — Separated Logic & Implementation

This document separates PURE GAME LOGIC (independent of rendering / language) from IMPLEMENTATION DETAILS (current HTML5 canvas prototype). All tunable values are expressed as PARAMETERS. Timing is normalized to a fixed logical game tick where:

`game tick duration = 1/12 second ≈ 83.33 ms`

Frame-based constants from the original prototype are converted to tick-based values.

---
## 1. Parameters (Tunable Configuration)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `GridRadius` | 15 | Radius of the visible world window and movement threshold logic. |
| `InitialColorProbability` | 0.20 | Probability a cell starts with a color. |
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
- The window has a center (`worldViewCenter`) that starts at protagonist position.
- If protagonist approaches a boundary so that remaining distance to edge is `GridRadius / 2` or less, the window center shifts in protagonist direction.
- This keeps protagonist inside inner safety area while allowing continuous infinite traversal.

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

  if CapturedCell != null:  // carrying
      if target.colorIndex != null: return  // blocked by colored cell
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
- Movement into colored cell while carrying is blocked.
- Dropping (Space press) during a charge is interpreted as charge start only if not carrying.
- If the player begins a charge over an empty cell, releasing Space does nothing.

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
- Tutorial tasks are freely selectable in HexiPedia; completed tasks are tracked and can be restarted on demand.
- Tutorial completion only fires on state transition (incomplete → complete), then auto-advances to the next task in order.

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
## 7. Build Template System

The build template system allows players to create spatial color patterns following predefined templates. Templates provide puzzle-like challenges that reward careful color matching and spatial planning. Players optionally select templates in HexiPedia to earn completion bonuses.

### 7.1 Core Concepts

**Template Definition** (`BuildTemplate`)
```typescript
{
  id: string;                          // Unique identifier
  name: { en, ru };                    // Localized template name
  description?: { en, ru };            // Optional description
  difficulty: 'easy' | 'medium' | 'hard';
  anchorCell: { q, r };                // Anchor position (usually 0,0)
  cells: TemplateCell[];               // Cell definitions
  hints?: { en?, ru? };                // Player hints (array)
}
```

**Template Cell** (`TemplateCell`)
```typescript
{
  q, r: number;                        // Position relative to anchor
  relativeColor: number | null;        // -50..50 (percentage) or null (empty)
}
```

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
1. Player selects template in HexiPedia UI
2. `activateTemplate(state, templateId)` called
3. Template enters **flickering mode**: attached to focus position, opacity = 0.4 + 0.2 × sin((tick/6) × π)
4. Rotates with `facingDirIndex` (0–5)

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
1. When all required cells correctly filled:
   - `isTemplateCompleted()` returns true
   - `completedAtTick` set to current tick
   - Template ID added to `completedTemplates` set
   - `template_completed` audio event fires (fanfare)
2. If player removes all cells → template resets to **flickering mode**

### 7.3 Rotation System

Templates rotate with player heading via `facingDirIndex` (0–5):
```
function rotateAxial(pos, rotation):
  repeat rotation times:
    (q, r) → (-r, q + r)  // 60° clockwise rotation
    
worldPos = anchorPos + rotatedPos
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
  templateId: string;
  anchoredAt: {
    q: number; r: number;             // World coordinates
    baseColorIndex: number;            // Anchor color
    rotation: number;                  // 0–5 (facing direction)
  } | null;                            // null = flickering
  hasErrors: boolean;                  // Any wrong-colored cells?
  filledCells: Set<string>;            // "q,r" format
  completedAtTick?: number;            // Completion timestamp
};
completedTemplates?: Set<string>;      // Finished template IDs
```

### 7.6 Available Templates (Standard Library)

| Template ID | Name | Difficulty | Cells | Description |
|-------------|------|-----------|-------|-------------|
| `ring_r1` | Simple Ring | Easy | 7 | Center + 6 adjacent, all same color. Tutorial intro. |
| `triangle` | Rainbow Triangle | Easy | 3 | Small triangle with gradient: 0%, 12.5%, 25% |
| `flower` | Flower | Medium | 7 | Center (0%) + 6 petals alternating (0%, 25%) |
| `yin_yang` | Yin-Yang | Hard | 7 | Balanced opposites: 0%, 25%, 50%, -25%. Complex pattern. |

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

- **More Templates**: Add to `templateLibrary.ts` following `BuildTemplate` interface
- **Custom Difficulty**: Difficulty filter already implemented in UI
- **Hints Localization**: `hints` array supports multi-language strings
- **Persistence**: `completedTemplates` persists across sessions
- **Future: User-Created Templates**: Architecture supports dynamic template definition

---
## 8. User Interface & UX (v0.22–0.26)

### 8.1 Tutorial System enhancements
- **TutorialProgressWidget**: Displays tutorial level progress (visited cells / target cells)
  - Info button (ℹ) provides quick access to task objective and hints
  - Info bubble popup always shows hint text for the currently active tutorial task
  - Positioned in-game, allowing context-aware task information without tab switching

### 8.1.1 Input reliability
- **Hotbar hit-testing**:
  - Mobile hotbar click/tap detection uses the same geometry values as hotbar rendering
  - Prevents neighbor-slot activation when tapping lower ring cells

### 8.2 HexiPedia (Information Hub)
- **Section Management**:
  - Three collapsible sections: Tasks, Stats, Build Templates
  - Each section can be collapsed with toggle arrow (▼/▶)
  - Section order customizable with up/down arrows (▲/▼)
  - Section selector remains fixed; all section content below it scrolls as one area
  - Collapsible sections persist in component state during session

- **Task List**:
  - Shows all tutorial levels with completion status (✓)
  - Display format: checkpoint + name + action button
  - Current level highlighted; completed levels show restart option
  - Expandable task details show objective, hints, and progress

- **Statistics**:
  - Session time (MM:SS format for readability)
  - Session tick count (raw game ticks)
  - Real-time updates as game progresses

- **Build Templates**:
  - Radio button selection for active template
  - Template metadata: name, difficulty (●●●), completion status (✓)
  - Expandable details with description, hints, and cell count

### 8.3 ColorPaletteWidget (Palette Visualization)
- **Display**: 9-cell color bar showing entire palette
  - Ordered from antagonist color through player base (center) back to antagonist
  - Each cell displays relative percentage from current focus color
  - Format: `±XX%` (e.g., `+50%`, `-33.33%`, `0%`)
  - Focus color (player base) highlighted with bright border

- **Styling**:
  - Consistent with HexiPedia widget aesthetic
  - Framed with border, background, and shadow
  - Positioned directly below tutorial progress widget when tutorial is active
  - Uses the same content width as the tutorial progress widget

### 8.4 Session Persistence
- **Tutorial Progress**: Tracks visited target cells per level (in-session)
- **Completed Templates**: Persists across sessions (set of completed template IDs)
- **Tutorial Level State**: Current level + completion status maintained in GameState

### 8.5 Audio resume behavior
- **Music state persistence**:
  - Track index and playback time are stored in local storage
  - After page reload, music retries playback on first user interaction automatically
  - No settings toggle required to resume from saved position

---
## 9. Not Implemented (Scope Notes)
Still absent: delivery targets, objectives, progression, end conditions, obstacles beyond occupied cells, persistence (beyond templates/tutorial).

---
## 10. Summary
The prototype's gameplay centers on probabilistic single-color capture and spatial transport constrained by empty adjacency. All time-sensitive behaviors have been normalized to discrete ticks (12 per second) enabling consistent tuning independent of visual frame rate. Template system adds creative spatial pattern challenges as optional gameplay layer. UI/UX layer provides accessible tutorial progression and information lookup without interrupting core gameplay.

---
## 11. Potential Future Parameters (Extensions)
- `MultipleCarryAllowed` (bool)
- `TransportLeavesTrail` (bool, whether previous cell retains color instead of clearing)
- `CaptureChanceMinClamp` (percent)
- `MaxSimultaneousFlashes` (int)
- `TemplateHintRevealCost` (int, ticks spent to unlock hints)
- `TutorialSystemLocalization` (language selection for UI/hints)
- `HexiPediaSectionDefaults` (initial collapse state, custom section order)
- `TemplateRotationAllowed` (bool, can player modify template orientation after anchoring)

These can be added without altering core logic structure.
