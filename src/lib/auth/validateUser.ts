import { AtpAgent, AtpSessionData, AtpSessionEvent } from "@atproto/api";

interface ValidateUserResult {
  loggedInSuccess: boolean;
  agent: AtpAgent;
  error?: string;
}

/**
 * Validates and manages Bluesky user authentication
 * @param agent - Optional existing ATP agent instance
 * @returns Object containing login status and agent instance
 */
export const ValidateUser = async (agent: AtpAgent | null, loggedInSuccess: boolean): Promise<ValidateUserResult> => {
  try {
    // If agent already exists, validate it's properly initialized
    if (agent) {
      if (!agent.service) {
        throw new Error("Invalid agent: missing service URL");
      }
      return {
        loggedInSuccess,
        agent
      };
    }

    // Get stored session data
    const storedHandle = localStorage.getItem("handle");
    const storedAccessJWT = localStorage.getItem("accessJWT");
    const storedRefreshJWT = localStorage.getItem("refreshJWT");
    const storedDid = localStorage.getItem("did");

    // Create new agent instance
    const agentInstance = new AtpAgent({
      service: "https://bsky.social",
      persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {

        console.log(sess);
        if (!sess) {
          // Clear stored session data if session is null
          localStorage.removeItem("handle");
          localStorage.removeItem("accessJWT");
          localStorage.removeItem("refreshJWT");
          localStorage.removeItem("did");
          return;
        }

        try {
          // Validate session data
          if (!sess.handle || !sess.accessJwt || !sess.refreshJwt || !sess.did) {
            throw new Error("Invalid session data received");
          }

          // Store session data
          localStorage.setItem("handle", sess.handle);
          localStorage.setItem("accessJWT", sess.accessJwt);
          localStorage.setItem("refreshJWT", sess.refreshJwt);
          localStorage.setItem("did", sess.did);
        } catch (error) {
          console.error("Error persisting session:", error);
          throw error;
        }
      },
    });



    return {
      loggedInSuccess: Boolean(agentInstance.session),
      agent: agentInstance,
    };

  } catch (error) {
    console.error("ValidateUser error:", error);
    return {
      loggedInSuccess: false,
      agent: new AtpAgent({ service: "https://bsky.social" }),
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};


