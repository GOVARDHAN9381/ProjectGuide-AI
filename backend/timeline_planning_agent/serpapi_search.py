import os
import serpapi
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("SERPAPI_API_KEY")

client = serpapi.Client(api_key=api_key)


def search_resources(query):
    results = client.search({
        "engine": "google",
        "q": query,
    })

    resources = []

    for result in results.get("organic_results", [])[:5]:
        resources.append({
            "title": result.get("title"),
            "link": result.get("link"),
            "snippet": result.get("snippet", "")
        })

    return resources