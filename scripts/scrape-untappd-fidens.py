"""
Scrape Lolev + Fidens beers + hops from Untappd.

Strategy:
- Use nodriver to open Chrome with saved session (Cloudflare bypass)
- Hit Untappd's internal JSON API endpoints directly (same session cookies)
- No page scrolling needed — just paginated API calls
- Much faster and more reliable than DOM scraping

Usage:
  python3 scripts/scrape-untappd-fidens.py
"""

import asyncio
import json
import re
from pathlib import Path

import nodriver as uc

PROFILE_DIR = Path.home() / ".untappd-scraper-profile"
SIGNAL_FILE = Path("/tmp/untappd-ready")
SCRIPT_DIR = Path(__file__).parent

# Untappd brewery IDs
BREWERIES = [
    {"name": "Lolev",   "slug": "Lolev",          "output": SCRIPT_DIR / "lolev-hops-untappd.json"},
    {"name": "Fidens",  "slug": "FidensBrewingCo", "output": SCRIPT_DIR / "fidens-hops-untappd.json"},
]

HOP_KEYWORDS = [
    "Citra", "Galaxy", "Mosaic", "Simcoe", "Nelson Sauvin", "Riwaka",
    "Motueka", "Moutere", "Centennial", "Chinook", "El Dorado", "Ekuanot",
    "Strata", "Cryo", "Incognito", "Vic Secret", "Eclipse", "Nectaron",
    "Rakau", "Wakatu", "Southern Cross", "Idaho 7", "Amarillo", "Waimea",
    "Cascade", "Columbus", "Pacific Jade", "HBC", "Lupulin", "Incognito",
    "Pacific Sunrise", "Dolcita", "HopKief", "Hop Kief", "Kohia",
    "Green Bullet", "Comet", "Loral", "Sabro", "Hallertau", "Saaz",
    "Nelson Bliss", "Peacharine", "Krush", "The Bruce", "Freestyle",
    "Eggers", "Crosby",
]


def find_hops_in_text(text: str) -> list:
    if not text:
        return []
    found = []
    text_lower = text.lower()
    for h in HOP_KEYWORDS:
        if h.lower() in text_lower:
            found.append(h)
    return found


async def fetch_json(tab, url: str) -> dict:
    """Fetch a URL as JSON using the browser's fetch API (carries session cookies)."""
    js = f"""
    (async () => {{
        try {{
            const r = await fetch("{url}", {{
                headers: {{
                    "Accept": "application/json, text/javascript, */*",
                    "X-Requested-With": "XMLHttpRequest"
                }}
            }});
            return await r.text();
        }} catch(e) {{
            return JSON.stringify({{error: e.toString()}});
        }}
    }})()
    """
    try:
        result = await asyncio.wait_for(tab.evaluate(js), timeout=15)
        if result:
            return json.loads(result)
    except Exception as e:
        print(f"    fetch error: {e}")
    return {}


async def get_brewery_beers_api(tab, slug: str) -> list:
    """Get all beers for a brewery via Untappd's internal API."""
    beers = []
    offset = 0
    limit = 50

    while True:
        url = f"https://untappd.com/brewery/{slug}/beers?offset={offset}&limit={limit}"
        print(f"  API page offset={offset}...")

        data = await fetch_json(tab, url)

        # Untappd API returns HTML or JSON depending on request headers
        # Try the JSON API endpoint format
        if not data or "error" in data:
            # Try alternative endpoint format
            url2 = f"https://untappd.com/brewery/beer_list/{slug}?offset={offset}"
            data = await fetch_json(tab, url2)

        if not data:
            break

        # Extract beers from response
        items = (
            data.get("response", {}).get("beers", {}).get("items", [])
            or data.get("beers", {}).get("items", [])
            or []
        )

        if not items:
            print(f"  No more items at offset {offset}")
            break

        for item in items:
            beer = item.get("beer", item)
            beers.append({
                "bid": beer.get("bid"),
                "name": beer.get("beer_name", ""),
                "slug": beer.get("beer_slug", ""),
                "description": beer.get("beer_description", ""),
                "style": beer.get("beer_style", ""),
                "abv": beer.get("beer_abv", ""),
            })

        print(f"  Got {len(items)} beers (total so far: {len(beers)})")

        if len(items) < limit:
            break
        offset += limit
        await asyncio.sleep(0.5)

    return beers


async def get_beer_detail_api(tab, bid: int) -> dict:
    """Get detailed beer info including description via API."""
    url = f"https://untappd.com/beer/{bid}"
    data = await fetch_json(tab, url)
    return data.get("response", {}).get("beer", {})


async def scrape_brewery_page(tab, brewery: dict) -> list:
    """Navigate to brewery page and scrape beer list via DOM (fallback)."""
    url = f"https://untappd.com/{brewery['slug']}/beer"
    print(f"  Navigating to {url}...")

    try:
        await asyncio.wait_for(tab.get(url), timeout=20)
    except Exception as e:
        print(f"  Page load timeout: {e}")
        return []

    await asyncio.sleep(3)

    # Get the beer list from the rendered page HTML
    try:
        html = await asyncio.wait_for(
            tab.evaluate("document.body.innerHTML"),
            timeout=10
        )
    except Exception as e:
        print(f"  HTML extraction failed: {e}")
        return []

    # Find beer links
    links = re.findall(r'href="(/b/[a-z0-9\-]+/(\d+))"', html)
    links = list(dict.fromkeys(links))
    print(f"  Found {len(links)} beers in page HTML")

    beers = []
    for path, bid in links[:120]:
        slug = path.split('/')[2]
        # Try to get description from the beer's individual page
        beer_url = f"https://untappd.com{path}"
        try:
            await asyncio.wait_for(tab.get(beer_url), timeout=15)
        except Exception:
            continue
        await asyncio.sleep(1)

        desc = ""
        body = ""
        try:
            body = await asyncio.wait_for(
                tab.evaluate(
                    "(()=>{ const d=document.querySelector('.beer-descriptions,#beer-description,.description'); "
                    "return d ? d.innerText : document.body.innerText.slice(0,2000); })()"
                ),
                timeout=8
            )
            desc = body or ""
        except Exception:
            pass

        hops = find_hops_in_text(desc)
        beers.append({
            "brewery": brewery["name"],
            "name": slug.replace('-', ' ').title(),
            "url": beer_url,
            "hops": hops,
            "description": desc[:300],
        })
        print(f"    {slug}: {', '.join(hops) if hops else '(none)'}")
        await asyncio.sleep(0.5)

    return beers


async def main():
    PROFILE_DIR.mkdir(exist_ok=True)
    SIGNAL_FILE.unlink(missing_ok=True)

    print("Starting nodriver (undetected Chrome)...")
    browser = await uc.start(
        headless=False,
        user_data_dir=str(PROFILE_DIR),
        browser_executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        no_sandbox=True,
    )

    tab = await browser.get("https://untappd.com")
    await asyncio.sleep(2)

    try:
        page_text = await asyncio.wait_for(
            tab.evaluate("document.body.innerText"),
            timeout=8
        )
        is_logged_in = "Log In" not in page_text[:500]
    except Exception:
        is_logged_in = False

    if not is_logged_in:
        await tab.get("https://untappd.com/login")
        print("\n=== Log in to Untappd in the browser ===")
        print(f"When logged in, run:  touch {SIGNAL_FILE}\n")
        while not SIGNAL_FILE.exists():
            await asyncio.sleep(1)
        print("Signal received.\n")
    else:
        print("Already logged in.\n")

    all_results = []
    for brewery in BREWERIES:
        print(f"\n{'='*50}\nBREWERY: {brewery['name']}\n{'='*50}")
        results = await scrape_brewery_page(tab, brewery)

        with open(brewery["output"], "w") as f:
            json.dump(results, f, indent=2)
        found = sum(1 for r in results if r["hops"])
        print(f"\n→ {len(results)} beers, {found} with hops → {brewery['output']}")
        all_results.extend(results)

    combined = SCRIPT_DIR / "combined-hops-untappd.json"
    with open(combined, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nCombined: {len(all_results)} beers → {combined}")

    await browser.stop()


if __name__ == "__main__":
    uc.loop().run_until_complete(main())
