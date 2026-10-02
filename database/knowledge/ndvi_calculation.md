# NDVI Calculation & Interpretation

## What is NDVI
- NDVI (Normalized Difference Vegetation Index) = (NIR - Red) / (NIR + Red)
- Range: -1.0 to +1.0. Higher values indicate healthier, denser green vegetation.

## How to compute from imagery
- For multispectral satellite or drone imagery, use near-infrared (NIR) and red bands.
- For sensors that provide reflectance: NDVI = (reflectance_NIR - reflectance_Red) / (reflectance_NIR + reflectance_Red)
- For RGB cameras, NDVI cannot be computed directly; use vegetation indices approximations (e.g., GNDVI if green channel substitute) or use multispectral sensors.

## Common thresholds (approximate, crop & sensor dependent)
- NDVI < 0.2 : Bare soil or non-vegetated
- NDVI 0.2 - 0.4 : Sparse vegetation, early growth
- NDVI 0.4 - 0.6 : Moderately healthy vegetation
- NDVI > 0.6 : Dense, highly vigorous vegetation

## Using NDVI in advisories
- Compare current NDVI to historical baseline for the same field/date to detect declines (stress). Use percent anomaly: (current - baseline_mean) / baseline_mean.
- Use NDVI time-series for phenology: identify sowing, vegetative peak, and senescence.

## Query examples for RAG
- "How do I compute NDVI from drone imagery?"
- "What NDVI threshold indicates water stress in rice?"
- "How to interpret an NDVI drop of 0.15 compared to last month?"

## Implementation notes
- Store short NDVI explanations and sample formulas in the knowledge base.
- When returning retrieved chunks, include a calculation snippet and recommended next actions (soil moisture check, irrigation, pest scouting).

