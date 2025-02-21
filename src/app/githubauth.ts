// import "dotenv/config";
// import { createAppAuth } from "@octokit/auth-app";
// import { Octokit } from "@octokit/rest";
//
// const octokit = new Octokit({
//   authStrategy: createAppAuth,
//   auth: {
//     appId: process..env.APP_ID!,
//     privateKey: process..env.PRIVATE_KEY!,
//     installationId: process..env.INSTALLATION_ID,
//   },
// });
//
// const auth = createAppAuth({
//   appId: process..env.APP_ID!,
//   privateKey: process..env.PRIVATE_KEY!,
//   clientId: process..env.CLIENT_ID,
//   clientSecret: process..env.CLIENT_SECRET,
// });
//
// const {
//   data: { slug },
// } = await octokit.rest.apps.getAuthenticated();
//
// // // Define GitHub App authentication
// // const appAuth = createAppAuth({
// //   appId: process..env.APP_ID!,
// //   privateKey: process..env.PRIVATE_KEY!,
// // });
//
// // GitHub App Installation URL
// const installationUrl = `https://github.com/apps/YOUR_APP_NAME/installations/new?state=random_string`;
//
// console.log(`Install the app: ${installationUrl}`);
//
// // Function to authenticate and get Octokit instance
// async function getInstallationAccessToken(installationId: number) {
//   const authResponse = await octokit({
//     type: "installation",
//     installationId,
//   });
//
//   return new Octokit({ auth: authResponse.token });
// }
//
//
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }
//
//   try {
//     const { owner, repo, filePath, content } = req.body;
//
//     if (!owner || !repo || !filePath || !content) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }
//
//     const installationId = 12345678; // Dynamically fetch this later
//     const octokit = await getInstallationAccessToken(installationId);
//
//     await octokit.repos.createOrUpdateFileContents({
//       owner,
//       repo,
//       path: filePath,
//       message: "Create new file",
//       content: Buffer.from(content).toString("base64"),
//       branch: "main",
//     });
//
//     return res.status(200).json({ message: "File created successfully" });
//   } catch (error) {
//     console.error("Error creating file:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// }
//
//
// // Function to create a file in a repo
// async function createFileInRepo(owner: string, repo: string, filePath: string, content: string) {
//   const installationId = 12345678; // Get the actual installation ID dynamically
//
//   const octokit = await getInstallationAccessToken(installationId);
//
//   await octokit.repos.createOrUpdateFileContents({
//     owner,
//     repo,
//     path: filePath,
//     message: "Create new file",
//     content: Buffer.from(content).toString("base64"),
//     branch: "main",
//   });
//
//   console.log(`File created: ${filePath}`);
// }
