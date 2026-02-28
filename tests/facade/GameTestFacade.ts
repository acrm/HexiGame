/**
 * GameTestFacade — агностичный интерфейс для тестирования игровой логики.
 *
 * Все тесты пишутся ТОЛЬКО через этот фасад, не импортируя pureLogic напрямую.
 * Это позволяет безопасно рефакторить реализацию, не переписывая тесты.
 *
 * API разделён на три группы:
 *  - Command  — изменяют состояние игры
 *  - Query    — читают состояние без изменений
 *  - Assert   — готовые assertions для часто проверяемых инвариантов
 */

// ─── Value Objects ────────────────────────────────────────────────────────────

export interface Position {
  q: number;
  r: number;
}

export interface CellInfo {
  q: number;
  r: number;
  colorIndex: number | null;
}

export interface FacadeParams {
  gridRadius?: number;
  paletteSize?: number;
  initialColorProbability?: number;
  timerInitialSeconds?: number;
  tickRate?: number;
}

// ─── Facade Interface ─────────────────────────────────────────────────────────

export interface GameTestFacade {
  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Создать новое состояние с нужными параметрами и seed для RNG.
   * По умолчанию используется radius=5, seed=42.
   */
  init(params?: FacadeParams, seed?: number): void;

  /**
   * Выполнить N тиков симуляции (по умолчанию 1).
   */
  tick(n?: number): void;

  // ── Commands ───────────────────────────────────────────────────────────────

  /**
   * Переместить фокус на соседнюю ячейку (delta = одно из 6 направлений).
   */
  moveFocusDelta(dq: number, dr: number): void;

  /**
   * Переместить фокус по индексу направления (0..5).
   */
  moveFocusDirection(dirIndex: number): void;

  /**
   * Инициировать авто-движение протагониста к цели.
   */
  moveToTarget(target: Position): void;

  /**
   * Выполнить контекстное действие (съесть/перенести hex под фокусом).
   */
  pressAction(): void;

  /**
   * Выбрать слот хотбара.
   */
  selectHotbarSlot(index: number): void;

  /**
   * Обменять hex в фокусе с конкретным слотом хотбара.
   */
  exchangeWithSlot(slotIndex: number): void;

  /**
   * Поместить hex определённого цвета в ячейку сетки (для setup сценариев).
   */
  setCell(pos: Position, colorIndex: number | null): void;

  /**
   * Установить позицию протагониста напрямую (для setup сценариев).
   */
  setProtagonistPosition(pos: Position): void;

  /**
   * Установить содержимое слота хотбара напрямую (для setup сценариев).
   */
  setHotbarSlot(index: number, colorIndex: number | null): void;

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Текущая позиция протагониста. */
  getProtagonistPosition(): Position;

  /** Текущая позиция фокуса. */
  getFocusPosition(): Position;

  /** Индекс направления взгляда протагониста (0..5). */
  getFacingDirection(): number;

  /** Информация о ячейке в позиции фокуса (world grid). */
  getFocusCell(): CellInfo | undefined;

  /** Информация о произвольной ячейке в world grid. */
  getCell(pos: Position): CellInfo | undefined;

  /** Содержимое слотов хотбара (null = пусто). */
  getHotbarSlots(): Array<number | null>;

  /** Индекс выбранного слота хотбара. */
  getSelectedHotbarIndex(): number;

  /** Текущий тик. */
  getTick(): number;

  /** Оставшиеся секунды таймера. */
  getRemainingSeconds(): number;

  /** Все ячейки в world grid, у которых colorIndex !== null. */
  getColoredCells(): CellInfo[];

  /** Общее число hex-цветов (сумма по всем ячейкам + хотбар). */
  getTotalColorCount(): number;

  /** Идёт ли авто-движение. */
  isAutoMoving(): boolean;

  // ── Assertions ─────────────────────────────────────────────────────────────

  /**
   * Убедиться, что суммарное число hex-цветов не изменилось.
   * Используется для проверки инварианта сохранения цветов.
   */
  assertColorConservation(expectedTotal: number): void;
}
