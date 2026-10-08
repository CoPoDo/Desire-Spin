# Original Juan art, version 2

Built-in image generation. Original lantern-lit fiesta courtyard with a charismatic bandleader on the far right, full sombrero visible. Original character was used as style reference for the atlas, never copied provider art. Exact prompts in generation-prompts.json.

- public/art-v2/juan/fiesta-world.webp, 1774 × 887 RGB.
- public/art-v2/juan/symbols-atlas.webp, 1448 × 1086 RGBA. Twelve symbols matching source engine ids: juan, senorita, chihuahua, vihuela, hot_sauce, A, K, Q, J, 10, chili, pinata.
- Royals include intentionally painted A/K/Q/J/10 glyphs; no other words baked in. Wild and scatter labels should use native overlays as needed.
- Use atlas-metadata.json recommendedPaddedBboxAbsolute, exclusive right/bottom alpha >8 plus 8px. Atlas row placement drifts, so measured regions preserve full hats and character shoulders. Do not use naive equal-cell crop.
- Runtime files are lossless WebP with verified identical world decoded pixels, atlas alpha and visible RGB. No manual repainting or resizing. Originals/drafts are outside public at /workspace/shared/desire-spin-art-drafts/juan.
