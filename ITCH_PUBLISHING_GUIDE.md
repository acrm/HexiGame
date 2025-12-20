# Publishing to itch.io — Quick Guide

This guide walks you through publishing **Hexi** on itch.io.

## Prerequisites

- GitHub account with access to this repository
- itch.io account ([create one here](https://itch.io/register))
- Cover image (630×500px minimum)
- Screenshots (3-5 images, 1280×720 or higher)

## Step 1: Build the Game

### Using GitHub Actions (Recommended)

1. Go to **Actions** tab in GitHub repository
2. Select **Build for itch.io** workflow
3. Click **Run workflow**
4. Optional: Enter version tag (or leave empty to use current version)
5. Wait for workflow to complete (~2-3 minutes)
6. Download the artifact `hexi-itch-io-build` from the workflow run
7. Extract the ZIP file inside (e.g., `hexi-web-2025w51-0.20.zip`)

### Manual Build (Alternative)

```bash
npm ci
npm run build
cd dist
zip -r ../hexi-web-build.zip .
```

## Step 2: Create itch.io Project

1. Go to [itch.io dashboard](https://itch.io/game/new)
2. Fill in basic information:
   - **Title**: Hexi
   - **Project URL**: `https://yourusername.itch.io/hexi`
   - **Classification**: Game
   - **Kind of project**: HTML

## Step 3: Upload Files

1. In **Uploads** section, click **Upload files**
2. Upload your `hexi-web-*.zip` file
3. Configure the upload:
   - ✅ Check **This file will be played in the browser**
   - ❌ Uncheck **Downloadable** (optional — keep browser-only)
   - Set display name: "Web Version"

## Step 4: Configure Embed Settings

Click **Embed options** for the uploaded file:
- **Viewport**: Custom
- **Width**: 1200 pixels
- **Height**: 800 pixels
- **Orientation**: Landscape
- **Frame options**: 
  - ✅ Automatically start on page load
  - ✅ Fullscreen button
  - Mobile friendly: Test (currently keyboard-only)

## Step 5: Add Metadata

### Details Tab
- **Short description**: (see `ITCH_METADATA.md`)
- **Genre**: Puzzle, Strategy
- **Tags**: puzzle, hexagonal, grid-based, minimalist, strategy, color-matching, time-attack, browser, keyboard, singleplayer
- **Release status**: Released
- **Pricing**: Free (or Pay What You Want)

### Metadata Tab
- **Classification**:
  - Kind: Game
  - Release: Released
  - Platforms: HTML5 ✅
  - Multiplayer: Singleplayer only
  - Accessibility: Keyboard, Color-based gameplay
  - Input methods: Keyboard ✅
- **Language**: English ✅
- **Made with**: React, TypeScript, Vite
- **AI Disclosure**: Does not use generative AI ❌
- **Adult content**: No ❌

## Step 6: Add Media

### Cover Image (Required)
- Dimensions: 630×500px minimum
- Shows hexagonal grid with colored tiles
- Can be animated GIF

### Screenshots (Highly Recommended)
Upload 3-5 screenshots:
1. Starting game view
2. Mid-game with colored tiles
3. Scoring moment
4. UI overview
5. Color palette

### Optional
- Gameplay video/GIF (15-30 seconds)
- Banner image for profile

## Step 7: Write Description

Copy content from `ITCH_DESCRIPTION.md` and paste into the description editor. Format with Markdown:

```markdown
# Hexi — Hexagonal Color Puzzle Game

A minimalist puzzle game where you navigate a hexagonal grid...

## Key Features
- Feature 1
- Feature 2

## How to Play
1. Step 1
2. Step 2
```

## Step 8: Configure Community

- ✅ Enable ratings
- ✅ Enable comments
- Optional: Enable discussion board
- Optional: Enable donations

## Step 9: Test Before Publishing

1. **Save as Draft** or **Restricted**
2. Click **View page** to test
3. Try playing the game in the embedded player
4. Check:
   - Game loads correctly
   - Controls work
   - Responsive sizing
   - No console errors
5. Share restricted link with friends for feedback

## Step 10: Publish

1. Once everything looks good, go to **Visibility & access**
2. Change from **Draft** to **Public**
3. Click **Save**
4. Your game is now live! 🎉

## Step 11: Announce

1. Post in [Release Announcements](https://itch.io/board/10022/release-announcements) board
2. Share on social media (optional)
3. Consider posting devlog about development

## Updating Your Game

### Quick Update Process

1. Run GitHub Action workflow again (or rebuild manually)
2. Download new build artifact
3. Go to itch.io project **Edit game** → **Uploads**
4. Upload new ZIP file
5. Either:
   - Delete old upload and mark new as main file
   - Or mark new upload as default and delete old one
6. Update version number in description
7. Optional: Post devlog about changes

### Version Notes

The workflow automatically includes version from `version.json` in the ZIP filename:
- `hexi-web-2025w51-0.20.zip`

Update your itch.io description with current version after each upload.

## Troubleshooting

### Game doesn't load
- Check browser console for errors
- Verify all assets are included in build
- Test locally with `npm run preview`

### Embed sizing issues
- Adjust viewport dimensions in embed settings
- Test on different screen sizes
- Consider adding responsive design

### Controls don't work
- Ensure iframe has focus (click inside game)
- Test in different browsers
- Check itch.io embed captures keyboard events

## Quality Guidelines Compliance

This setup follows [itch.io Quality Guidelines](https://itch.io/docs/creators/quality-guidelines):

✅ Platform correctly set (HTML5 only)  
✅ Relevant tags from suggested list  
✅ Accurate metadata  
✅ Cover image provided  
✅ Screenshots included  
✅ Files uploaded directly to itch.io  
✅ No misleading content  
✅ Language accurately set  
✅ AI disclosure accurate  
✅ No adult content flagging needed  

## Resources

- [itch.io Creator Documentation](https://itch.io/docs/creators/)
- [HTML5 Games Guide](https://itch.io/docs/creators/html5)
- [Quality Guidelines](https://itch.io/docs/creators/quality-guidelines)
- [Getting Indexed](https://itch.io/docs/creators/getting-indexed)

---

**Questions?** Check itch.io's support or community forums.
