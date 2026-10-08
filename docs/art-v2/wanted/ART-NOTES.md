# Original Wanted art, version 2

Generated using the built-in image generation tool. No provider game artwork was copied. Exact generation and revision prompts are recorded in generation-prompts.json.

## Final assets

- frontier-world.png: 1774 × 887, RGB, wide saloon background with original outlaw at far right. The source is 2:1 rather than the requested 16:9. Crop with cover as needed; desktop should retain right-side outlaw, mobile may focus on warm timber scenery.
- symbols-atlas.png: 1448 × 1086, RGBA, exactly 4 columns × 3 rows; square grid cells are 362 × 362. Twelve correct symbols, no text, all fully contained in their respective cells.

## Rendering the symbols

Use atlas-metadata.json in this provenance directory. Each symbol has its exact alpha-visible bounds, a centered square source viewport at 80% object occupancy, and ready-to-use CSS background-size and background-position values. Put these backgrounds on square elements.

The image generator did not center the top and bottom rows perfectly within their grid cells. Therefore a naive background-size:400% 300% implementation would leave symbols vertically displaced and too small. The provided CSS corrects this without altering the original raster artwork.

The atlas contains real transparency: 81.23% of pixels have alpha zero. Main symbol surfaces are almost opaque, generally alpha 252–254. A few colored edge specks have alpha 1/255 and are visually negligible when properly composited in a browser; some raw image viewers display these too strongly.

Reading order: outlaw, badge, revolver, whiskey; horseshoe, boot, hat, ace; coin, poster, versus, wild. Add VS/WILD/WANTED as native text overlays where required.

## Provisional artifacts

Provisional artifacts are outside the runtime public directory, in /workspace/shared/desire-spin-art-drafts/wanted.

- saloon-backdrop.png is an identical earlier-named copy of frontier-world.png.
- symbol-atlas.png is the initial oversized atlas. It is retained only as a higher-resolution-per-symbol source; it is not safe for naive equal-cell cropping. Use symbols-atlas.png for the actual preview.

## Soft-edge validation and WebP delivery

The metadata also includes visible bounds at alpha thresholds 1, 2, 4, 8, 16, 32 and 64. Cropping to the alpha >8 bounds plus 8 pixels on each side includes all meaningful soft edges. At alpha >1, the maximum extra fringe beyond alpha >64 is 9 pixels on the whiskey bottle; alpha >8 plus 8 pixels safely contains this too. Isolated alpha 1/255 speckles can extend farther and are visually negligible.

Verified lossless WebP copies are in /workspace/shared/desire-spin-art-drafts/wanted for the parent to adopt during build integration:

- frontier-world.webp: 1,691,552 bytes versus PNG 2,259,196 bytes. Decoded RGBA is byte-for-byte identical.
- symbols-atlas.webp: 617,032 bytes versus PNG 862,914 bytes. Alpha is byte-for-byte identical. All visible RGB pixels are identical. Only RGB values of fully transparent pixels differ, which cannot affect rendering.

These WebP files were created by lossless format encoding with Sharp, without resizing, repainting, compositing, or creative image edits. The runtime directory currently retains exactly the two final PNG files, as requested.
