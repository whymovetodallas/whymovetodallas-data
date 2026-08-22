# Colleyville blog images — extracted from the video overlays 2026-08-22

Ten stills pulled from the rendered Remotion overlays in
`youtube/scripts/moving-to-colleyville-texas/clips/`. Each is the **final frame** of its
clip, so every stepped reveal has fired and nothing is caught mid-animation.

All are 3840x2160 PNG. Run the image pipeline to produce the 1920 hero and 1200 blog WebP
versions:

```bash
python3 process-images.py
```

## What each one is, and where it earns its place in the post

| File | Shows | Use it for |
|---|---|---|
| `colleyville-school-district-boundaries-map.png` | City outline with all five district territories filled and a full legend. OSM base, NCES EDGE + TIGERweb attribution baked in. | **The spine of the post.** Place it in the district section, right after the claim that one street can split. This is the image the whole piece is built around. |
| `colleyville-neighborhoods-map.png` | Whittier Heights, Montclair Parc and Remington Park drawn from Tarrant Appraisal District plats, plus Glade Rd and Hall-Johnson Rd | The named-pockets section. Pairs with the Remington Park split finding. |
| `grapevine-colleyville-isd-ratings.png` | Niche overall A+, academics A+, #2 of 19 in Tarrant County, top 1% in Texas, plus the iUniversity Prep card | The schools section |
| `colleyville-property-tax-breakdown.png` | How the combined bill stacks, and the consequence on a million dollar home | The tax section |
| `colleyville-home-price-tiers.png` | Typical, move-up and luxury bands with price per square foot | The cost section |
| `how-to-verify-school-district-by-address.png` | The three step address check, ending on "two homes on the same road can land in entirely different schools" | The actionable section. Strong Pinterest candidate. |
| `how-to-search-colleyville-homes.png` | Five rule search checklist | The practical section. Also a good Pinterest pin. |
| `colleyville-texas-by-the-numbers.png` | Population, median household income, owner occupied, median age, all ACS 2023 | Early context section |
| `colleyville-new-construction-vs-built-out.png` | Custom build or teardown versus a brand new tract suburb | The new construction section |
| `is-colleyville-right-for-your-family.png` | Who it fits and who should look elsewhere first | The verdict, near the CTA |

## Rules that carry over from the video

- **Every figure on these images is already sourced and gate-checked.** They passed the
  spoken gate, the figures registry, and the render contract. Do not retype a number from
  an image into prose without wrapping it in a `kc-blog-live` span where the field exists in
  `suburb-profiles.json`.
- **The district map deliberately shows no count.** The filmed audio says four; verified is
  five. The blog prose SHOULD say five and name all five, since a post can be corrected and
  a video cannot. The map is consistent with both because it states no number.
- The maps carry OpenStreetMap attribution in-image. Do not crop it off.
- No em or en dashes in any alt text or caption.
- Alt text should describe what a reader would learn, not just what is pictured.
