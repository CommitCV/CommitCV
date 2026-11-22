# CommitCV Privacy Policy

**Effective date:** November 19, 2026
**Last updated:** November 21, 2026

This policy explains what information CommitCV collects when you use the official website at [commitcv.com](https://commitcv.com) (the "Service"), where that information lives, and the choices you have. It replaces the earlier draft policy dated September 6, 2025.

## The short version

- **Your resume stays in your browser unless you connect a git repository.** Resumes are written, compiled and downloaded in your browser. If you connect a repository, your resume is sent through our servers to your git provider. We pass it along and never keep a copy.
- **Signing in with a git provider is optional and is not a CommitCV account.** We do not have user accounts.
- **Your access tokens stay in your browser.** Our server passes a token to your git provider while a request is in progress and does not store it.
- **We collect anonymous usage statistics**, such as how many resumes are created or downloaded and which kinds of git errors happen. These use only broad categories and never include anything you type into your resume, or the name of your repository, account or host.
- **We do not sell your data.**
- **Clearing your browser data deletes resumes that exist only in your browser, and your saved sign-ins.** We keep no copy, so we cannot recover them. Resumes you committed to a repository are not affected.

## 1. Who we are

CommitCV is operated by a group of maintainers ("CommitCV", "we", "us"). You can reach us at **contact@commitcv.com**.

CommitCV is open-source software. This policy applies only to the official instance at commitcv.com. It does not apply to forks, self-hosted copies, or other websites built from our code, which are run by other people and are not under our control.

## 2. Where your information lives

| Where                                                   | What is there                                                                                                                                                                                | Who can access it                              |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Your browser** (IndexedDB, local storage and cookies) | Your resumes (compressed), preview thumbnails, your git connections and access or refresh tokens, a local copy of any connected repository, your current draft, and the cookies in section 5 | You. This data is not stored by us.            |
| **Your device**                                         | PDFs and other files you download                                                                                                                                                            | You                                            |
| **Your git provider**, if you connect a repository      | The resumes and commits you save there                                                                                                                                                       | You, and anyone your repository settings allow |
| **Our server**                                          | Anonymous analytics (section 4.1) and server logs (section 4.2). It also relays traffic to your git provider (section 4.3) without storing it.                                               | CommitCV maintainers                           |
| **Third-party content providers**                       | Fonts, scripts and images loaded when you visit the site (section 6)                                                                                                                         | The providers, under their own policies        |

## 3. What we do not collect

We do not collect, receive or store:

- The content of your resumes, including your name, contact details, work history, education, skills or any other text you enter. If you connect a git repository, this content passes through our relay on its way to your git provider, but we do not keep it or log it.
- Your files or PDFs
- Your git access tokens or refresh tokens. They pass through our server in transit and are not stored.
- Passwords (there are no accounts)
- Payment information (the Service is currently free)

The Typst compiler that turns your resume into a PDF runs inside your browser. Your resume is not uploaded for compilation.

## 4. What we do collect

### 4.1 Anonymous analytics

To understand how CommitCV is used and to fix problems, we collect anonymous events and technical information.

**Usage events (the event name only, never content):**

- A resume was created
- A resume was downloaded as a PDF
- A resume was deleted
- A resume was imported or exported

**Git events.** If you use the git features, we record that a step happened and a few fixed categories about it. The events are: connect started, sign-in returned, repository list loaded, repository connected, connect failed, template created, save failed, commit completed (only when you commit explicitly, not on autosave), sync prompt shown and resolved, session prompt shown and resolved, sign-in expired, token refreshed, resume opened, history opened, and version restored. These events can carry only:

- The git provider: GitHub, GitLab, Codeberg, or "additional provider" for any other git provider (its address is never sent)
- Whether you connected through an integrated provider or with an access token you provided
- A general error category, such as authentication, conflict or network
- A rounded duration range, such as "1 to 5 seconds"
- The choice you made in a sync-conflict or session prompt

**Technical context:**

- Pages viewed. We record the page path only. The query string and the part after "#" are removed before a page view is sent.
- Browser and operating system
- Device type and screen size
- Country (derived from your IP address at the time of the request; the IP address itself is not stored with the analytics event)
- Referrer (the site that sent you to CommitCV)
- Language setting

**Errors and performance:**

- Resume compile errors (the type of error only, never your resume text)
- Git connection and sync errors (a general category only, such as authentication, conflict or network, never the message from your git provider)
- Crash and JavaScript error reports (the error type only)
- Page load performance (load, DOM-ready and first-byte timings)

**Anonymous visitor ID:** to count unique visitors, our analytics tool creates an anonymous identifier on our server from technical details of your visit. This identifier is not stored in your browser, is not linked to your name, email or resume content, and cannot be used to identify you.

**Our rule:** no resume content, names, email addresses, repository names, account names, URLs, hostnames, file names, commit messages or access tokens are ever placed in an analytics event.

We do not store full IP addresses in our analytics data, and we do not use analytics to build profiles of individual people.

**How analytics are collected:** we use [Umami](https://umami.is), an open-source analytics tool that we host ourselves on our own server. Analytics data is never sent to a third-party analytics provider. Umami does not store your full IP address. The IP address is used only to work out your approximate country and to tell visits apart, and is then discarded. Our own code sends the events listed above to Umami. Each event has its name and, for the git, error and performance events, only the fixed categories or numbers described above.

### 4.2 Server logs

Like most websites, our server automatically records basic technical information about each request: IP address, date and time, the page or file requested, the response status, and your browser's user-agent string. We use these logs to keep the Service running, fix problems and protect against abuse. Logs are kept for up to 30 days and are not used to identify you or to look at your resumes.

### 4.3 Git connections

Connecting a git repository is optional. If you do, your resume and commits are sent through our server to your git provider, because git providers do not let browsers connect to them directly. Our server passes these requests along and does not store your resume, your repository or your access token.

When you sign in with an integrated provider, our server exchanges the sign-in for an access token and hands it to your browser, holding it in memory for up to a minute until your browser collects it. Our server also uses your token to list your repositories, to renew it when it expires, and to look up your name so it can fill in your commit author details.

When a relayed request fails, our server logs the request method, the git provider and the response status. It never logs repository names, file contents, tokens or error messages from your git provider. These logs are kept like other server logs (section 4.2).

Commits made through CommitCV name you as the author, using the name and email from your git provider or the ones you enter, and name CommitCV as the committer and a co-author. Anyone who can see your repository can see these details. While you edit, CommitCV saves your work to temporary branches in your repository and combines them into your main branch when you commit.

If you create a resume from the CommitCV template, the new repository is created in your own git provider account.

## 5. Cookies and browser storage

Most of what CommitCV remembers is kept in your browser, not on our server.

**Browser storage (not cookies):**

- **Your resumes.** Resumes you keep in your browser are stored in IndexedDB, compressed, along with small preview thumbnails.
- **Your current draft.** The resume you are editing is also kept in local storage so it is still there when you reload.
- **Git connections.** For each repository you connect, your browser stores the repository address, a label, your commit author name and email, and your access token (plus the refresh token and expiry, if you signed in with a git provider). Tokens are stored only here. They are not in local storage, your draft or your resume.
- **A local copy of connected repositories.** To work with a repository, your browser keeps a shallow copy of it in IndexedDB, along with details of your current editing sessions.
- **A dismissed notice.** Whether you closed the backup reminder.
- **Persistent storage.** CommitCV may ask your browser to protect this data from being cleared automatically when disk space is low. This does not stop you from clearing it yourself.

**Cookies.** We set cookies only while you sign in with a git provider. They are used only for that purpose:

| Cookie          | Purpose                                                                                                                                                        | Lifetime   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `oauth_tx`      | Protects the sign-in from forgery. It holds random values, the provider and server you chose, and the page to return to. It is signed. It never holds a token. | 10 minutes |
| `oauth_handoff` | A random one-time code that lets your browser collect the token our server holds for you, once. It is not the token.                                           | 1 minute   |

Both cookies are HttpOnly, SameSite=Lax, limited to the sign-in paths of the site, and marked Secure when the site is served over HTTPS.

We do not use cookies for advertising or to track you across sites.

**Clearing data.** You can view or delete cookies and stored data at any time in your browser's settings. If you do:

- Resumes that exist only in your browser are deleted and cannot be recovered. Download or export anything you want to keep first.
- Your saved git connections and tokens are deleted, and you will have to sign in or connect again.
- Resumes you have already committed to a repository are not affected, because they are stored by your git provider.

## 6. Third-party services

To load the Service, your browser fetches some resources directly from third parties. When it does, those providers receive standard request information such as your IP address, browser type and the page you are visiting. We do not control their practices.

| Provider                                                   | What it provides                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Google Fonts** (fonts.googleapis.com, fonts.gstatic.com) | Web fonts. [Google Privacy Policy](https://policies.google.com/privacy)                                                                                |
| **Fontsource** (fontsource.org)                            | Web fonts                                                                                                                                              |
| **jsDelivr** (cdn.jsdelivr.net)                            | Open-source libraries, including the Typst WebAssembly compiler. [jsDelivr Privacy Policy](https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net) |
| **GitHub** (githubassets.com, githubusercontent.com)       | Images and static assets. [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)         |

These providers deliver files to your browser. They do not receive your resume content.

**Git providers.** If you connect a repository, your git provider receives your access token, your resumes and your commits, including your author name and email. It handles them under its own privacy policy, not this one, and we do not control it. CommitCV integrates with these providers:

| Provider     | Privacy policy                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| **GitHub**   | [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) |
| **GitLab**   | [GitLab Privacy Statement](https://about.gitlab.com/privacy/)                                                        |
| **Codeberg** | [Codeberg Privacy Policy](https://codeberg.org/codeberg/org/src/branch/main/PrivacyPolicy.md)                        |

If you connect an additional git provider with your own access token, that provider's own privacy policy applies. Check your provider's policy and your repository's visibility settings.

We will not send analytics data to a third-party analytics provider without first updating this policy.

## 7. How we use information

We use the information described above to:

- Provide and maintain the Service, including relaying requests to your git provider
- Understand usage and decide what to improve
- Find and fix bugs and performance problems
- Keep the Service secure and prevent abuse, including rate-limiting the relay
- Meet legal obligations

We do not use your information for advertising, and we do not sell it.

## 8. Sharing

We do not sell, rent or trade personal information. We do not share information with anyone except:

- **Your git provider**, when you connect a repository or sign in with it, as described in sections 4.3 and 6
- **When required by law**, such as a valid legal request
- **To protect** the Service, our users or others from fraud, abuse or security threats

Anonymous, aggregate statistics (for example, "resumes created this month") may be published, for instance in project updates.

## 9. How long we keep information

| Information                                  | Retention                                                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resumes, tokens and settings in your browser | Until you delete them, remove a connection, or clear your browser data. We do not control this.                                                      |
| Resumes in your git repository               | Under your control and your git provider's policy. Clearing browser data does not remove them.                                                       |
| Access and refresh tokens on our server      | Not stored. A sign-in token is held in memory for up to 60 seconds, until your browser collects it, then discarded. Other tokens are only forwarded. |
| Sign-in cookies                              | 10 minutes (`oauth_tx`) and 1 minute (`oauth_handoff`).                                                                                              |
| Server logs, including relay failure logs    | Up to 30 days                                                                                                                                        |
| Anonymous analytics                          | Up to 24 months, after which they are deleted or kept only as aggregate totals                                                                       |

## 10. Your choices and rights

Because your resume lives in your browser, and in your own repository if you connect one, you are in control of it: you can edit, export or delete it at any time. Clearing your browser's site data removes resumes that exist only in your browser. To stop using a git connection, remove it in CommitCV, which deletes its stored token from your browser, and revoke the app's access in your git provider's settings. To remove resumes or branches from a repository, delete them in the repository itself.

We hold very little information that can be linked to you. If you believe we hold personal information about you and want to access, correct or delete it, email **privacy@commitcv.com** and we will respond within a reasonable time. We may need some details from you (such as the approximate date of your visit) to find anything, since we do not keep accounts. We cannot access or change what your git provider stores. Contact your host for that.

Our practices are intended to align with Canadian privacy law, including the Personal Information Protection and Electronic Documents Act (PIPEDA). If you are in the European Economic Area, the United Kingdom or California, you may have additional rights under laws such as the GDPR or CCPA. We do not sell personal information, and the limited analytics we collect are based on our legitimate interest in running and improving a free service. Contact us to exercise any rights you have.

## 11. Security

Your resume is stored in your browser, and is sent only to your git provider if you connect a repository. The Service is delivered over HTTPS, and the relay connects to git providers over HTTPS only. The relay accepts browser requests only from CommitCV's own site, refuses private and internal network addresses, limits request size and rate, and forwards your token only to the provider you chose. Access tokens are kept in your browser, not on our server. Anyone who can use your browser profile, or who can run script on this site, could read them, so protect your device and clear your data on shared computers. Sign-in cookies are HttpOnly and short-lived. We limit access to our server and logs to the maintainers who need it. No system is perfectly secure, so please protect your own device, give tokens the narrowest permissions you can, and keep a backup of anything important.

## 12. Where data is processed

Our server and analytics are operated from Canada. If you use the Service from elsewhere, the limited information described in section 4 may be processed in Canada. Relayed requests pass through our server in Canada on their way to your git provider. Your git provider may process data in other countries.

## 13. Children

The Service is not directed at young children, and we do not knowingly collect personal information from children. Since we do not keep resume content or run accounts, we hold nothing that identifies a child. If you believe a child has provided information to us, contact contact@commitcv.com.

## 14. Future changes to the Service

CommitCV is free today. We may add new features in the future, such as new integrations, donations, advertising or paid features. If a new feature changes what information is collected or how it is handled, we will update this policy before the feature launches. We will not sell your personal information.

## 15. Changes to this policy

The full history of changes to this policy is available in our public GitHub repository. The "Last updated" date at the top shows the most recent change. Continuing to use the Service after a change means you accept the updated policy.

## 16. Contact

For questions reach out to **contact@commitcv.com** and for privacy concerns reach out to **privacy@commitcv.com**
