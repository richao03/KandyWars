# Unified emoji set

Scope: the 28 blue-highlighted files in the first supplied Finder screenshot. Original assets are unchanged. Filenames, including `msuic.png`, are preserved for easy replacement after visual review.

## Art direction

The eight highlighted references are `ice`, `mediumRare`, `crown`, `deli`, `sleep`, `magic`, `homemade`, and `artifact`. They differ in effective pixel density. The new set uses a 64×64 native canvas as a compromise between the chunky Magic/Sleep style and the finer Crown/Ice detail. The maximum subject extent is 56 pixels, centered with at least four pixels of padding.

Generation uses the fixed Magic, Homemade, Crown, and Artifact references plus the original target (the tool accepts five inputs). All eight anchors appear on the comparison sheet. Colors use teal outlines, aqua/mint forms, coral accents, and cream/gold highlights. Essential subject components are retained.

## Files

- `raw/`: built-in image_gen redraws before cleanup.
- `native-64/`: 64×64 RGBA working sprites.
- `png-256/`: exact 4× nearest-neighbor exports for the game.
- `review.html`: interactive original/revised comparison with size and background controls.
- `prompts.json`: per-target generation prompts.
- `comparison.png`: anchors followed by new sprites.
- `originals.png`: the selected original sprites.
- `palette.json`: one shared 32-color palette.
- `manifest.json`: target list, fixed references, and generation prompt.
- `validation.json`: per-image dimensions, used colors, bounds, and alpha validation.
- `cleanup.py`: repeatable deterministic cleanup with Pillow.

## Cleanup

Run `python cleanup.py` with Pillow installed. The script thresholds alpha at 128, crops transparent padding, fits the subject into 56×56 using nearest-neighbor sampling, maps colors to the fixed palette without dithering, centers the result in 64×64, and exports at 256×256 with nearest-neighbor scaling. Assertions verify binary alpha, palette limits, and exact 4× scaling. The newspaper heading is rebuilt as explicit bitmap lettering for legibility. It rejects opaque outputs rather than treating white as transparent and damaging highlights.

This guarantees a common output grid and palette, not identical hand-drawn cluster construction. Fine letterforms and multi-object silhouettes still require visual review. The anchors themselves are preserved, not quantized or resized in the game.
