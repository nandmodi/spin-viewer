// api/fetch-spin.js

// The card's SKU filter, as Metabase defines it. Metabase rejects a filter sent without the
// parameter's id and real type ("string/=") with a bare 400 "An error occurred.", so read them
// from the card itself and keep them; the hard-coded copy is only a fallback.
const SKU_PARAM_FALLBACK = {
  id: "b703aee1-2dd3-4af2-8ae4-e414a57a348b",
  type: "string/=",
  target: ["variable", ["template-tag", "sku_input"]],
};
let skuParam = null;

async function getSkuParam(cardUuid) {
  if (skuParam) return skuParam;
  try {
    const r = await fetch(`https://metabase.spyne.ai/api/public/card/${cardUuid}`);
    const card = await r.json();
    const p = (card.parameters || []).find(p => p.slug === 'sku_input');
    if (p) skuParam = { id: p.id, type: p.type, target: p.target };
  } catch (e) {
    console.warn('Could not read the card parameters, using the fallback:', e.message);
  }
  return skuParam || SKU_PARAM_FALLBACK;
}

export default async function handler(req, res) {
  // The GitHub Pages copy of the page (spyne-k.github.io) calls this function cross-origin.
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 1. Get the SKU from the URL query string
  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'SKU parameter is required' });
  }

  // 2. Metabase Details
  const CARD_UUID = "4584f6d4-0394-4c30-ae53-dbbc1acfb88c";
  
  // Metabase's .json export endpoint requires parameters to be passed as a stringified JSON array
  const metabaseParams = [{ ...(await getSkuParam(CARD_UUID)), value: String(sku) }];
  
  const METABASE_URL = `https://metabase.spyne.ai/public/question/${CARD_UUID}.json?parameters=${encodeURIComponent(JSON.stringify(metabaseParams))}`;

  try {
    // 3. Fetch data using modern Node 18 fetch (Available standard in Vercel)
    const response = await fetch(METABASE_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    // 4. Get the raw text first! (If Metabase/Cloudflare blocks us, it returns HTML which breaks JSON.parse)
    const rawText = await response.text();

    if (!response.ok) {
      // If Metabase returns 403 Forbidden or 500, send that exact reason to the frontend
      return res.status(response.status).json({ 
        error: `Metabase API failed with status ${response.status}`,
        details: rawText.substring(0, 300) 
      });
    }

    try {
      // 5. Try to parse it as JSON
      const jsonData = JSON.parse(rawText);
      return res.status(200).json(jsonData);
    } catch (parseError) {
      // 6. If it fails to parse, it means Metabase sent us HTML instead of JSON data!
      return res.status(502).json({
        error: "Metabase returned an invalid format (likely an HTML error page or Cloudflare block instead of JSON).",
        snippet: rawText.substring(0, 200)
      });
    }

  } catch (error) {
    console.error("Vercel Network Error:", error);
    return res.status(500).json({ 
        error: 'Vercel failed to connect to Metabase servers.', 
        details: error.message 
    });
  }
}
