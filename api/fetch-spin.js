// api/fetch-spin.js

export default async function handler(req, res) {
  // 1. Get the SKU from the URL query string
  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'SKU parameter is required' });
  }

  // 2. Metabase Details (Notice the .json extension to get raw data instead of an HTML page)
  const CARD_UUID = "4584f6d4-0394-4c30-ae53-dbbc1acfb88c";
  const METABASE_URL = `https://metabase.spyne.ai/public/question/${CARD_UUID}.json?sku_input=${encodeURIComponent(sku)}`;

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
