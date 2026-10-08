# Classic three-reel artwork

- Final asset: `public/art-v2/classic/symbols-atlas.webp`
- Original generation: built-in image generation, transparent background enabled.
- Atlas: 1536 × 1024 pixels, RGBA, five original painted symbols in a 3 × 2 layout.
- Conversion: lossless WebP with exact transparent RGB preservation. Decoded RGBA bytes were verified identical to the generated PNG.
- Runtime source-pixel rectangles: `CLASSIC_SYMBOL_ART` in `Art.tsx`.
- Runtime symbols: cherries, lemon, grapes, red seven, cyan diamond. Engine weights and multipliers are unchanged.
- The cabinet, bezel, glass, controls, and lobby thumbnail framing are responsive CSS materials. No additional world illustration is used.

## Generation prompt

Use case: stylized-concept. Asset type: production game symbol atlas for an original premium classic three-reel slot machine. Create ONE coherent sprite sheet on a genuinely transparent background with exactly five separate polished hand-painted 3D-like vintage slot symbols. Arrange in a precise 3-column by 2-row grid of equal cells, 1536 by 1024 canvas if possible: top-left a pair of lush glossy red cherries with their shared curved green stems and small green leaf; top-middle one unmistakable juicy yellow lemon with a little green leaf; top-right a full bunch of rich purple grapes with a green vine leaf; bottom-left a large sculpted RED number 7 with antique-gold beveled metal rim, ruby enamel body; bottom-middle a brilliant cyan-blue cut diamond gemstone, point downward; bottom-right COMPLETELY EMPTY transparent. Each object centered within its cell, similar readable scale, keep all object extents within central 76% of its cell with at least 12% transparent gutter on every side. High-end illustrated casino symbol craft: rich tactile painterly shading, precise bright edges, subtle physically plausible reflections, gentle rim highlights, dark thin warm contour, strongest lighting from upper left, no cast shadow beyond object. Cherries and grapes botanically distinct, lemon must be yellow fruit not a gem, seven is only character. Orthographic front view, isolated objects. No labels, no text except the number 7, no logos, no watermark, no background, no checkerboard, no frames or gridlines, no glow clouds. Alpha transparent gutters suitable for CSS atlas crops.
