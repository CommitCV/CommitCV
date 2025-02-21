import { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "@octokit/rest";
import jwt from "jsonwebtoken";

async function getInstallationToken(req: NextApiRequest) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY;
    const installationId = req.cookies.github_installation_id;

    if (!appId || !privateKey || !installationId) {
        throw new Error("Missing GitHub App credentials or installation ID");
    }

    const now = Math.floor(Date.now() / 1000);
    const appToken = jwt.sign(
        { iat: now, exp: now + 600, iss: appId },
        privateKey,
        { algorithm: "RS256" }
    );

    const octokit = new Octokit({ auth: appToken });

    const { data } = await octokit.request(`POST /app/installations/${installationId}/access_tokens`);
    return data.token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const token = await getInstallationToken(req);

        if (!token) {
            console.error("No token received");
            return res.status(401).json({ error: "Unauthorized" });
        }

        console.log("Received token:", token);

        const octokit = new Octokit({ auth: token });

        try {
            const { data } = await octokit.request("GET /installation/repositories");
            console.log("Fetched repositories:", data.repositories);
            res.json(data.repositories)
        } catch (error) {
            console.error("Failed to fetch repositories:", error);
            res.status(500).json({ error: "Failed to fetch repositories" });
        }
    } catch (error) {
        console.error("Failed to fetch token:", error);
        res.status(500).json({ error: "Failed to fetch token" });
    }
}