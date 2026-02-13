[Porto](https://chromewebstore.google.com/detail/porto-import-your-tweets/ckilhjdflnaakopknngigiggfpnjaaop) is an Open Source [donation](https://ko-fi.com/nesterdev) based tool that lets you import your Tweets (X posts) into Bluesky in few clicks through a Chrome Extension. It's build by [Ankit Bhandari](https://bsky.app/profile/anku.bsky.social), [Yogesh Aryal](https://bsky.app/profile/aryog.bsky.social) & [Adarsh Kunwar](https://bsky.app/profile/helloalex.bsky.social). 

---

How to Use Porto?  🤔 <br/><br/>
Step 1: Download your archive data from Twitter/X.<br/>
Step 2: Extract the zip file into one standalone folder of archived data.<br/>
Step 3: Upload the extracted root folder into the extension.<br/>
Step 4: Choose the date range & customize what you want to import.<br/>
Step 5: Proceed, minimize the window, and let the magic happen! <br/>

---

## OAuth Setup (Maintainers)

Porto now uses Bluesky OAuth (no app-password login). The extension is
configured with this client metadata URL by default:

`https://nester-xyz.github.io/Porto/oauth-client-metadata.json`

To keep OAuth working:

1. Host `oauth-client-metadata.json` publicly over HTTPS (GitHub Pages is the default).
   This repo includes `.github/workflows/oauth-metadata-pages.yml` to publish it.
2. Keep `client_id` in that JSON exactly equal to the hosted URL.
3. Keep `redirect_uris` aligned with the production callback URL:
   `https://ckilhjdflnaakopknngigiggfpnjaaop.chromiumapp.org/oauth2`
4. If hosting URL or extension ID changes, update both:
   - `oauth-client-metadata.json`
   - `src/lib/auth/oauth.ts`
5. Ensure GitHub Pages is enabled for this repo with source set to "GitHub Actions".
6. Verify the metadata endpoint after deployment:
   - `curl -i https://nester-xyz.github.io/Porto/oauth-client-metadata.json`
   - Expect `HTTP/2 200` and `Content-Type: application/json`.
7. Local unpacked extension testing needs a dev OAuth profile:
   - Host a dev metadata JSON at your own HTTPS URL.
   - Keep that JSON `client_id` exactly equal to the hosted URL.
   - Keep `redirect_uris` equal to your unpacked extension callback from
     `chrome.identity.getRedirectURL("oauth2")`.
   - Set these in your local `.env.local`:
     - `VITE_BSKY_OAUTH_DEV_CLIENT_ID=<your-hosted-dev-metadata-url>`
     - `VITE_BSKY_OAUTH_DEV_REDIRECT_URI=<your-unpacked-extension-callback-url>`

Optional build-time overrides:

- `VITE_BSKY_OAUTH_CLIENT_ID`
- `VITE_BSKY_OAUTH_REDIRECT_URI`
- `VITE_BSKY_OAUTH_DEV_CLIENT_ID`
- `VITE_BSKY_OAUTH_DEV_REDIRECT_URI`

### Safe Rollout / Revert

1. Work from a branch and open a PR instead of pushing directly to `main`.
2. Before merge, run:
   - `npm run build`
   - `npm run test -- --run`
3. After merge, verify both workflows:
   - `.github/workflows/release.yml`
   - `.github/workflows/oauth-metadata-pages.yml`
4. If OAuth breaks after merge, immediately revert on `main`:
   - `git checkout main`
   - `git pull`
   - `git revert <bad_commit_sha>`
   - `git push origin main`

---

Porto has been featured on [Lifehacker.com](https://lifehacker.com/tech/use-porto-to-upload-all-your-old-tweets-to-bluesky), [Popular Science](https://www.popsci.com/diy/how-to-leave-twitter-for-bluesky/), [Mashable](https://mashable.com/article/bluesky-importing-tweets-x-posts) & more. Lifehacker has best walk through guide on how to use Porto, so we recommend reading their article.

---
Feel free to create any PR & issues that needs to be fixed to this tool. Also, thank you to [Divyaswor Makai](https://bsky.app/profile/divyaswor.bsky.social) for valuable contribution to Porto! 
