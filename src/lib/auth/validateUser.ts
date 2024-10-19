import { AtpAgent, AtpSessionData, AtpSessionEvent } from "@atproto/api";

export const ValidateUser = async (agent: AtpAgent | null) => {
  let loggedInSuccess = false;
  let returnableAgent = agent;
  if (!agent) {
    const agentInstance = new AtpAgent({
      service: "https://bsky.social",
      persistSession: (_: AtpSessionEvent, sess?: AtpSessionData) => {
        if (!sess) return;

        // Store session data
        localStorage.setItem("handle", sess.handle);
        localStorage.setItem("accessJWT", sess.accessJwt);
        localStorage.setItem("refreshJWT", sess.refreshJwt);
        localStorage.setItem("did", sess.did);

        loggedInSuccess = true;
      },
    });

    returnableAgent = agentInstance;
  }

  return {
    loggedInSuccess,
    agent: returnableAgent,
  };
};
