import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow cross-origin requests for safety
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for tracking events
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pixelId = process.env.FB_PIXEL_ID || "1492484778520113";
  const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;

  // If the token is missing, we'll log a warning and return success to avoid breaking frontend user flow
  if (!accessToken) {
    console.warn("FB_CAPI_ACCESS_TOKEN is missing in Vercel environment variables. Skipping CAPI event dispatch.");
    return res.status(200).json({ status: "skipped", reason: "Token not configured" });
  }

  // Extract client IP and user agent for Meta attribution quality
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  const clientUserAgent = req.headers['user-agent'] || '';

  const event = {
    ...req.body,
    user_data: {
      ...req.body?.user_data,
      client_ip_address: req.body?.user_data?.client_ip_address || clientIp,
      client_user_agent: req.body?.user_data?.client_user_agent || clientUserAgent,
    }
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v13.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [event],
      }),
    });

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (error) {
    console.error("CAPI dispatch error on Vercel:", error);
    return res.status(500).json({ error: "Failed to dispatch event to Meta" });
  }
}
