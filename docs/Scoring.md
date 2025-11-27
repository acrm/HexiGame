# Color Adjacency Metric (Current Implementation)

The current prototype uses a **simple adjacency metric** instead of full cluster scoring.
For each color, we count how many of its cells have **at least one neighbor of the same color**.
This value is rendered inside the hex of the corresponding color on the UI color wheel.

---

## 1. Purpose

The goal of the metric is to provide a quick visual indication of how “glued together” cells of the same color are:

* Isolated single cells do **not** contribute.
* Any cell that has at least one same‑color neighbor increases that color’s count by 1.

This metric is simple, readable for players, and does not require expensive cluster detection.

---

## 2. Definitions

Let:

* `grid` — current hex grid.
* `colorIndex` — index of a color in `ColorPalette` (0..K-1).
* `neighbors(cell)` — six edge‑adjacent neighbors in axial coordinates.

Then for each color `i` we define:

```
adjacentCount[i] = number of cells of color i
                   that have at least one neighbor of color i
```

---

## 3. Algorithm (pseudocode)

```
function compute_adjacent_same_color_counts(grid, paletteLength):
    result = array_of_zeros(length = paletteLength)

    for each cell in grid:
        if cell.colorIndex is null:
            continue

        c = cell.colorIndex
        hasSameNeighbor = false

        for each dir in 6 axial directions:
            neighbor = grid.get(cell.q + dir.q, cell.r + dir.r)
            if neighbor != null and neighbor.colorIndex == c:
                hasSameNeighbor = true
                break

        if hasSameNeighbor:
            result[c] += 1

    return result
```

Important: the same neighboring pair contributes **one unit per cell**,
not one shared unit per pair.

---

## 4. UI Representation

* For each color `i`, the value `adjacentCount[i]` is used.
* On the color wheel, the corresponding hex displays this number inside:
    * if `adjacentCount[i] > 0`, the number is shown,
    * if `adjacentCount[i] == 0`, no text is rendered inside the hex.

This lets the player quickly see which colors already form “connected” areas.

---

## 5. Legacy Cluster Scoring (Removed)

An earlier version of the prototype experimented with a more complex
cluster‑based scoring system ("Color Cluster Scoring Metric") that
combined cluster compactness and hue affinity to the player color.

That code has been **removed from the main game logic** and is not used
anymore. The idea may be revisited in future versions (for example,
for AI heuristics or end‑of‑round scoring), but the current build only
uses the simple adjacency metric described above.
