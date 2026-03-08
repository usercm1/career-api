export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, city, gender, experience, position, coverLetter, resumeBase64 } = req.body;

  if (!name || !email || !position) {
    return res.status(400).json({ error: 'Name, email and position are required' });
  }

  if (!resumeBase64) {
    return res.status(400).json({ error: 'Resume is required' });
  }

  try {
    // Step 1 — Upload resume PDF to Cloudinary
    const cloudName = 'dtyib8p0i';
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `resumes/${timestamp}_${name.replace(/\s+/g, '_')}`;

    const crypto = await import('crypto');
    const sigString = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.default.createHash('sha256').update(sigString).digest('hex');

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        file: `data:application/pdf;base64,${resumeBase64}`,
        api_key: process.env.CLOUDINARY_API_KEY,
        timestamp: timestamp.toString(),
        signature,
        public_id: publicId,
      }),
    });

    const cloudData = await cloudRes.json();

    if (!cloudRes.ok || !cloudData.secure_url) {
      console.error('Cloudinary error:', cloudData);
      return res.status(500).json({ error: 'Failed to upload resume' });
    }

    const resumeUrl = cloudData.secure_url;

    // Step 2 — Save everything to Airtable
    const airtableRes = await fetch(
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
            'Submitted At': new Date().toISOString().split('T')[0],
            Status: 'New',
            City: city || '',
            Gender: gender || '',
            Experience: experience || '',
            'Resume URL': resumeUrl,
          },
        }),
      }
    );

    const airtableData = await airtableRes.json();

    if (!airtableRes.ok) {
      console.error('Airtable error:', airtableData);
      return res.status(500).json({ error: 'Failed to save application' });
    }

    return res.status(200).json({ success: true, message: 'Application submitted!' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error, please try again' });
  }
}
