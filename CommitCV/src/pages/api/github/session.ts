import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const githubToken = req.cookies.github_token;

    if (!githubToken) {
        return res.status(401).json({ authenticated: false });
    }

    res.json({ authenticated: true });
}
