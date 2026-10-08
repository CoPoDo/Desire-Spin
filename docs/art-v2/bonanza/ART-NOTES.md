# Original Bonanza art, version 2

Built-in image generation, original lush fruit orchard and candyland artwork distinct from Sugar's bakery interior. Matching volumetric fruit/candy icons; no provider art copied. Exact prompts in generation-prompts.json.

- public/art-v2/bonanza/orchard-world.webp: 1774 × 887 RGB, broad orchard landscape, fruit/candy grove on right.
- public/art-v2/bonanza/symbols-atlas.webp: 1448 × 1086 RGBA, twelve separate symbols after a spacing-only generation edit.
- docs/art-v2/bonanza/atlas-metadata.json contains alpha >8 plus 8px exact rectangles, exclusive right/bottom. Use these with the shared crop renderer, center icons at 80–85% visible cell occupancy, no naive grid crop.
- Multiplier bomb has an intentional blank ivory face for native numeric text. Its small fuse sparkle is included in measured bounds; its source region begins above the nominal third-row boundary to preserve the soft glow safely.
- Lossless WebP encoding verified for identical world decoded pixels, atlas alpha, and visible atlas RGB. No manual painting or resizing. Source originals live outside runtime at /workspace/shared/desire-spin-art-drafts/bonanza.
