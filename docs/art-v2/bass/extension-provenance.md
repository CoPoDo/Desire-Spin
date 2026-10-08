# Original fishing symbol extension

Generated with the built-in image-generation tool on 2026-10-08. The existing original Bass atlas was a style reference; no provider artwork was used. Runtime file: `public/art-v2/bass/extension-atlas.webp`.

## Prompt

Create a new four-symbol production atlas matching the reference's hand-painted 2.5D fishing art, warm sunlight, gilded edges, turquoise enamel and crisp readable silhouettes. Genuine transparency, four separate objects in a horizontal row with generous empty gaps: turquoise-and-gold embossed **10**, a blue-green dragonfly with amber wings, an open olive-green brass-trimmed tackle box, and a classic red/white fishing float. No scenery, grid, card backgrounds, words except 10, logos, watermark or outer glow. Each object must stay within its own allocation and remain readable at 50px.

## Technical verification

Converted losslessly to WebP. The alpha and every visible RGB byte match the original PNG. Exact padded alpha bounds are in `extension-metadata.json`; no object touches its source-region boundary. Original PNG remains outside the served project. This extension replaces unrelated pickup/anchor/fish identities in the live paytable while retaining legacy rendering aliases.
