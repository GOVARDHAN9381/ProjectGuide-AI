"""NDVI example that synthesizes small arrays and writes a knowledge markdown file."""
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'knowledge' / 'ndvi_snapshots'
OUT.mkdir(parents=True, exist_ok=True)

# synthesize a small NDVI array
ndvi = np.array([[0.55, 0.52, 0.50], [0.48, 0.45, 0.42], [0.40, 0.37, 0.35]])
mean = float(np.nanmean(ndvi))
baseline = 0.50
anomaly = (mean - baseline) / baseline

text = f"# NDVI Snapshot: FIELD-001\n\nMean NDVI: {mean:.2f}\nBaseline mean: {baseline:.2f}\nAnomaly: {anomaly:.2%}\n\n"
if anomaly < -0.1:
    text += "Assessment: Significant NDVI drop (>10%). Recommend soil moisture check and targeted irrigation."
else:
    text += "Assessment: NDVI within expected range."

path = OUT / f'ndvi_field_001_{int(mean*100)}.md'
path.write_text(text, encoding='utf-8')
print('Wrote', path)
