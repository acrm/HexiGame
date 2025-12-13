# Infrastructure Layer - Configuration Module

## Module Overview

**Package**: `src/infrastructure/config`  
**Responsibility**: Manage game parameters and settings  
**Dependencies**: None  
**Dependents**: All modules (provides GameParams)

## Design Principles

1. **Type Safety**: All parameters strongly typed
2. **Validation**: Invalid configurations rejected
3. **Defaults**: Sensible default values provided
4. **Presets**: Named configuration sets
5. **Immutability**: Configuration objects are immutable

## Data Structures

### GameParams

Complete game configuration.

```typescript
interface GameParams {
  // Grid
  readonly GridRadius: number;                      // 1-50, default 15
  readonly InitialColorProbability: number;          // 0-1, default 0.20
  
  // Colors
  readonly ColorPalette: readonly string[];          // Hex color strings
  readonly PlayerBaseColorIndex: number;             // 0 to palette length-1
  
  // Timing
  readonly TimerInitialSeconds: number;              // ≥0, default 300
  readonly GameTickRate: number;                     // 1-120, default 12
  
  // Capture
  readonly CaptureHoldDurationTicks: number;         // ≥1, default 6
  readonly CaptureFailureCooldownTicks: number;      // ≥0, default 36
  readonly CaptureFlashDurationTicks: number;        // ≥1, default 2
  readonly ChanceBasePercent: number;                // 0-100, default 100
  readonly ChancePenaltyPerPaletteDistance: number;  // ≥0, default 20
  
  // Carry
  readonly CarryFlickerCycleTicks: number;           // ≥1, default 6
  readonly CarryFlickerOnFraction: number;           // 0-1, default 0.5
  readonly CarryingMoveRequiresEmpty: boolean;       // default true
  
  // Movement
  readonly ProtagonistMoveSpeedTicks: number;        // ≥1, default 2
  readonly CarryingMoveSpeedTicks: number;           // ≥1, default 4
  
  // Drop
  readonly DropCooldownTicks: number;                // ≥0, default 6
}
```

### Validation Result

```typescript
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
}

interface ValidationError {
  readonly field: string;
  readonly value: any;
  readonly reason: string;
}

interface ValidationWarning {
  readonly field: string;
  readonly value: any;
  readonly suggestion: string;
}
```

## Public Interface

### ConfigManager

Manages configuration lifecycle.

```typescript
class ConfigManager {
  private currentParams: GameParams;
  private presets: Map<string, GameParams>;
  private validator: ConfigValidator;
  
  constructor() {
    this.currentParams = DefaultParams;
    this.presets = new Map();
    this.validator = new ConfigValidator();
    this.initializePresets();
  }
  
  /**
   * Get current parameters.
   */
  getParams(): GameParams {
    return this.currentParams;
  }
  
  /**
   * Set parameters (validates first).
   */
  setParams(params: Partial<GameParams>): ValidationResult {
    const merged = { ...this.currentParams, ...params };
    const result = this.validator.validate(merged);
    
    if (result.valid) {
      this.currentParams = Object.freeze(merged);
    }
    
    return result;
  }
  
  /**
   * Reset to default parameters.
   */
  reset(): void {
    this.currentParams = DefaultParams;
  }
  
  /**
   * Load named preset.
   */
  loadPreset(name: string): boolean {
    const preset = this.presets.get(name);
    if (!preset) return false;
    
    this.currentParams = preset;
    return true;
  }
  
  /**
   * Save current params as named preset.
   */
  savePreset(name: string): void {
    this.presets.set(name, this.currentParams);
  }
  
  /**
   * Get all preset names.
   */
  getPresetNames(): string[] {
    return Array.from(this.presets.keys());
  }
  
  /**
   * Export parameters as JSON.
   */
  export(): string {
    return JSON.stringify(this.currentParams, null, 2);
  }
  
  /**
   * Import parameters from JSON.
   */
  import(json: string): ValidationResult {
    try {
      const params = JSON.parse(json);
      return this.setParams(params);
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: '_json',
          value: json,
          reason: 'Invalid JSON format',
        }],
        warnings: [],
      };
    }
  }
  
  private initializePresets(): void {
    this.presets.set('default', DefaultParams);
    this.presets.set('easy', EasyModeParams);
    this.presets.set('hard', HardModeParams);
    this.presets.set('fast', FastPacedParams);
    this.presets.set('relaxed', RelaxedParams);
  }
}
```

### ConfigValidator

Validates parameter values.

```typescript
class ConfigValidator {
  /**
   * Validate complete parameter set.
   */
  validate(params: GameParams): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Grid validation
    if (params.GridRadius < 1 || params.GridRadius > 50) {
      errors.push({
        field: 'GridRadius',
        value: params.GridRadius,
        reason: 'Must be between 1 and 50',
      });
    }
    
    if (params.GridRadius > 20) {
      warnings.push({
        field: 'GridRadius',
        value: params.GridRadius,
        suggestion: 'Large grids may impact performance',
      });
    }
    
    if (params.InitialColorProbability < 0 || params.InitialColorProbability > 1) {
      errors.push({
        field: 'InitialColorProbability',
        value: params.InitialColorProbability,
        reason: 'Must be between 0 and 1',
      });
    }
    
    // Color validation
    if (params.ColorPalette.length === 0) {
      errors.push({
        field: 'ColorPalette',
        value: params.ColorPalette,
        reason: 'Must have at least one color',
      });
    }
    
    if (params.PlayerBaseColorIndex < 0 || 
        params.PlayerBaseColorIndex >= params.ColorPalette.length) {
      errors.push({
        field: 'PlayerBaseColorIndex',
        value: params.PlayerBaseColorIndex,
        reason: `Must be between 0 and ${params.ColorPalette.length - 1}`,
      });
    }
    
    // Validate all colors are hex strings
    for (let i = 0; i < params.ColorPalette.length; i++) {
      const color = params.ColorPalette[i];
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        errors.push({
          field: `ColorPalette[${i}]`,
          value: color,
          reason: 'Must be hex color format (#RRGGBB)',
        });
      }
    }
    
    // Timing validation
    if (params.GameTickRate < 1 || params.GameTickRate > 120) {
      errors.push({
        field: 'GameTickRate',
        value: params.GameTickRate,
        reason: 'Must be between 1 and 120',
      });
    }
    
    if (params.TimerInitialSeconds < 0) {
      errors.push({
        field: 'TimerInitialSeconds',
        value: params.TimerInitialSeconds,
        reason: 'Must be non-negative',
      });
    }
    
    // Capture validation
    if (params.CaptureHoldDurationTicks < 1) {
      errors.push({
        field: 'CaptureHoldDurationTicks',
        value: params.CaptureHoldDurationTicks,
        reason: 'Must be at least 1',
      });
    }
    
    if (params.ChanceBasePercent < 0 || params.ChanceBasePercent > 100) {
      errors.push({
        field: 'ChanceBasePercent',
        value: params.ChanceBasePercent,
        reason: 'Must be between 0 and 100',
      });
    }
    
    // Carry validation
    if (params.CarryFlickerOnFraction < 0 || params.CarryFlickerOnFraction > 1) {
      errors.push({
        field: 'CarryFlickerOnFraction',
        value: params.CarryFlickerOnFraction,
        reason: 'Must be between 0 and 1',
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Validate single parameter.
   */
  validateField(field: keyof GameParams, value: any): ValidationError | null {
    // Implementation for single field validation
    return null;
  }
}
```

## Parameter Presets

### DefaultParams

Standard game configuration.

```typescript
const DefaultParams: GameParams = Object.freeze({
  // Grid
  GridRadius: 15,
  InitialColorProbability: 0.20,
  
  // Colors
  ColorPalette: [
    '#FF8000',  // Orange (protagonist)
    '#CC6600',
    '#996600',
    '#666600',
    '#660099',  // Purple (antagonist)
    '#9933FF',
    '#CC66FF',
    '#FF99FF',
  ],
  PlayerBaseColorIndex: 0,
  
  // Timing
  TimerInitialSeconds: 300,
  GameTickRate: 12,
  
  // Capture
  CaptureHoldDurationTicks: 6,
  CaptureFailureCooldownTicks: 36,
  CaptureFlashDurationTicks: 2,
  ChanceBasePercent: 100,
  ChancePenaltyPerPaletteDistance: 20,
  
  // Carry
  CarryFlickerCycleTicks: 6,
  CarryFlickerOnFraction: 0.5,
  CarryingMoveRequiresEmpty: true,
  
  // Movement
  ProtagonistMoveSpeedTicks: 2,
  CarryingMoveSpeedTicks: 4,
  
  // Drop
  DropCooldownTicks: 6,
});
```

### EasyModeParams

Easier capture, longer times.

```typescript
const EasyModeParams: GameParams = Object.freeze({
  ...DefaultParams,
  InitialColorProbability: 0.15,  // Fewer obstacles
  CaptureHoldDurationTicks: 4,    // Faster charge
  CaptureFailureCooldownTicks: 24, // Shorter cooldown
  ChanceBasePercent: 100,          // Always 100% base
  ChancePenaltyPerPaletteDistance: 10, // Less penalty
  TimerInitialSeconds: 600,        // More time
});
```

### HardModeParams

Harder capture, tighter constraints.

```typescript
const HardModeParams: GameParams = Object.freeze({
  ...DefaultParams,
  InitialColorProbability: 0.30,   // More obstacles
  CaptureHoldDurationTicks: 12,    // Slower charge
  CaptureFailureCooldownTicks: 48, // Longer cooldown
  ChancePenaltyPerPaletteDistance: 30, // More penalty
  TimerInitialSeconds: 180,        // Less time
  ProtagonistMoveSpeedTicks: 3,    // Slower movement
});
```

### FastPacedParams

Quick gameplay.

```typescript
const FastPacedParams: GameParams = Object.freeze({
  ...DefaultParams,
  GameTickRate: 24,                // Double speed
  TimerInitialSeconds: 120,        // Short session
  CaptureHoldDurationTicks: 3,     // Quick capture
  ProtagonistMoveSpeedTicks: 1,    // Fast movement
  CarryingMoveSpeedTicks: 2,       // Fast carrying
});
```

### RelaxedParams

No time pressure.

```typescript
const RelaxedParams: GameParams = Object.freeze({
  ...DefaultParams,
  TimerInitialSeconds: 0,          // No timer
  CaptureHoldDurationTicks: 6,
  CaptureFailureCooldownTicks: 12, // Short cooldown
  InitialColorProbability: 0.10,   // Sparse grid
});
```

## Testing Requirements

### Unit Tests

1. **Validation Tests**:
   - Valid params pass validation
   - Invalid GridRadius rejected
   - Invalid color format rejected
   - Out of range values rejected
   - Warnings generated for edge cases

2. **Config Manager Tests**:
   - setParams updates current params
   - Invalid params rejected, old params retained
   - loadPreset loads correct configuration
   - savePreset stores configuration
   - export/import round-trips correctly

3. **Preset Tests**:
   - All presets are valid
   - Each preset has distinct characteristics
   - Presets are immutable

### Integration Tests

1. Game runs with each preset
2. Parameter changes affect gameplay correctly
3. Invalid config prevents game start
4. Config serialization preserves all fields

## Performance Considerations

- Params are immutable: safe to share
- Validation: O(1) per field
- Preset lookup: O(1) map access
- Export/import: O(n) where n = param count

## Dependencies

None - this is a foundational module.

## Exports

- `GameParams` interface
- `ConfigManager` class
- `ConfigValidator` class
- All preset constants
- `ValidationResult` interface

## Future Extensions

1. **Schema Versioning**: Migrate old configs to new schema
2. **Live Reload**: Hot-swap params during gameplay
3. **A/B Testing**: Track which configs are more fun
4. **User Profiles**: Per-user saved configurations
5. **Difficulty Curves**: Auto-adjust params based on performance
6. **Localization**: Param descriptions in multiple languages
