import { BrowserOAuthClient, OAuthSession } from "@atproto/oauth-client-browser";

const DEFAULT_PROD_OAUTH_CLIENT_ID =
  "https://nester-xyz.github.io/Porto/oauth-client-metadata.json";
const DEFAULT_PROD_OAUTH_REDIRECT_URI =
  "https://ckilhjdflnaakopknngigiggfpnjaaop.chromiumapp.org/oauth2";

const PROD_OAUTH_CLIENT_ID =
  (import.meta.env.VITE_BSKY_OAUTH_CLIENT_ID ??
    DEFAULT_PROD_OAUTH_CLIENT_ID) as `https://${string}`;
const PROD_OAUTH_REDIRECT_URI =
  (import.meta.env.VITE_BSKY_OAUTH_REDIRECT_URI ??
    DEFAULT_PROD_OAUTH_REDIRECT_URI) as `https://${string}`;
const DEV_OAUTH_CLIENT_ID =
  import.meta.env.VITE_BSKY_OAUTH_DEV_CLIENT_ID?.trim();
const DEV_OAUTH_REDIRECT_URI =
  import.meta.env.VITE_BSKY_OAUTH_DEV_REDIRECT_URI?.trim();

const OAUTH_SCOPE = "atproto transition:generic transition:email";
const OAUTH_RESPONSE_MODE = "query" as const;
const CLIENT_NAME = "Porto - Import Tweets to Bluesky";

let oauthClient: BrowserOAuthClient | null = null;
let oauthClientKey: string | null = null;

interface OAuthRuntimeConfig {
  clientId: `https://${string}`;
  redirectUri: `https://${string}`;
}

const ensureHttpsUrl = (
  value: string,
  label: string
): `https://${string}` => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL. Received "${value}".`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${label} must use https://. Received "${value}".`);
  }

  return parsed.toString() as `https://${string}`;
};

const inferClientUri = (clientId: `https://${string}`): `https://${string}` => {
  const url = new URL(clientId);
  const pathParts = url.pathname.split("/");
  pathParts.pop();
  const parentPath = pathParts.join("/") || "";
  return `${url.origin}${parentPath}` as `https://${string}`;
};

const getRuntimeRedirectUri = (): `https://${string}` => {
  if (!chrome?.identity?.getRedirectURL) {
    throw new Error("Chrome identity API is unavailable in this context.");
  }

  return ensureHttpsUrl(chrome.identity.getRedirectURL("oauth2"), "Runtime OAuth redirect URI");
};

const resolveOAuthRuntimeConfig = (): OAuthRuntimeConfig => {
  const runtimeRedirectUri = getRuntimeRedirectUri();
  const productionRedirectUri = ensureHttpsUrl(
    PROD_OAUTH_REDIRECT_URI,
    "VITE_BSKY_OAUTH_REDIRECT_URI"
  );
  const productionClientId = ensureHttpsUrl(
    PROD_OAUTH_CLIENT_ID,
    "VITE_BSKY_OAUTH_CLIENT_ID"
  );

  if (runtimeRedirectUri === productionRedirectUri) {
    return {
      clientId: productionClientId,
      redirectUri: productionRedirectUri,
    };
  }

  if (!DEV_OAUTH_CLIENT_ID || !DEV_OAUTH_REDIRECT_URI) {
    throw new Error(
      `OAuth redirect mismatch. Runtime redirect is ${runtimeRedirectUri} but production redirect is ${productionRedirectUri}. ` +
        "For unpacked local testing, set VITE_BSKY_OAUTH_DEV_CLIENT_ID and VITE_BSKY_OAUTH_DEV_REDIRECT_URI."
    );
  }

  const developmentRedirectUri = ensureHttpsUrl(
    DEV_OAUTH_REDIRECT_URI,
    "VITE_BSKY_OAUTH_DEV_REDIRECT_URI"
  );
  const developmentClientId = ensureHttpsUrl(
    DEV_OAUTH_CLIENT_ID,
    "VITE_BSKY_OAUTH_DEV_CLIENT_ID"
  );

  if (runtimeRedirectUri !== developmentRedirectUri) {
    throw new Error(
      `OAuth redirect mismatch. Runtime redirect is ${runtimeRedirectUri} but VITE_BSKY_OAUTH_DEV_REDIRECT_URI is ${developmentRedirectUri}.`
    );
  }

  return {
    clientId: developmentClientId,
    redirectUri: developmentRedirectUri,
  };
};

const getOAuthClient = (): {
  client: BrowserOAuthClient;
  redirectUri: `https://${string}`;
} => {
  const runtimeConfig = resolveOAuthRuntimeConfig();
  const cacheKey = `${runtimeConfig.clientId}|${runtimeConfig.redirectUri}`;

  if (!oauthClient || oauthClientKey !== cacheKey) {
    const clientUri = inferClientUri(runtimeConfig.clientId);
    oauthClient = new BrowserOAuthClient({
      responseMode: OAUTH_RESPONSE_MODE,
      handleResolver: "https://bsky.social",
      clientMetadata: {
        client_id: runtimeConfig.clientId,
        client_name: CLIENT_NAME,
        client_uri: clientUri,
        redirect_uris: [runtimeConfig.redirectUri],
        scope: OAUTH_SCOPE,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        application_type: "web",
        dpop_bound_access_tokens: true,
      },
    });

    oauthClientKey = cacheKey;
  }

  return { client: oauthClient, redirectUri: runtimeConfig.redirectUri };
};

const launchWebAuthFlow = async (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!responseUrl) {
          reject(new Error("OAuth callback did not return a URL."));
          return;
        }

        resolve(responseUrl);
      }
    );
  });

export const restoreOAuthSession = async (): Promise<OAuthSession | null> => {
  const { client } = getOAuthClient();
  const restored = await client.initRestore(false);
  return restored?.session ?? null;
};

export const signInWithOAuth = async (
  loginHint: string
): Promise<OAuthSession> => {
  const { client, redirectUri } = getOAuthClient();
  const authorizeUrl = await client.authorize(loginHint, {
    redirect_uri: redirectUri,
  });
  const callbackUrl = await launchWebAuthFlow(authorizeUrl.toString());
  const callback = new URL(callbackUrl);

  const { session } = await client.callback(callback.searchParams, {
    redirect_uri: redirectUri,
  });

  return session;
};
