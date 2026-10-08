# Original Olympus art, version 2

Generated with the built-in image generation tool. Original art; no copied provider artwork. Exact prompts are in generation-prompts.json.

- Runtime world: public/art-v2/olympus/temple-world.webp, 1774 × 887 RGB. Full visible god head on the far right; quiet stormy temple and cloud world on central-left. No baked arch, board, labels, or UI.
- Runtime atlas: public/art-v2/olympus/symbols-atlas.webp, 1448 × 1086 RGBA. Twelve separate symbols, correct reading order.
- Both are lossless WebP encodings. World decoded pixels are byte-identical to PNG. Atlas alpha and every visible RGB pixel are byte-identical to PNG. Only RGB under fully transparent pixels may be optimized.
- The atlas has genuine transparency. Alpha-visible bounds are measured at thresholds 1, 2, 4, 8, 16, 32, and 64. Use recommendedPaddedBboxAbsolute from atlas-metadata.json, which includes alpha >8 plus 8 pixels and uses exclusive right/bottom coordinates.
- The image generator varied column widths slightly and scaled the crown wider than the nominal first cell. All symbols remain isolated; sourceRegion rectangles separate them safely. Do not crop using a naive 4 × 3 grid. Use the measured rectangles with the shared raster renderer and target 80–85% visible cell occupancy.
- Add any scatter labels and multiplier value as native text. The multiplier orb is intentionally blank.
- Originals remain outside runtime under /workspace/shared/desire-spin-art-drafts/olympus and the built-in generated_images directory.
