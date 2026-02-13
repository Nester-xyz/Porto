import { Agent } from "@atproto/api";
import { OAuthSession } from "@atproto/oauth-client-browser";

export class RateLimitedAgent {
  public agent: Agent;
  private waitingForRateLimit: boolean = false;
  private oauthSession: OAuthSession;

  constructor(agent: Agent, oauthSession: OAuthSession) {
    this.agent = agent;
    this.oauthSession = oauthSession;
  }

  private async handleRateLimit(error: any): Promise<void> {
    if (error.status === 429) {
      this.waitingForRateLimit = true;
      const resetTime = new Date(
        Number(error.headers["ratelimit-reset"]) * 1000
      );
      const waitTime = resetTime.getTime() - Date.now();

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.waitingForRateLimit = false;
    } else {
      throw error;
    }
  }

  async call<T>(method: () => Promise<T>): Promise<T> {
    let attempts = 0;
    while (true) {
      try {
        if (this.waitingForRateLimit) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        return await method();
      } catch (error: any) {
        if (++attempts > 5) {
          throw error;
        }
        if (error.message.includes("fetch failed")) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        if (error.status === 429) {
          await this.handleRateLimit(error);
        } else {
          throw error;
        }
      }
    }
  }

  async uploadBlob(...args: Parameters<typeof Agent.prototype.uploadBlob>) {
    return this.call(() => this.agent.uploadBlob(...args));
  }

  async post(...args: Parameters<typeof Agent.prototype.post>) {
    return this.call(() => this.agent.post(...args));
  }

  get com() {
    return this.agent.com;
  }

  async getServiceAuth(
    ...args: Parameters<typeof Agent.prototype.com.atproto.server.getServiceAuth>
  ) {
    return this.call(() =>
      this.agent.com.atproto.server.getServiceAuth(...args)
    );
  }

  get session() {
    return { did: this.oauthSession.did };
  }

  get did() {
    return this.oauthSession.did;
  }

  async getPdsHost() {
    // Prefer the active OAuth token audience when possible, but fall back to
    // the authoritative DID doc returned by getSession().
    try {
      const { aud } = await this.oauthSession.getTokenInfo(false);
      if (typeof aud === "string" && aud.length > 0) {
        if (aud.startsWith("did:web:")) {
          return aud.replace(/^did:web:/, "");
        }
        return new URL(aud).host;
      }
    } catch {
      // Ignore and fall back to DID doc lookup below.
    }

    const { data } = await this.agent.com.atproto.server.getSession({});
    const pdsService = data.didDoc?.service?.find(
      (service) => service.type === "AtprotoPersonalDataServer"
    );
    if (!pdsService?.serviceEndpoint) {
      throw new Error("Unable to determine PDS host from DID document");
    }
    return new URL(pdsService.serviceEndpoint).host;
  }

  async signOut() {
    await this.oauthSession.signOut();
  }
}
