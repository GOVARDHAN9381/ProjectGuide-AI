# NDVI Implementation Guide (Python)

This guide shows how to compute NDVI from multispectral imagery (NIR + Red bands) using Python and common libraries, plus how to incorporate NDVI-derived facts into the RAG knowledge base.

## NDVI formula

NDVI = (NIR - Red) / (NIR + Red)

Values range from -1 to +1. Higher values indicate denser green vegetation.

## Requirements

- rasterio
- numpy
- matplotlib (optional, for plotting)

Install:

```bash
pip install rasterio numpy matplotlib
```

## Simple NDVI script (rasterio)

```python
import rasterio
import numpy as np
import matplotlib.pyplot as plt

# Paths to input bands (single-band GeoTIFFs) -- replace with your files
red_path = 'data/red.tif'
nir_path = 'data/nir.tif'

with rasterio.open(red_path) as r:
    red = r.read(1).astype('float32')
    profile = r.profile

with rasterio.open(nir_path) as r:
    nir = r.read(1).astype('float32')

# Avoid division by zero
ndvi = np.where((nir + red) == 0, 0.0, (nir - red) / (nir + red))

# Save as GeoTIFF
profile.update(dtype=rasterio.float32, count=1)
with rasterio.open('output/ndvi.tif', 'w', **profile) as dst:
    dst.write(ndvi.astype(rasterio.float32), 1)

# Quick visualization
plt.imshow(ndvi, cmap='RdYlGn')
plt.colorbar(label='NDVI')
plt.title('NDVI')
plt.show()
```

## NDVI thresholds and advice

- NDVI < 0.2 : Bare soil or poor vegetation
- NDVI 0.2 - 0.4 : Early growth / sparse vegetation
- NDVI 0.4 - 0.6 : Healthy vegetation
- NDVI > 0.6 : Dense, vigorous vegetation

Use percent anomaly against a baseline: (current - baseline_mean) / baseline_mean to detect stress.

## Adding NDVI facts to the RAG knowledge base

1. Create short markdown snippets with calculation explanation and example thresholds (e.g., knowledge/ndvi_calculation.md — already present).
2. For field-level advisories, store: `field_id`, `date`, `ndvi_value`, and a short human-friendly sentence like:
   "NDVI for FIELD-001 on 2026-08-01: 0.38 (down 12% vs baseline) — possible water stress; recommend soil moisture check and localized irrigation."
3. Use `scripts/prepare_market_prices.py` (see repo scripts) or a similar helper to write timestamped markdown files under `knowledge/market_snapshots/` which will be indexed by the vector ingest pipeline.

## Example: compute NDVI anomaly and produce a knowledge sentence

```python
# compute anomaly
baseline_mean = 0.45
current = np.nanmean(ndvi)
anomaly = (current - baseline_mean) / baseline_mean

if anomaly < -0.1:
    advice = 'Significant NDVI drop (>10%) — inspect for water stress or pest/disease.'
else:
    advice = 'NDVI within expected range.'

sentence = f"NDVI snapshot: mean={current:.2f}, anomaly={anomaly:.2%}. {advice}"
print(sentence)
```

Place any such sentences into `knowledge/` as small markdown files to be picked up on the next ingestion run.
