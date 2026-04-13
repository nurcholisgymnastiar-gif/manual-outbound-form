export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;
    const row = [
      data.submitted_at, data.requester_name, data.division,
      data.request_date, data.sku, data.quantity, data.unit,
      data.destination, data.area, data.urgency, data.notes, 'Pending'
    ];

    const prompt = `You are a data entry assistant. Use the Lark Sheets MCP tool to append one row to a Lark Sheet.
Spreadsheet token: JobLsIorQhoud7tRkRVjBJOepuc
Sheet ID: LhZkTX
If row 1 is empty, write headers first: Submitted At | Requester Name | Division | Request Date | SKU/Product | Quantity | Unit | Destination | Area | Urgency | Notes | Status
Then append this data as the next available empty row: ${JSON.stringify(row)}
Use useUAT: true. Reply only: DONE`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        mcp_servers: [{ type: 'url', url: 'https://seravee-lark-mcp.tentanganak.id/mcp', name: 'lark-ta' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Anthropic API error', detail: err });
    }

    const json = await response.json();
    const text = (json.content || []).map(b => b.text || '').join('');
    if (!text.includes('DONE') && !text.toLowerCase().includes('success')) {
      return res.status(500).json({ error: 'Sheet write may have failed', detail: text });
    }
    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
