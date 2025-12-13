# Parameters and Configuration

## Default Parameters

All tunable game constants defined in `DefaultParams`:

```typescript
export const DefaultParams: Params = {
  GridRadius: 5,
  InitialColorProbability: 0.30,
  ColorPalette: [
    "#FF8000", "#CC6600", "#996600", "#666600",
    "#660099", "#9933FF", "#CC66FF", "#FF99FF"
  ],
  PlayerBaseColorIndex: 0,
  TimerInitialSeconds: 300,
  CaptureHoldDurationTicks: 6,
  CaptureFailureCooldownTicks: 12,
  CaptureFlashDurationTicks: 2,
  ChanceBasePercent: 100,
  ChancePenaltyPerPaletteDistance: 20,
  CarryFlickerCycleTicks: 6,
  CarryFlickerOnFraction: 0.5,
  CarryingMoveRequiresEmpty: true,
  GameTickRate: 12,
}
```

## Grid Parameters

### GridRadius

- **Type**: `number`
- **Default**: `5`
- **Description**: Axial hex disk radius (all cells with |q|, |r|, |s| ≤ radius)
- **Effect**: Determines grid size
- **Example**: Radius 5 → 91 hexes total

### InitialColorProbability

- **Type**: `number` (0.0 to 1.0)
- **Default**: `0.30` (30%)
- **Description**: Probability a cell starts with a color
- **Effect**: Controls initial grid density
- **Example**: 0.30 → ~27 colored hexes, ~64 empty

## Color Parameters

### ColorPalette

- **Type**: `string[]` (hex color codes)
- **Default**: 8 colors
  ```
  "#FF8000"  // Orange (player)
  "#CC6600"  // Dark orange
  "#996600"  // Yellow-brown
  "#666600"  // Dark yellow
  "#660099"  // Dark purple (antagonist)
  "#9933FF"  // Purple
  "#CC66FF"  // Light purple
  "#FF99FF"  // Pink
  ```
- **Description**: Ordered list defining palette indices
- **Effect**: Determines available colors and capture probability distances
- **Constraints**: Must have at least 1 color; 8 recommended for current design

### PlayerBaseColorIndex

- **Type**: `number`
- **Default**: `0` (orange #FF8000)
- **Description**: Index in `ColorPalette` used as player's reference color
- **Effect**: Determines capture probability (distance from this color)
- **Visual**: Used for turtle color and inventory background tint

## Timing Parameters (Tick-Based)

All durations expressed in **ticks** (1 tick = 1/12 second ≈ 83.33ms).

### GameTickRate

- **Type**: `number`
- **Default**: `12` (12 ticks per second)
- **Description**: Logical ticks per second
- **Effect**: Game logic update frequency
- **Note**: Independent of rendering frame rate (60 FPS)

### TimerInitialSeconds

- **Type**: `number`
- **Default**: `300` (5 minutes)
- **Description**: Starting session duration (informational only)
- **Effect**: Countdown display; no gameplay enforcement

### CaptureHoldDurationTicks

- **Type**: `number`
- **Default**: `6` (0.5 seconds)
- **Description**: Minimum continuous action mode duration to attempt capture
- **Effect**: How long to hold Space/ACT before capture attempt
- **Formula**: `6 ticks @ 12 ticks/sec = 0.5 seconds`

### CaptureFailureCooldownTicks

- **Type**: `number`
- **Default**: `12` (1.0 seconds)
- **Description**: Cooldown after failed capture attempt
- **Effect**: Cannot enter action mode for this duration
- **Formula**: `12 ticks @ 12 ticks/sec = 1.0 seconds`

### CaptureFlashDurationTicks

- **Type**: `number`
- **Default**: `2` (~0.167 seconds)
- **Description**: Duration of success/failure flash feedback
- **Effect**: How long flash state persists
- **Formula**: `2 ticks @ 12 ticks/sec ≈ 0.167 seconds`

### CarryFlickerCycleTicks

- **Type**: `number`
- **Default**: `6` (0.5 seconds)
- **Description**: Period of captured tile flicker cycle
- **Effect**: How fast carried hex flickers (not currently visible)
- **Formula**: `6 ticks @ 12 ticks/sec = 0.5 seconds`

### CarryFlickerOnFraction

- **Type**: `number` (0.0 to 1.0)
- **Default**: `0.5` (50%)
- **Description**: Fraction of cycle during which flicker is lit
- **Effect**: Duty cycle of flicker (not currently visible)

## Capture Probability Parameters

### ChanceBasePercent

- **Type**: `number` (0 to 100)
- **Default**: `100`
- **Description**: Base percent before distance penalties
- **Effect**: Maximum capture chance (at distance 0)
- **Note**: Defined in DefaultParams but current formula uses direct 100% calculation instead

### ChancePenaltyPerPaletteDistance

- **Type**: `number`
- **Default**: `20` (20% per distance unit)
- **Description**: Percent deducted per palette index distance
- **Effect**: Rate of probability decay with color distance
- **Note**: Defined in DefaultParams but not used; current formula uses linear interpolation based on maxDist instead

**Current Formula Implementation**:
```javascript
maxDist = floor(paletteLength / 2)  // 4 for 8 colors
dist = paletteDistance(colorIndex, playerBaseIndex, paletteLength)
chance = ((maxDist - dist) / maxDist) * 100%
chance = max(10%, round(chance))
```

## Movement Parameters

### CarryingMoveRequiresEmpty

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Must move only into empty cells while carrying
- **Effect**: Blocks movement into colored cells during release
- **Note**: Should always be true (false would allow overwriting)

## Rendering Constants (Not in Params)

These are hardcoded in rendering code:

```javascript
const HEX_SIZE = 10  // Base hex radius in pixels
const FLASH_SUCCESS_COLOR = '#00BFFF'
const FLASH_FAILURE_COLOR = '#FF4444'
const FLASH_FAILURE_EDGE_DARK = '#AA0000'
const GRID_STROKE_COLOR = '#635572ff'
```

## Derived Values

### Tick Duration

```
tickDuration = 1000ms / GameTickRate
             = 1000ms / 12
             ≈ 83.33ms
```

### Capture Chance

```
paletteDistance = min(abs(colorIndex - playerBaseIndex), paletteLength - abs(colorIndex - playerBaseIndex))
maxDist = floor(paletteLength / 2)
chance = ((maxDist - paletteDistance) / maxDist) * 100%
chance = max(10%, min(100%, round(chance)))
```

For 8-color palette:
- Distance 0: 100%
- Distance 1: 75%
- Distance 2: 50%
- Distance 3: 25%
- Distance 4: 10% (clamped)

### Grid Size

```
gridSize = number of hexes in disk of radius R
         = 1 + 3 * R * (R + 1)

For R = 5:
gridSize = 1 + 3 * 5 * 6 = 91 hexes
```

## Parameter Validation

No runtime validation currently implemented. Invalid values may cause:

- **GridRadius < 1**: Empty grid
- **InitialColorProbability < 0 or > 1**: Unexpected color distribution
- **ColorPalette.length < 1**: Division by zero in chance formula
- **PlayerBaseColorIndex >= palette.length**: Out of bounds error
- **GameTickRate <= 0**: Divide by zero in tick interval

**Recommendation**: Add validation in `createInitialState()` or parameter setter.

## Customization

Parameters can be overridden:

```typescript
const customParams: Partial<Params> = {
  GridRadius: 7,          // Larger grid
  InitialColorProbability: 0.50,  // More colored hexes
  CaptureHoldDurationTicks: 12,   // Slower capture
}

<Game params={customParams} seed={12345} />
```

Merged with defaults:

```typescript
const mergedParams = { ...DefaultParams, ...params }
```

## Future Parameters

Documented but not yet implemented:

- `MultipleCarryAllowed` (bool): Carry multiple hexes
- `TransportLeavesTrail` (bool): Previous cell retains color
- `CaptureChanceMinClamp` (percent): Minimum probability floor
- `DeliverZoneRadius` (int): Scoring target area
- `MaxSimultaneousFlashes` (int): Limit concurrent flash effects
- `RandomSeed` (number): Deterministic RNG seed

## Configuration Files

**Not used**: All parameters inline in code.

**Future**: Could load from JSON config file:

```json
{
  "grid": {
    "radius": 5,
    "initialColorProbability": 0.30
  },
  "timing": {
    "tickRate": 12,
    "captureHoldDuration": 6
  }
}
```

## Environment-Specific Overrides

**Not implemented**: No dev/prod config differences.

**Future**: Could use Vite environment variables:

```javascript
const params = {
  ...DefaultParams,
  GridRadius: import.meta.env.DEV ? 3 : 5,  // Smaller grid in dev
}
```

## Parameter Persistence

**Not implemented**: Parameters reset on page reload.

**Future**: Could store in localStorage:

```javascript
localStorage.setItem('hexigame-params', JSON.stringify(params))
```

## Difficulty Presets

**Not implemented**: No easy/normal/hard modes.

**Example presets**:

```typescript
const PRESETS = {
  easy: {
    CaptureHoldDurationTicks: 3,
    CaptureFailureCooldownTicks: 6,
  },
  normal: DefaultParams,
  hard: {
    CaptureHoldDurationTicks: 12,
    CaptureFailureCooldownTicks: 24,
    InitialColorProbability: 0.15,
  },
}
```

## Performance Tuning

### For Slower Devices

```typescript
{
  GridRadius: 3,          // Fewer hexes (37 instead of 91)
  GameTickRate: 6,        // Half speed (less CPU)
}
```

### For Testing

```typescript
{
  CaptureHoldDurationTicks: 1,  // Instant capture
  CaptureFailureCooldownTicks: 1,  // No cooldown
  InitialColorProbability: 1.0,  // All colored
  GridRadius: 2,          // Tiny grid (19 hexes)
}
```

## Color Palette Variants

### Warm Theme

```typescript
ColorPalette: [
  "#FF4500", "#FF6347", "#FF7F50", "#FFA500",
  "#FFD700", "#FFFF00", "#ADFF2F", "#7FFF00"
]
```

### Cool Theme

```typescript
ColorPalette: [
  "#00CED1", "#00BFFF", "#1E90FF", "#0000FF",
  "#4B0082", "#8A2BE2", "#9400D3", "#FF00FF"
]
```

### Grayscale Theme

```typescript
ColorPalette: [
  "#000000", "#202020", "#404040", "#606060",
  "#808080", "#A0A0A0", "#C0C0C0", "#E0E0E0"
]
```
