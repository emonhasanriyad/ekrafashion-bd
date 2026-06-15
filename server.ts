import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Meta CAPI Proxy Route
  app.post("/api/track", async (req, res) => {
    const pixelId = process.env.FB_PIXEL_ID || "1492484778520113";
    const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("FB_CAPI_ACCESS_TOKEN is missing");
      return res.status(500).json({ error: "Configuration missing" });
    }

    // Capture User IP and Agent if not provided
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const clientUserAgent = req.headers['user-agent'] || '';

    const event = {
      ...req.body,
      user_data: {
        ...req.body.user_data,
        client_ip_address: req.body.user_data?.client_ip_address || clientIp,
        client_user_agent: req.body.user_data?.client_user_agent || clientUserAgent,
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
      console.log('CAPI Response:', JSON.stringify(result));
      res.json(result);
    } catch (error) {
      console.error("CAPI error:", error);
      res.status(500).json({ error: "Failed to send event" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
