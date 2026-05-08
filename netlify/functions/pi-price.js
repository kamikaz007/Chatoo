/**
 * netlify/functions/pi-price.js
 * Fetches real Pi Network price from CoinGecko
 */

exports.handler = async () => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60" // cache 60s
  };

  try {
    // CoinGecko — pi-network coin id
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd,eur&include_24hr_change=true&include_market_cap=true",
      { headers: { "Accept": "application/json" } }
    );

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = await res.json();
    const pi = data["pi-network"];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        usd:        pi?.usd ?? 0,
        eur:        pi?.eur ?? 0,
        change24h:  pi?.usd_24h_change ?? 0,
        marketCap:  pi?.usd_market_cap ?? 0,
        timestamp:  Date.now()
      })
    };
  } catch (err) {
    // Fallback: try alternative source
    try {
      const res2 = await fetch("https://api.coincap.io/v2/assets/pi-network");
      const d = await res2.json();
      const price = parseFloat(d?.data?.priceUsd ?? 0);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ usd: price, eur: price * 0.92, change24h: 0, timestamp: Date.now() })
      };
    } catch {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ usd: 0, eur: 0, change24h: 0, timestamp: Date.now(), error: "price_unavailable" })
      };
    }
  }
};
