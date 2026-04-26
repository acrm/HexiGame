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

- 2025w52-0.1 — Cursor renamed to focus, always positioned ahead of turtle head. Added drag support and auto-movement to clicked cells (1 cell per 2 ticks)

- 2025w52-0.2 — Removed turtle color shift logic on movement

- 2025w52-0.3 — Changed visualization: rotating edges now only for auto-move target, focus shown with highlighted vertices (no animation)

- 2025w52-0.4 — Fix: focus no longer jumps to clicked cell; auto-move highlights destination only

- 2025w52-0.5 — Fix: focus updates in desktop during auto-move (stays ahead of turtle)

- 2025w52-0.6 — Fix: focus sticks on destination by aligning facing on arrival

- 2025w52-0.7 — Add hotbar: top 7 hexes duplicated two cells above field (world view)

- 2025w52-0.8 — Hotbar shows all seven slots in top row

- 2025w52-0.9 — Separate outlined hotbar component above field

- 2025w52-0.10 — Hotbar selection and hover highlights

- 2025w52-0.11 — Hotbar uniform stroke width, layered highlights

- 2025w52-0.12 — Prevent mobile tap flash on hotbar

- 2025w52-0.13 — Mobile: replace panel with World/Self/Wiki tabs

- 2025w52-0.14 — Light/dark mobile tab colors

- 2025w52-0.15 — Remove mobile INV toggle (tabs handle it)

- 2025w52-0.16 — Mobile tabs switch views; wiki shows grey scene

- 2025w52-0.17 — Portrait view aligns field under hotbar

- 2025w52-0.18 — Hotbar slot rendering and selection

- 2025w52-0.19 — Fixed action triggering on clicks outside focus

- 2025w52-0.20 — Fixed action mode triggering on focus cell taps

- 2025w52-0.21 — Fixed touch handlers dependencies for action mode

- 2025w52-0.22 — Hotbar eat logic: central slot always empty, eaten hex goes to nearest free slot or selected slot

- 2025w52-0.23 — Fixed eatToHotbar to use focus cell instead of capturedCell

- 2025w52-0.24 — Remove capture system completely - all actions instant with hotbar

- 2025w52-0.25 — Fix action execution - ensure isActionMode and action fields are cleared on release

- 2025w52-0.26 — Remove action cooldown check - allow immediate action triggers

- 2025w52-0.27 — Simplify action system: instant context action on click, no isActionMode state, fix hotbar never uses center slot

- 2025w52-0.28 — Add context action trigger on focus cell click (desktop: LMB, mobile: ACT button)

- 2025w52-0.29 — Set inventory grid radius to fixed 7 (same cell size as world)

- 2025w52-0.30 — Visualize hotbar slots in inventory with borders matching selected state

- 2025w52-0.31 — Move hotbar display to separate horizontal strip above inventory grid

- 2025w52-0.32 — Fix inventory grid initialization to match 7x7 layout

- 2025w52-0.33 — Revert inventory to natural grid display with hotbar as part of inventory cells

- 2025w52-0.34 — Draw grey borders only on hotbar cells in inventory

- 2025w53-0.1 — Add hotbar slot coordinate mapping for inventory display

- 2025w53-0.2 — Unify hotbar inventory mapping: use HOTBAR_INVENTORY_CELLS for slot content positions

- 2025w53-0.3 — Show Hotbar only in world view; remove in inventory mode

- 2025w53-0.4 — Center inventory grid using its bounds; add configurable turtle under grid (rotation, scale)

- 2025w53-0.5 — Inventory cells now use world-based scale; centering preserved

- 2025w53-0.6 — Inventory turtle: outlines-only, head fixed upward (ignore rotation param)

- 2025w53-0.7 — Inventory turtle under grid; shell filled with bg color

- 2025w53-0.8 — Inventory turtle shell matches background tint; dots remain above

- 2025w53-0.9 — Hide hotbar in wiki tab; inventory dots drawn above turtle

- 2026w03-0.1 — Add Yandex build mode, platform integration stub, pause/resume events

- 2026w03-0.2 — Explicit interaction mode; desktop-only keyboard handlers

- 2026w03-0.3 — Add i18n and settings overlay; gear button top-right

- 2026w03-0.4 — Guest start overlay; Wiki shows elapsed time

- 2026w03-0.5 — Mobile tab bar redesign; settings with reset/sound/FPS/mascot; yandex build pipeline

- 2026w03-0.6 — Settings UI polish: large checkboxes, X close icon, gear button borderless; FPS toggle working; mascot shows exact turtle; timer reset; SDK loads in integration only

- 2026w03-0.7 — Settings UI polish: large checkboxes, X close icon, gear button borderless; FPS toggle working; mascot shows exact turtle; timer reset; SDK loads in integration only

- 2026w03-0.8 — Mascot full width; guest start full screen; Font Awesome icons; game time starts only after guest start

- 2026w03-0.9 — Mascot min size 300x300 scaled to screen width; lighter gear icon

- 2026w03-0.10 — Fixed mascot turtle scaling to fill canvas; restored gear icon to solid style

- 2026w03-0.11 — Mascot turtle scaled to fill canvas properly (HEX_SIZE = size/16)

- 2026w03-0.12 — Added Russian localization

- 2026w03-0.13 — Added Russian language selector in settings; added game instructions to Wiki

- 2026w03-0.14 — Platform-specific instructions in Wiki (desktop: arrows+Space, mobile: tap+ACT); full localization

- 2026w05-0.1 — Added LoadingAPI.ready() call on game initialization

- 2026w05-0.2 — Added config for default language by build mode; flag emojis in language selector

- 2026w05-0.3 — Config no longer depends on mode; Yandex integration overrides default language to ru; emoji flags properly displayed

- 2026w05-0.4 — SDK language now drives default locale; Yandex init maps SDK lang to ru/en and shares via global flag

- 2026w05-0.5 — Build-time Yandex integration swap via Vite alias; no Yandex code in non-Yandex builds

- 2026w05-0.6 — Added Yandex metadata files (RU/EN)

- 2026w05-0.7 — Await SDK init before ready/gameplay start

- 2026w05-0.8 — Added background music system with Desert Pixels.mp3; sound toggle integrated

- 2026w05-0.9 — Added metadata to build artifacts; build script copies publishing files to dist

- 2026w05-0.10 — Removed Font Awesome CDN (CORS); separated platform metadata; added @types/ysdk; fixed SDK lifecycle (ready on load, start/stop on gameplay/menu)

- 2026w05-0.11 — Add music volume slider control

- 2026w05-0.12 — Bundle Roboto font and Font Awesome icons locally

- 2026w05-0.13 — Add favicon set

- 2026w05-0.14 — Fix Yandex SDK ready/start/stop calls

- 2026w06-0.1 — Add SDK logging, fix mobile audio autoplay, implement rotating focus cell animation

- 2026w06-0.2 — Fix focus cell animation to use game ticks instead of frame time

- 2026w06-0.3 — Redesign hotbar as ring of 6 hexes in bottom left

- 2026w06-0.4 — Hotbar cells same size and orientation as field; center shows focus cell color

- 2026w06-0.5 — Fix TypeScript errors: grid.get() takes string key, remove unused variables

- 2026w06-0.6 — Add direction arrows in hotbar center: single arrow to empty slot, bidirectional for exchange

- 2026w06-0.7 — Fix hotbar arrow targeting: use all 7 slots (skip center index 3), find nearest empty slot correctly

- 2026w06-0.8 — Refactor hotbar: 6 equal slots + center preview, show star when focus empty, simplified exchange logic

- 2026w06-0.9 — Remove top linear hotbar, add click/tap handlers for ring hotbar slots - exchange/absorb with focus

- 2026w06-0.10 — Hotbar: hide slot numbers, add rotating animation to preview, show cursor in preview instead of focus when cursor exists, hide arrows for cursor

- 2026w06-0.11 — UI overhaul: colors, hotbar repositioning, Settings features

- 2026w06-0.12 — Refined color scheme with darker shades and dynamic backgrounds

- 2026w06-0.13 — Hotbar redesign: ACT in center, uniform hex sizes, simplified layout

- 2026w06-0.14 — Fix inventory colors, split sound/music settings, unify hotbar radius

- 2026w06-0.15 — Audio system: music playlist rotation, sound effects on all interactions, hotbar contextual command labels

- 2026w07-0.1 — Tutorial system with movement level

- 2026w07-0.2 — HexiMap/HexiLab/HexiPedia interface with tutorial on startup

- 2026w07-0.3 — Tutorial UI refinements: simplify styling, overlay widget, skip visited cells

- 2026w07-0.4 — Simplify tutorial UI: compact widget, accordion in HexiPedia, service-bell sound on cell visit

- 2026w07-0.5 — Add interactive task UI: HexiMap link, widget switch, control hints, inventory lock during tutorial

- 2026w07-0.6 — Add hotbar hide, task completion list with checkmarks, remove widget duplication, add link click sound

- 2026w07-0.7 — Refine HexiPedia accordion header, localized labels, and follow-focus hints

- 2026w07-0.8 — Merge tutorial tasks into single accordion and add placeholder levels

- 2026w07-0.9 — Implement true accordion: only one section open at a time, remove gaps between tasks, add spacing to Tasks header

- 2026w07-0.10 — Add session statistics section with time tracking

- 2026w07-0.11 — Fix session time tracking: 12 ticks/sec, pause in settings, display MM:SS (ticks) format

- 2026w07-0.12 — Split session statistics into separate rows: time and ticks

- 2026w07-0.13 — Persist session state across page reloads: save tick count and tutorial progress

- 2026w08-0.1 — Add game designer role instructions

- 2026w08-0.2 — Sync game designer role instructions

- 2026w08-0.3 — Add comprehensive game design concept document

- 2026w08-0.4 — Add game design concept document

- 2026w08-0.5 — Remove deprecated turtle color-shift mechanic

- 2026w09-0.1 — Remove scoring logic and references

- 2026w09-0.2 — Force mobile UI and play win sound on task completion

- 2026w09-0.3 — Center forced mobile layout on wide screens

- 2026w09-0.4 — Constrain forced mobile layout width and gray gutters

- 2026w09-0.5 — Fix JSX structure in HexiPedia: remove extra closing div

- 2026w09-0.6 — Document git commit workflow and critical bug squash process

- 2026w09-0.7 — Build Template System: full documentation, 4 new templates (Hexagon, Star, Rainbow Spiral, Cross), improved HexiPedia UI with template details and hints

- 2026w09-0.8 — Add Build Template System section to GAME_CONCEPT.md with template descriptions and design rationale

- 2026w09-0.9 — Tutorial task selection/restart, completion transition gating, section filter in HexiPedia, and visibility-aware music start

- 2026w09-0.10 — Persist full session state, fix HexiPedia layout/scrolling, align tab backgrounds, and enforce tutorial restrictions on switch

- 2026w09-0.11 — Render hotbar on desktop, fix mobile widget alignment, and show template offsets as text

- 2026w09-0.12 — Add color palette widget and reduce template text size

- 2026w09-0.13 — Fix palette widget layout, shift template anchors, and persist music playback

- 2026w09-0.14 — Fix palette widget to keep color order constant and reduce font size

- 2026w09-0.15 — Fix palette widget: center on player color, show minus signs, fix template validation display

- 2026w09-0.16 — Fix template: anchor 0% cell at focus, use focus color as base in flickering mode

- 2026w09-0.17 — Widget: remove gaps for solid bar, larger font; Template: anchor at bottom to avoid turtle overlap

- 2026w09-0.18 — Fix template flickering: ensure 0% cell always at focus position

- 2026w09-0.19 — Fix all templates: anchor cell (0,0) always has 0%, simplify anchoring logic

- 2026w09-0.20.a — Add test facade and 50 tests covering smoke, movement, inventory, and invariants

- 2026w09-0.20.b — Add HSV palette, turtle outline param, fix minus sign, update template % for 6 colors, start HexiPedia improvements

- 2026w09-0.21 — Replace ColorPaletteHues array with startHue and hueStep parameters

- 2026w09-0.22 — Add info button and bubble styling to TutorialProgressWidget

- 2026w09-0.23 — Add HexiPedia section collapse and reorder controls

- 2026w09-0.24 — Style ColorPaletteWidget with HexiPedia frame styling

- 2026w09-0.25 — Update documentation with UI/UX improvements v0.22-0.24

- 2026w09-0.26 — Fix UI: move control hint to info button, unify section panels, auto-resume music

- 2026w09-0.27 — Fix HexiPedia scrolling, task hint binding, and palette widget alignment

- 2026w09-0.28 — Add AppTestFacade and appLogic tests covering UI interactions

- 2026w09-0.29 — Fix hotbar slot hit-test and auto-resume music after reload

- 2026w09-0.30 — Implement infinite world generation and moving visible window

- 2026w09-0.31 — Fix tutorial cell visit registration logic

- 2026w10-0.1 — Camera follows protagonist with asymmetric offset for better forward view

- 2026w10-0.2 — Fix camera offset direction and add smooth movement (1 cell per tick)

- 2026w10-0.3 — Improve path planning for straighter approach and add camera lag for smoother movement

- 2026w10-0.4 — Fix final approach direction and add camera lag (1 cell per 4 ticks)

- 2026w10-0.5 — Fix auto-move focus target logic, add camera lag param

- 2026w10-0.6 — Independent camera and turtle movement to target

- 2026w10-0.7 — Add session history to HexiPedia stats

- 2026w10-0.8 — Style scrollbars, redesign session history, add colors section

- 2026w10-0.9 — Colors: full spectrum wheel with larger game color markers, list moved below

- 2026w10-0.10 — Fix focus landing on target during auto-move

- 2026w10-0.11 — Add auto-move path visualization and frozen target focus

- 2026w10-0.12 — Update GAME_LOGIC documentation for auto-move and path visualization

- 2026w10-0.13 — Remove rotation and flicker from target focus, align path dots with grid thickness

- 2026w10-0.14 — Thinner focus/path edges, drawn on top of all cells

- 2026w10-0.15 — Unique session IDs, update existing records instead of creating duplicates

- 2026w10-0.16 — Manual color selection, continuous gradient wheel, widget toggle, color % labels

- 2026w10-0.17 — Fix session time tracking - show game duration from guest start

- 2026w10-0.18 — merge main into refactor branch — camera lag, path visualization, session history, color widget

- 2026w10-0.19 — Fix gradient moiré (60 segments), compact percent format, widget toggle button

- 2026w10-0.20 — Hide focus during auto-move, refine palette layout and optics toggle

- 2026w10-0.21 — Restore frozen auto-move target marker, conic wheel gradient, compact colors list

- 2026w10-0.22 — Fix cursor/focus decoupling in auto-move, narrow wheel ring, compact color list

- 2026w10-0.23 — Add reusable agent bootstrap alignment prompt

- 2026w10-0.24 — add auto/manual base color mode for palette widget

- 2026w10-0.25 — Complete architecture migration: move UI to gameLogic/appLogic layers, remove pureLogic.ts

- 2026w10-0.26 — Fix import paths in UI components after migration

- 2026w10-0.27 — Remove dead code: Wiki, ControlsInfoMobile, TutorialOverlay

- 2026w10-0.30 — 2026w10-0.27: Remove dead code: Wiki, ControlsInfoMobile, TutorialOverlay

- 2026w10-0.31 — Refactor GameField and HexiPedia: extract components and utilities into separate files

- 2026w10-0.32 — 2026w10-0.29: Refactor GameField and HexiPedia with extracted components and utilities

- 2026w10-0.33 — Update bump script to auto-commit

- 2026w10-0.34 — Revert HexiPedia refactoring - restore working functionality with all sections

- 2026w10-0.35 — Refactor HexiPedia into modular extensible components - full functionality preserved

- 2026w10-0.36 — Move app shell and session history logic into appLogic

- 2026w10-0.37 — Move user settings state into appLogic reducer

- 2026w10-0.38 — Update architecture review documentation

- 2026w10-0.39 — Migrate useGameSession to appLogic layer

- 2026w10-0.40 — Remove duplicate integration.init() calls

- 2026w10-0.41 — Extract tutorial flow orchestration to appLogic

- 2026w10-0.42 — Split GameField into composable modules

- 2026w10-0.43 — Extract audio to appLogic layer

- 2026w10-0.44 — Remove legacy audioManager and refresh decomposition audit docs

- 2026w10-0.45 — Extract GameField render loop into useCanvasRenderer hook

- 2026w10-0.46 — Extract Game audio lifecycle into useGameAudio hook

- 2026w10-0.47 — Split Game JSX into presentational containers

- 2026w10-0.48 — Fix missing audioController import in HexiPedia

- 2026w10-0.49 — Add loading screen for cold start

- 2026w10-0.50 — Preload critical audio assets before game start

- 2026w10-0.51 — Add turtle startup animation with random music track preload

- 2026w11-0.1 — Fix app shell startup state initialization

- 2026w11-0.2 — Align instructions with bump auto-commit workflow

- 2026w11-0.3 — Fix startup animation phase timer reset

- 2026w11-0.4 — Fix startup turtle assembly and default to HexiMap

- 2026w11-0.5 — Finalize startup animation fix

- 2026w11-0.6 — Fix startup animation layout and expose bump auto-commit errors

- 2026w11-0.7 — Fix startup hex morph stability and force HexiMap on start

- 2026w11-0.8 — Align startup turtle with mascot and initial facing

- 2026w11-0.9 — Align startup turtle with mascot and initial facing

- 2026w11-0.10 — Align startup turtle with mascot and initial facing

- 2026w12-0.1 — unify top widgets layout

- 2026w12-0.2 — tasks widget navigation and panel pinning

- 2026w12-0.3 — widget stack by section order, search dropdown, unified nav icons

- 2026w12-0.4 — translate hardcoded UI strings, fix language support for templates

- 2026w12-0.5 — Scripted tutorial and blocked pathing

- 2026w12-0.6 — unify HexiPedia localization across language modes

- 2026w12-0.7 — add tutorial task intro modal and widget fly-out animation

- 2026w12-0.8 — Add standalone hex grid editor

- 2026w12-0.9 — redesign tutorial intro modal and rewrite all tutorial levels with turtle story

- 2026w12-0.10 — Editor relativeColor palette mode

- 2026w12-0.11 — Simplified editor: unified coordinates input, basePaletteIndex slider, paintColor number field

- 2026w12-0.12 — implement points of interest highlighting system for off-screen targets and structures

- 2026w12-0.13 — Palette UI rework: click colors for paintColor, slider for baseColor; Yin-Yang pattern default; Clear button

- 2026w12-0.14 — clamp highlight dots to canvas bounds

- 2026w12-0.15 — Palette UI refinement: relative% labels, discrete slider alignment

- 2026w12-0.16 — Editor: fix TS test type, zoom on scroll/buttons, full-height grid layout

- 2026w12-0.17 — Editor: LMB pan, large swatches with % inside, radio base picker, copy button

- 2026w12-0.18 — Editor: anchorCell format, anchor placement mode, anchor marker rendering

- 2026w13-0.1 — tutorial widget phase flow and field-boundary highlights

- 2026w13-0.2 — Templates: nest structure object and support staged-only bump workflow

- 2026w13-0.3 — Tutorial flow polish and boundary-safe POI highlights

- 2026w13-0.4 — Clamp world interaction radius to visible viewport minimum

- 2026w13-0.5 — Snap off-screen POI highlights to contour face

- 2026w13-0.6 — Boost hidden target markers and snap to rendered boundary dots

- 2026w13-0.7 — Guarantee boundary-only hidden markers and boost glow

- 2026w13-0.8 — Use projected boundary segments for hidden target markers

- 2026w13-0.9 — Project hidden target contour until boundary corners snap

- 2026w13-0.10 — Pathfind hidden markers from turtle and use last visible cell corners

- 2026w13-0.11 — Use stepwise hex path for last visible boundary marker cell

- 2026w13-0.12 — Fix one-point boundary edge mapping for hidden target markers

- 2026w13-0.13 — Session lifecycle persistence and reload continuity

- 2026w13-0.14 — World density visibility and startup timing

- 2026w13-0.15 — tasks migration and structures UI

- 2026w13-0.16 — tasks migration and structures UI

- 2026w13-0.17 — continuous tasks flow and balance 3+3

- 2026w13-0.18 — touch release movement targeting

- 2026w13-0.19 — Balance task accepts any opposite 3+3 pair

- 2026w13-0.20 — Clip structure template and highlight offscreen filled cells

- 2026w13-0.21 — 25w12-0.51: update all platform docs/metadata for mobile-only, touch-first release

- 2026w13-0.22 — 25w12-0.52: excavation progress now counts only the core cell (task_3_excavate_rings)

- 2026w14-0.1 — Squashed: PWA integration, start screen redesign, and bump workflow updates

- 2026w14-0.2 — Prevent world field overlap with hotbar

- 0.0.3-y26w14b3 — Adopt semantic+technical versioning and unify platform release pipelines

- 0.0.3-y26w14b4 — Keep publicBuild controlled only by platform pipelines

- 0.1.0-y26w14b5 — Prepare platform minor release

- 0.1.0-y26w14b6 — Fix audio mute lifecycle and settings toggle behavior

- 0.1.0-y26w15b1 — Preserve configured volume on track change and across sound effects

- 0.1.0-y26w15b2 — HexiPedia-style start screen, disconnect, and session history

- 0.1.0-y26w15b3 — Unify start/game audio and redesign GuestStart header

- 0.1.0-y26w15b4 — Restyle start screen to match in-game visual language

- 0.1.0-y26w15b5 — Field Lab dev tool: 6D field logic, canvas visualizer, time-perspective rendering

- 0.1.0-y26w15b6 — Session action log, disconnect button, auto-disconnect on tab hide, session history redesign, HexiPedia session panel with playback controls

- 0.1.0-y26w15b7 — Fix tutorial excavation progress expectation to 1-of-1 core cell

- 0.1.0-y26w15b8 — Rename tabs to Map/Lab/Hexipedia, fix guest settings overlay, unify session list, add session codename rename and bulk delete

- 0.1.0-y26w15b9 — Clean up session codenames (colors only, gendered RU flowers), stop/play icon on tab bar, session buttons one-row, gray continue button, inline delete confirmation

- 0.1.0-y26w15b10 — Session naming strict color+flower, HexiOS header play button, play icon for Continue, full-width inline delete confirm

- 0.1.0-y26w15b11 — Remove reset from settings, add Session playback widget, one-line Session playback panel, move download button to panel, add reverse action log

- 0.1.0-y26w17b1 — Start menu sessions compact rows and inline delete confirm

- 0.1.0-y26w17b2 — Start screen retro 8-bit style and non-autostart session add

- 0.1.0-y26w17b3 — Start screen full terminal TUI layout and symbol frames

- 0.1.0-y26w17b4 — Refine TUI session list hierarchy states and status tags

- 0.1.0-y26w17b5 — multi-layer hex grid (5 layers), grid radius 4, layer controls UI

- 0.1.0-y26w17b6 — update GAME_LOGIC.md for multi-layer and grid radius 4

- 0.1.0-y26w17b7 — layer 0 only generates colored hexes; fix background layer centering

- 0.1.0-y26w17b8 — generate layer 0 around protagonist when on other layers; background moves in sync

- 0.1.0-y26w17b9 — TUI rows: remove GL/CUR/NEW and switch to two-line sessions

- 0.1.0-y26w17b10 — TUI border continuity and single-line item separators

- 0.1.0-y26w17b11 — TUI sessions double panel frame and single item separators

- 0.1.0-y26w17b12 — layer coordinate projection on switch and visibility-based layer0 generation

- 0.1.0-y26w17b13 — normalize non-base layer grids and add layer addressing invariants tests

- 0.1.0-y26w17b14 — clip world rendering to field bounds and verify +1 auto-move target coordinates

- 0.1.0-y26w17b15 — fix child layer anchoring and keep perimeter dots unclipped

- 0.1.0-y26w17b16 — camera two-phase follow with post-move focus recenter

- 0.1.0-y26w17b17 — Fix TUI borders nesting and native borders layer

- 0.1.0-y26w17b18 — Add IndexedDB mirrored persistence bootstrap and audio resume hardening

- 0.1.0-y26w17b19 — Fix session restore without guest flag and auto-persist start marker

- 0.1.0-y26w17b20 — Add VS Code task to trigger Vite reload without code changes

- 0.1.0-y26w17b21 — Add debug-panel trigger for Vite reload

- 0.1.0-y26w17b22 — Auto-resume gameplay on reload and defer audio seek until metadata

- 0.1.0-y26w17b23 — TUI borders and active states styling

- 0.1.0-y26w17b24 — TUI separated panels, single separators, gray theme

- 0.1.0-y26w17b25 — TUI fix border gaps, restore button brackets, swap expander

- 0.1.0-y26w17b26 — TUI fix layout tearing and border sizes

- 0.1.0-y26w17b27 — TUI fix layout tearing and border sizes, add snapshot debug

- 0.1.0-y26w17b28 — TUI fix native element stylings and layout bugs

- 0.1.0-y26w17b29 — Fix TUI session borders and controls spacing

- 0.1.0-y26w18b1 — field-lab fractal stack visualization workbench
