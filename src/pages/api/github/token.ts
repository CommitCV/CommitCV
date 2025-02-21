import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { Octokit } from "@octokit/rest";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY;
    const installationId = req.cookies.github_installation_id;

    if (!appId || !privateKey || !installationId) {
        return res.status(400).json({ error: "Missing GitHub App credentials or installation ID" });
    }

    // Create a JWT for the GitHub App
    const now = Math.floor(Date.now() / 1000);
    const appToken = jwt.sign(
        { iat: now, exp: now + 600, iss: appId },
        privateKey,
        { algorithm: "RS256" }
    );

    const octokit = new Octokit({ auth: appToken });

    try {
        // Get installation access token
        const { data } = await octokit.request(`POST /app/installations/${installationId}/access_tokens`);

        res.json({ token: data.token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to get installation access token" });
    }
}
