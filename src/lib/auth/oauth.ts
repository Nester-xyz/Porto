import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

// TODO: Replace this with the actual URL where your client-metadata.json is hosted.
// For a Chrome Extension, you typically need to host this file on a public server.
// The client-metadata.json must include the extension's redirect URI.
// Example: https://<extension-id>.chromiumapp.org/
// For development, you might be able to use a localhost URL if testing locally.
const CLIENT_ID = "https://porto-oauth-metadata.vercel.app/client-metadata.json";

export const oauthClient = new BrowserOAuthClient({
  handleResolver: 'https://bsky.social',
  clientId: CLIENT_ID,
});

export const initOAuth = async () => {
  try {
    const result = await oauthClient.init();
    return result;
  } catch (err) {
    console.error("OAuth init error:", err);
    return null;
  }
};

export const signInWithOAuth = async (handle: string) => {
    try {
        await oauthClient.signIn({
            handleOrDid: handle,
        });
    } catch (err) {
        console.error("Sign in error:", err);
        throw err;
    }
};
