export default async function handler(req, res) {
  // Get the SKU from the URL query string (e.g., /api/fetch-spin?sku=123)
  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'SKU parameter is required' });
  }

  // Your Metabase details
  const CARD_UUID = "4584f6d4-0394-4c30-ae53-dbbc1acfb88c";
  const METABASE_URL = `https://metabase.spyne.ai/public/question/${CARD_UUID}.json?sku_input=${encodeURIComponent(sku)}`;

  try {
    // Fetch the data from Metabase on the server side (No CORS limits here!)
    const response = await fetch(METABASE_URL);

    if (!response.ok) {
      throw new Error(`Metabase API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Send the JSON data back to your frontend
    res.status(200).json(data);

  } catch (error) {
    console.error("Vercel API Error:", error);
    res.status(500).json({ error: 'Failed to fetch data from Metabase backend.' });
  }
