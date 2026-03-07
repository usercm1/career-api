export default async function handler(req, res) {
  // Allow requests from any origin (your Shopify store)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, position, coverLetter } = req.body;

  // Basic validation
  if (!name || !email || !position) {
    return res.status(400).json({ error: 'Name, email and position are required' });
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/app2kgr3fGCVmiNrB/Table%201`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            Email: email,
            Phone: phone || '',
            Position: position,
            'Cover Letter': coverLetter || '',
            'Submitted At': new Date().toISOString(),
            Status: 'New',
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Airtable error:', data);
      return res.status(500).json({ error: 'Failed to save application' });
    }

    return res.status(200).json({ success: true, message: 'Application submitted!' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error, please try again' });
  }
}
