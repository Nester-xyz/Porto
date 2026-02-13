import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Agent } from "@atproto/api";
import { OAuthSession } from "@atproto/oauth-client-browser";
import { LogInContextType } from "../types/login.type";
import { RateLimitedAgent } from "@/lib/rateLimit/RateLimitedAgent";
import {
  OAUTH_LAST_SUB_STORAGE_KEY,
  restoreOAuthSession,
  signInWithOAuth,
} from "@/lib/auth/oauth";

const syncAccountSnapshot = async (agent: Agent) => {
  const { data } = await agent.com.atproto.server.getSession({});
  localStorage.setItem("handle", data.handle);
  localStorage.setItem("did", data.did);
  localStorage.setItem("emailConfirmed", String(Boolean(data.emailConfirmed)));
};

const buildRateLimitedAgent = async (
  oauthSession: OAuthSession
): Promise<RateLimitedAgent> => {
  const baseAgent = new Agent(oauthSession);
  try {
    await syncAccountSnapshot(baseAgent);
  } catch (error) {
    console.warn(
      "Unable to sync account snapshot, continuing with active OAuth session:",
      error
    );
  }
  return new RateLimitedAgent(baseAgent, oauthSession);
};

export const LogInContext = createContext<LogInContextType>({
  loggedIn: false,
  isLoading: true,
  setLoggedIn: () => {},
  signIn: async () => {},
  signOut: async () => {},
  agent: null,
});

export const LogInProvider = ({ children }: { children: React.ReactNode }) => {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [agent, setAgent] = useState<RateLimitedAgent | null>(null);

  const hydrateSession = useCallback(async (oauthSession: OAuthSession) => {
    const rateLimitedAgent = await buildRateLimitedAgent(oauthSession);
    setAgent(rateLimitedAgent);
    setLoggedIn(true);
  }, []);

  const signIn = useCallback(
    async (identifier: string) => {
      setIsLoading(true);
      try {
        const oauthSession = await signInWithOAuth(identifier);
        await hydrateSession(oauthSession);
      } finally {
        setIsLoading(false);
      }
    },
    [hydrateSession]
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      if (agent) {
        await agent.signOut();
      }
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      localStorage.removeItem("handle");
      localStorage.removeItem("did");
      localStorage.removeItem("emailConfirmed");
      localStorage.removeItem(OAUTH_LAST_SUB_STORAGE_KEY);
      setLoggedIn(false);
      setAgent(null);
      setIsLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      setIsLoading(true);
      try {
        const oauthSession = await restoreOAuthSession();
        if (!oauthSession) {
          if (active) {
            setLoggedIn(false);
            setAgent(null);
          }
          return;
        }

        if (!active) return;
        await hydrateSession(oauthSession);
      } catch (error) {
        console.error("OAuth restore failed:", error);
        if (active) {
          setLoggedIn(false);
          setAgent(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, [hydrateSession]);

  return (
    <LogInContext.Provider
      value={{ loggedIn, isLoading, signIn, signOut, agent, setLoggedIn }}
    >
      {children}
    </LogInContext.Provider>
  );
};

export const useLogInContext = () => {
  const context = useContext(LogInContext);
  if (!context) {
    throw new Error("useLogInContext must be used within a LogInProvider");
  }
  return context;
};
