/**
 * netlify/functions/pi-payment.js
 * Server-side Pi Network payment verification
 * Runs on Netlify Edge — API key never exposed to client
 */
require('dotenv').config();
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { paymentId, action } = JSON.parse(event.body || "{}");
    const PI_API_KEY = process.env.PI_API_KEY;
    const PI_BASE    = process.env.PI_SANDBOX === "true"
      ? "https://api.minepi.com"
      : "https://api.minepi.com";

    if (!PI_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "PI_API_KEY not configured in Netlify env vars" }) };
    }

    if (!paymentId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "paymentId required" }) };
    }

    // ── Approve payment ──────────────────────────────────────
    if (action === "approve") {
      const res = await fetch(`${PI_BASE}/v2/payments/${paymentId}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      return { statusCode: res.ok ? 200 : 400, headers, body: JSON.stringify(data) };
    }

    // ── Complete payment ─────────────────────────────────────
    if (action === "complete") {
      const { txid } = JSON.parse(event.body);
      const res = await fetch(`${PI_BASE}/v2/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ txid })
      });
      const data = await res.json();
      return { statusCode: res.ok ? 200 : 400, headers, body: JSON.stringify(data) };
    }

    // ── Get payment status ───────────────────────────────────
    if (action === "status") {
      const res = await fetch(`${PI_BASE}/v2/payments/${paymentId}`, {
        headers: { "Authorization": `Key ${PI_API_KEY}` }
      });
      const data = await res.json();
      return { statusCode: res.ok ? 200 : 400, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action. Use: approve | complete | status" }) };

  } catch (err) {
    console.error("[pi-payment]", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
