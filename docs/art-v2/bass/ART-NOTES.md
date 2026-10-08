# Original Bass art, version 2

Built-in image generation. Original northern freshwater lake and cedar dock at golden dawn, charismatic bearded angler at far right. Matching original angler portrait and premium dimensional fishing symbols, no copied provider artwork. Exact prompts in generation-prompts.json.

- public/art-v2/bass/lake-world.webp, 1774 × 887 RGB.
- public/art-v2/bass/symbols-atlas.webp, 1448 × 1086 RGBA.
- All source engine ids supported: bigbass, smallfish, tackle, truck, anchor, ace, king, queen, jack, scatter, fisherman; spare coin with blank native-value-ready center.
- Royals intentionally include painted A/K/Q/J glyphs. Fish money values, scatter/wild labels and collector multipliers should be native overlays as appropriate.
- Use atlas-metadata.json recommendedPaddedBboxAbsolute, exclusive right/bottom alpha >8 plus 8px. Symbols isolated after spacing-only generation edit, target 80–85% visible cell occupancy. Avoid naive grid cropping because alignment can drift.
- Lossless WebP encoding preserves world decoded pixels, atlas alpha and visible atlas RGB byte-for-byte. Originals/drafts outside public at /workspace/shared/desire-spin-art-drafts/bass.
