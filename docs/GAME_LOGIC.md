# Color Cell Prototype — Separated Logic & Implementation

This document separates PURE GAME LOGIC (independent of rendering / language) from IMPLEMENTATION DETAILS (current HTML5 canvas prototype). All tunable values are expressed as PARAMETERS. Timing is normalized to a fixed logical game tick where:

`game tick duration = 1/12 second ≈ 83.33 ms`

Frame-based constants from the original prototype are converted to tick-based values.

---
## 1. Parameters (Tunable Configuration)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `GridRadius` | 15 | Axial hex disk radius (all cells with |q|,|r|,|s| ≤ radius). |
| `InitialColorProbability` | 0.20 | Probability a cell starts with a color. |
| `ColorPalette` | 8 colors: [ #FF8000, #CC6600, #996600, #666600, #660099, #9933FF, #CC66FF, #FF99FF] | Ordered list defining palette indices. |
| `PlayerBaseColorIndex` | 0 | Index in `ColorPalette` used as the player's reference color. |
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
## 6. Build Template System

### Overview
The build template system allows players to create spatial color patterns following predefined templates. Templates guide players through visual overlays that move with the player or remain fixed once anchored.

### Template Data Structure
Each template (`BuildTemplate`) contains:
- **Metadata**: id, name, description, difficulty level
- **Anchor Cell**: Starting reference point (relative coordinates)
- **Cell List**: Array of template cells with:
  - Relative coordinates (q, r)
  - Relative color (-50 to +50, percentage offset from base color)
  - `null` for cells that should remain empty

### Relative Color System
Colors are specified as percentages from the base color:
- **0%**: Same as anchor (base color)
- **±25%**: Quarter-step around the palette
- **±50%**: Opposite/antagonist color (half-step)

Formula for absolute color:
```
absoluteColorIndex = (baseColorIndex + round(relativeColor/100 × paletteSize) + paletteSize) % paletteSize
```

### Template Lifecycle

#### 1. **Activation**
Player selects a template. Template enters "flickering mode":
- Attaches to player's focus position
- Rotates with player's facing direction
- Opacity oscillates (0.2–0.6) at ~0.5s period

#### 2. **Anchoring**
When player places first hex matching the template:
- Base color inferred from placed hex
- Template anchors to that position
- Rotation locked to current facing direction
- Template transitions to validation mode

#### 3. **Validation**
For each cell in anchored template:
- **Correct**: Cell matches expected color → white stroke, positive sound
- **Wrong**: Cell has wrong color → black stroke, negative sound
- **Empty**: Cell awaits filling → semi-transparent preview

#### 4. **Completion**
When all template cells correctly filled:
- Template completion event fires
- Fanfare sound plays
- Recorded in `completedTemplates` set
- Can remove hexes to reset to flickering mode

### State Variables in `GameState`
```typescript
activeTemplate?: {
  templateId: string;
  anchoredAt?: {
    q: number; r: number;
    baseColorIndex: number;
    rotation: number;  // 0–5
  } | null;
  hasErrors: boolean;
  filledCells: Set<string>;  // "q,r" format
  completedAtTick?: number;
}
completedTemplates?: Set<string>;
```

### Audio Feedback
- **Cell Correct**: UI tone on match
- **Cell Wrong**: Retro click on mismatch
- **Template Completed**: Fanfare sound

---
## 8. Not Implemented (Scope Notes)
Still absent: delivery targets, objectives, progression, end conditions, obstacles beyond occupied cells, persistence.

---
## 9. Summary
The prototype’s gameplay centers on probabilistic single-color capture and spatial transport constrained by empty adjacency. All time-sensitive behaviors have been normalized to discrete ticks (12 per second) enabling consistent tuning independent of visual frame rate.

---
## 10. Potential Future Parameters (Extensions)
- `MultipleCarryAllowed` (bool)
- `TransportLeavesTrail` (bool, whether previous cell retains color instead of clearing)
- `CaptureChanceMinClamp` (percent)
- `MaxSimultaneousFlashes` (int)

These can be added without altering core logic structure.
