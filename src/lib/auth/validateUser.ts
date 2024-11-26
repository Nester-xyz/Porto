import { AtpAgent, AtpSessionData, AtpSessionEvent } from "@atproto/api";

export const ValidateUser = async (
  loggedIn: boolean,
): Promise<{
  loggedInSuccess: boolean;
  agent: AtpAgent;
}> => {
  let loggedInSuccess = loggedIn;
  let agentInstance: AtpAgent;

  const result = await new Promise<{ loggedInSuccess: boolean }>((resolve) => {
    agentInstance = new AtpAgent({
      service: "https://bsky.social",
      persistSession: (_: AtpSessionEvent, sess?: AtpSessionData) => {
        // console.log(sess);
        if (!sess) return;
        // Store session data
        localStorage.setItem("handle", sess.handle);
        localStorage.setItem("accessJWT", sess.accessJwt);
        localStorage.setItem("refreshJWT", sess.refreshJwt);
        localStorage.setItem("did", sess.did);
        loggedInSuccess = true;
        resolve({
          loggedInSuccess: true,
        });
      },
    });

    // If persistSession doesn't fire within a reasonable time
    setTimeout(() => {
      resolve({
        loggedInSuccess: false,
      });
    }, 1000);
  });

  return {
    ...result,
    agent: agentInstance!,
  };
};
