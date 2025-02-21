import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!code) {
        return res.status(400).json({ error: "Authorization code missing" });
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const { access_token } = await tokenResponse.json();

    if (!access_token) {
        return res.status(400).json({ error: "Failed to get access token" });
    }

    res.setHeader("Set-Cookie", `github_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`);
    res.redirect("/resume");
}
