# Color Cluster Scoring Metric 

This document describes a scoring system used to evaluate color clustering on a hex‑grid.
The goal: **measure how well colors form connected blobs** and how favorable these blobs are to the player color.

The metric is:

* **Minimal** when all cells are scattered (no color‑adjacent pairs).
* **Maximal** when colors form clean, continuous clusters, with the player color dominating.

---

## 1. Grid Setup

Each cell is either empty or has one of `K` colors on a circular color wheel.

Definitions:

```
C = set of all colors present on the board
V_c = list of all cells of color c
N_c = |V_c|  (count)
N_total = sum(N_c for c in C)
```

Two cells are neighbors if they share a hex edge.

---

## 2. Cluster Compactness per Color

For each color `c`, build a graph:

```
Nodes = all cells of color c
Edges = between any two nodes that are hex-neighbors
```

Then find connected components:

```
clusters_c = connected_components(Nodes)
K_c = number of clusters
L_c = size of the largest cluster
```

### Compactness formula

```
if N_c <= 1:
    m_c = 0
else:
    m_c = (L_c - 1) / (N_c - 1)
```

Range:

* `m_c = 0` → completely scattered
* `m_c = 1` → all cells connected in one blob

---

## 3. Area Weight

A color matters more if it covers more area:

```
w_c = N_c / N_total
```

Combined structural value:

```
control_c = m_c * w_c
```

---

## 4. Color Wheel and Affinity

Assume colors arranged on a wheel:

```
h(c) = hue index of color c (0..K-1)
h_p = player color index
h_a = (h_p + K/2) mod K    # antagonist (K is even)
```

### Circular distance

```
d_c = min(|h(c)-h_p|, K - |h(c)-h_p|)
x_c = d_c / (K/2)     # normalized 0..1
```

### Signed affinity (player=+1, antagonist=−1)

```
alpha_c = 1 - 2 * x_c
```

Meaning:

* `alpha = +1` → player color
* `alpha = -1` → antagonist color
* `alpha = 0` → colors orthogonal on the wheel

---

## 5. Final Score

Per‑color contribution:

```
S_c = alpha_c * m_c * w_c
```

Total score:

```
S = sum(S_c for c in C)
```

Interpretation:

* If all colors are scattered → all `m_c = 0` → `S = 0`
* If all colors form perfect clusters → score depends on **area distribution** and **hue affinity**

---

## 6. Example Values (K=8)

```
player = 0
antagonist = 4
alpha = [1, 0.5, 0, -0.5, -1, -0.5, 0, 0.5]
```

(Indices 1 & 7 help the player, 3 & 5 help antagonist, 2 & 6 neutral)

---

## 7. Full Scoring Algorithm (Pseudocode)

```
function compute_score(grid):
    C = all distinct colors on grid
    N_total = 0
    for c in C:
        V_c = all cells where cell.color == c
        N_c = len(V_c)
        N_total += N_c

    # Step 1: compute m_c for each color
    for c in C:
        clusters = connected_components(V_c)
        if N_c <= 1:
            m_c[c] = 0
        else:
            L_c = size_of_largest_cluster(clusters)
            m_c[c] = (L_c - 1) / (N_c - 1)

    # Step 2: compute w_c
    for c in C:
        w_c[c] = N_c / N_total

    # Step 3: compute color affinity alpha_c
    for c in C:
        d = min(abs(h(c)-h_p), K - abs(h(c)-h_p))
        x = d / (K/2)
        alpha_c[c] = 1 - 2*x

    # Step 4: final sum
    S = 0
    for c in C:
        S += alpha_c[c] * m_c[c] * w_c[c]

    return S
```

---

## 8. Usage in Game Design

* End‑of‑round scoring
* AI heuristics
* Player feedback on field organization
* Balancing antagonistic pressure vs. color grouping

Score is guaranteed to be:

* **Low** for chaotic, scattered layouts
* **High** for cleanly clustered, player‑aligned layouts
