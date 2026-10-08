# Original Sugar art, version 2

Built-in image generation. Original refined celadon/berry/cream bakery and matching volumetric confectionery icons. No commercial provider art was copied. Exact generation and spacing-repair prompts are saved in generation-prompts.json.

- Runtime world: public/art-v2/sugar/bakery-world.webp, 1774 × 887 RGB. Large calm worktop and soft cabinetry on left, detailed patisserie display on right.
- Runtime atlas: public/art-v2/sugar/symbols-atlas.webp, 1448 × 1086 RGBA. Twelve separate symbols, four columns by three rows. Transparent spacing was repaired through image generation to avoid neighboring crops bleeding.
- Use atlas-metadata.json recommendedPaddedBboxAbsolute: exclusive right/bottom alpha >8 bounds plus 8px. Render these crops centered at 80–85% cell occupancy. Do not assume perfect grid centering.
- Both runtime images use lossless WebP encoding without resizing or visual edits. World decoded pixels, atlas alpha, and all visible atlas RGB are verified byte-identical to originals. Transparent RGB can be optimized by the encoder.
- The star cookie is a spare blank multiplier symbol; numeric value should be native text. Jar is spare decoration. Originals and drafts remain outside public at /workspace/shared/desire-spin-art-drafts/sugar.
