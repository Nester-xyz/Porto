import AtpAgent from "@atproto/api";
export class RateLimitedAgent {
  public agent: AtpAgent;
  private waitingForRateLimit: boolean = false;

  constructor(agent: AtpAgent) {
    this.agent = agent;
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

  async uploadBlob(...args: Parameters<typeof AtpAgent.prototype.uploadBlob>) {
    return this.call(() => this.agent.uploadBlob(...args));
  }

  async post(...args: Parameters<typeof AtpAgent.prototype.post>) {
    return this.call(() => this.agent.post(...args));
  }

  async login(...args: Parameters<typeof AtpAgent.prototype.login>) {
    return this.call(() => this.agent.login(...args));
  }

  get com() {
    return this.agent.com;
  }

  async getServiceAuth(
    ...args: Parameters<
      typeof AtpAgent.prototype.com.atproto.server.getServiceAuth
    >
  ) {
    return this.call(() =>
      this.agent.com.atproto.server.getServiceAuth(...args)
    );
  }

  get session() {
    return this.agent.session;
  }

  get dispatchUrl() {
    return this.agent.dispatchUrl;
  }
}
