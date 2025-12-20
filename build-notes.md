# Build Notes

- 25w48-0.1 — Initial snapshot version entry.

- 25w48-0.4 — Adjust mobile joystick visuals

- 25w48-0.5 — Update title with HexiGame name and snapshot version

- 25w48-0.6 — Backfill missed AI changes: version env + title formatting

- 25w48-0.7 — Simplify protagonist marker: remove tail flower

- 25w48-0.8 — Remove opposite petal from protagonist flower to hide tail

- 25w48-0.9 — Auto-restart dev server after version bumps

- 25w48-0.10 — Use dynamic viewport height for mobile layout

- 25w48-0.11 — Disable dev restart from version bump script

- 25w48-0.12 — Throttle cursor and joystick movement to once per 6 ticks

- 25w48-0.13 — Align on-screen joystick movement with hex grid directions

- 25w48-0.14 — Restore turtle follower movement to previous behavior

- 25w48-0.15 — Limit turtle follower to one move per 6 ticks while keeping joystick-aligned cursor movement

- 25w48-0.16 — Align joystick-driven cursor steps to on-screen directions

- 25w48-0.17 — Fix follower: preserve previous cursor when throttled; move into it when non-adjacent

- 25w48-0.18 — Remove follower throttling; throttle cursor moves only; add language policy to AI instructions

- 25w48-0.19 — Mobile: draw joystick direction arrow; reuse shared mapping for cursor step

- 25w48-0.20 — Fix joystick diagonals; redesign top panel: flat-top hexes, two rows, antagonist left, protagonist right, capture % right of palette, info popup overlay

- 25w48-0.21 — Add EAT action; make debug arrow configurable

- 25w48-0.22 — Palette cluster with center chance; platform-specific controls; fix joystick sector and CAP text

- 25w48-0.23 — Diamond 8-hex palette cluster; mobile EAT only when carrying; position desktop/mobile info blocks; fix joystick sectors

- 25w48-0.24 — Controls blocks: split desktop/mobile; reorder text 'control: action'; mobile popup offset

- 25w48-0.25 — Extract ControlsDesktop/ControlsMobile components; place desktop inline and mobile popup below 'i'

- 25w48-0.26 — Fix EAT touch coordinates, joystick direction mapping, extract PaletteCluster component

- 25w48-0.27 — Extract GameField component with canvas rendering and mobile controls touch handling

- 25w48-0.28 — Update version to 25w48-0.27 and implement GameField component with touch controls and rendering logic

- 25w48-0.29 — Fix turtle eyes perpendicular to head direction

- 25w48-0.30 — Add INV/WRL toggle button and touch handling

- 25w48-0.31 — Implement inventoryGrid in GameState with random placement on eat and active-field movement/capture

- 25w48-0.32 — Fix palette ring order: antagonist left, protagonist right, intermediates by hue

- 25w48-0.33 — Render inventoryGrid as full hex field, update controls text for inventory mode interactions

- 25w48-0.34 — Fix palette order per image, reduce turtle 3x with thin lines pressed to cursor edge, instant 100% capture in inventory

- 25w48-0.35 — Turtle moves to cursor during charge at 1 cell/tick, capture fails if doesn't reach; inventory capture 1-tick; allow empty cell capture; CAP button always visible

- 25w48-0.36 — Reduce turtle speed: 1 cell per 2 ticks during charge, 1 cell per 4 ticks when carrying; turtle targets adjacent cell to cursor

- 25w48-0.37 — World cursor defaults to vertex highlight; carried hex stays in-grid with white outline; release moves hex via head cell toward cursor and drops on arrival; INV/WRL toggles on press

- 25w48-0.38 — World: cursor defaults to vertex highlight; charging shows sequential edges; cooldown rotates red edge; release rotates edges; carried hex stays in-grid with white outline; remove separate overlay; comments in code are English-only

 - 25w48-0.39 — Charge movement sets facingDir; carrying pivot renders turtle rotating around captured hex (head faces cursor); release moves turtle+hex toward cursor until drop; cursor modes unchanged

- 25w48-0.39 — Charge: turtle sets facing; Carry: turtle pivots around captured hex facing cursor; Release: turtle + hex advance toward cursor; World cursor modes unchanged

- 25w48-0.40 — Fix: start charge only when hex under cursor; release waits delivery; prevent turtle overlap with carried hex during release

- 25w48-0.41 — Introduce Action Mode: Space/ACT holds action; turtle advances toward cursor stopping adjacent; adjacency triggers capture charge (hex present) or release initiation (carrying over empty cursor); world cursor shows rotating opposite edge pair during action mode; mobile button renamed CAP→ACT.

- 25w48-0.41 — enhance turtle movement mechanics, and refine palette cluster arrangement

- 25w48-0.44 — Fix action mode reset on Space release; gate release movement by action mode; ensure capture/release start only when adjacent

- 25w48-0.45 — Mobile ACT button now holds action mode and always resets on touch release (even outside); adjacency gating preserved

- 25w48-0.46 — Enforce protagonist/captured adjacency; add desktop click & mobile tap cursor focus

- 25w48-0.47 — Turtle render pivots on protagonist; add 6-tick post-release/drop cooldown gating action mode

- 25w48-0.48 — Allow release to continue after action release; don't cancel isReleasing on Space/ACT up

- 25w48-0.49 — Fix release target drop and add releaseTarget handling

- 25w48-0.50 — Add copilot-instructions.md with architecture overview and recent changes

- 2025w50-0.1 — Test week code calculation

- 2025w50-0.2 — Simplify copilot-instructions; fix update-version.js to use current week code

- 2025w50-0.3 — Disable capture logic, implement turn/move/eat on action release

- 2025w50-0.4 — Short/long actions: cursor teleport, turn, short-step, long eat/jump, breadcrumbs path

- 2025w50-0.5 — Breadcrumbs 1/9 #dddddd; turtle color shifts toward hex over time; eat chance uses current turtle color; visuals use turtle color

- 2025w50-0.6 — Turtle color: shift only when entering colored hex (removed periodic 6-tick shifts)

- 2025w50-0.7 — Palette displays color wheel order; chance updates with turtle's current color vs cursor hex

- 2025w51-0.1 — Fix palette color wheel order; breadcrumbs: first 6 #cccccc, rest #999999

- 2025w51-0.2 — Correct palette wheel order to match yellow line sequence

- 2025w51-0.3 — Fix palette order: swap positions 3 and 4 per user diagram

- 2025w51-0.4 — Palette remap: 3→5, 4→3, 5→6, 6→4

- 2025w51-0.5 — Palette: swap 4 and 6 positions

- 2025w51-0.6 — Palette: swap 5 and 6; highlight turtle's current color with green border

- 2025w51-0.7 — Palette: reorder clusterPositions to match color wheel, remove ringOrder mapping

- 2025w51-0.8 — Palette: use axial coordinates (q,r), convert to pixels on render

- 2025w51-0.9 — Revert to pixel coordinates for palette cluster

- 2025w51-0.10 — Add hexagonal and Cartesian coordinate comments to palette cluster

- 2025w51-0.11 — Fix palette coordinates: flat-top formula with accurate coefficients

- 2025w51-0.12 — Restore real palette coordinates with accurate formula comments

- 2025w51-0.13 — Remove mobile joystick and act tap

- 2025w51-0.14 — Update control info to English

- 2025w51-0.15 — Update control info for hold-eat

- 2025w51-0.16 — Update info for hold-eat color mechanic

- 2025w51-0.17 — Clarify hold eat vs jump in tips

- 2025w51-0.18 — Mention ACT in mobile tips

- 2025w51-0.19 — Clarify color drift on hex exit

- 2025w51-0.20 — Color drift on leaving hex

- 2025w51-0.21 — Add itch.io publishing files and workflow
