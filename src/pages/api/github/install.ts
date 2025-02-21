import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { installation_id } = req.query;

    if (!installation_id) {
        return res.status(400).json({ error: "Missing installation ID" });
    }

    // Store installation_id in session or database
    res.setHeader("Set-Cookie", `github_installation_id=${installation_id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);

    res.redirect("/resume"); // Redirect to a dashboard page
}