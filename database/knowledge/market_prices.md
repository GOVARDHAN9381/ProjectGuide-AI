# Market Prices & Mandi Data

This document explains how to access, interpret, and use market price data (Mandis) for crop advisory and recommendation.

## Sources
- Government APIs (data.gov.in / Agmarknet) provide daily market rates for commodity markets across India.
- Local mandi boards publish spot prices and arrival quantities.

## Key concepts
- Arrival Quantity: Amount of a commodity arriving at the market on a day; high arrivals can depress prices.
- Modal Price: The most common price quoted for a commodity; used as the representative market price.
- Price Trend: Compare modal price across days/weeks to detect rising/falling markets.

## Using market prices in RAG
- Store market price time-series metadata in the vector index as short summaries (e.g., "Rice modal price in Mandi X rose from 1500 to 1650 INR/100kg in last 7 days").
- When user asks about market price advice, retrieve the most recent price summaries for the crop and nearby mandi and include trend statements.

## Query examples
- "What's the current modal price of rice in Kurnool mandi?"
- "Has rice price been rising this week?"
- "Should I store my harvest or sell today based on price trends?"

## Integration tips
- Enrich knowledge entries with geographic tags (state, district, mandi) to allow location-aware retrievals.
- Include timestamped snapshots so retrievals can return latest price context.

