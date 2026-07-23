// api/fetch-spin.js
const https = require('https');

export default async function handler(req, res) {
  // 1. Get the SKU from the URL query string
  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'SKU parameter is required' });
  }

  // 2. Metabase details
  const CARD_UUID = "4584f6d4-0394-4c30-ae53-dbbc1acfb88c";
  
  // Try with sku_input (most common based on your screenshot)
  const METABASE_URL = `https://metabase.spyne.ai/public/question/${CARD_UUID}.json?sku_input=${encodeURIComponent(sku)}`;

  try {
    // 3. Fetch data using native HTTPS to prevent Vercel fetch() context errors
    const data = await fetchFromMetabase(METABASE_URL);
    
    // 4. Send the JSON data back to your frontend
    return res.status(200).json(data);

  } catch (error) {
    console.error("Vercel API Error:", error);
    
    // Fallback attempt with sku_id just in case
    try {
        const FALLBACK_URL = `https://metabase.spyne.ai/public/question/${CARD_UUID}.json?sku_id=${encodeURIComponent(sku)}`;
        const fallbackData = await fetchFromMetabase(FALLBACK_URL);
        return res.status(200).json(fallbackData);
    } catch (fallbackError) {
        return res.status(500).json({ error: 'Failed to fetch data from Metabase backend.', details: error.message });
    }
  }
}

// Helper function to make HTTPS requests reliably in Vercel Node environments
function fetchFromMetabase(url) {
  return new Promise((resolve, reject) => {
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
    };

    https.get(url, options, (res) => {
      let data = '';

      // A chunk of data has been received.
      res.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received.
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
            } catch (e) {
                reject(new Error('Failed to parse JSON response from Metabase'));
            }
        } else {
            reject(new Error(`Metabase API responded with status: ${res.statusCode}`));
        }
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}
