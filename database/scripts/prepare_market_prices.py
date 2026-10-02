import csv
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = ROOT / 'knowledge' / 'market_snapshots'
DATA_CSV = ROOT / 'data' / 'sample_market_prices.csv'

KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)

with open(DATA_CSV, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    # group by (mandi, commodity) and take latest snapshot
    latest = {}
    for row in reader:
        key = (row['mandi'], row['commodity'])
        row_date = datetime.strptime(row['date'], '%Y-%m-%d')
        if key not in latest or row_date > latest[key]['date']:
            latest[key] = {'date': row_date, 'row': row}

    for (mandi, commodity), info in latest.items():
        r = info['row']
        filename = f"market_{mandi.lower()}_{commodity.lower()}_{r['date']}.md".replace(' ', '_')
        path = KNOWLEDGE_DIR / filename
        text = f"# Market snapshot: {commodity} — {mandi} ({r['date']})\n\n"
        text += f"- Modal price per 100kg: INR {r['modal_price_per_100kg']}\n"
        text += f"- Arrival quantity: {r['arrival_qty_kg']} kg\n\n"
        # Add a short trend sentence (placeholder)
        text += f"Summary: Latest modal price for {commodity} in {mandi} is INR {r['modal_price_per_100kg']} per 100kg as of {r['date']}.\n"
        path.write_text(text, encoding='utf-8')
        print('Wrote', path)

print('Market snapshots ready in', KNOWLEDGE_DIR)
