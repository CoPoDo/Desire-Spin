# Original Pharaoh art, version 2

Built-in image generation. Original shadowed lapis-and-gold ancient treasure chamber, monumental golden pharaoh guardian at far right, entire headdress visible. Matching sculptural painted treasure icons, no copied commercial provider art. Exact prompts in generation-prompts.json.

- public/art-v2/pharaoh/temple-world.webp, 1774 × 887 RGB.
- public/art-v2/pharaoh/symbols-atlas.webp, 1448 × 1086 RGBA.
- Symbols match source ids pharaoh/eye/ankh/jackal/falcon/lotus/gem-blue/gem-red/gem-green/scarab plus spare wild sun-disk and blank-center coin.
- Use atlas-metadata.json recommendedPaddedBboxAbsolute, exclusive right/bottom measured at alpha >8 plus 8px. Exact rows drift, so source regions intentionally account for full headdresses and ears. Render centered at 80–85% cell occupancy, no naive grid crops.
- Lossless WebP encoding verified: identical world decoded pixels, atlas alpha and visible atlas RGB. Source originals outside public at /workspace/shared/desire-spin-art-drafts/pharaoh.
