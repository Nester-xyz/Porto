import { AtpAgent, AtpSessionEvent, AtpSessionData } from "@atproto/api";
import { useCallback, useEffect, useState } from "react";

const AtProto = () => {
  const [loggedInSuccess, setLoggedInSuccess] = useState<boolean>(false);
  const [agent, setAgent] = useState<AtpAgent | null>(null);

  // Initialize agent only once when component mounts
  useEffect(() => {
    if (!agent) {
      const agentInstance = new AtpAgent({
        service: "https://bsky.social",
        persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
          if (!sess) return;

          // Store session data
          localStorage.setItem("handle", sess.handle);
          localStorage.setItem("accessJWT", sess.accessJwt);
          localStorage.setItem("refreshJWT", sess.refreshJwt);
          localStorage.setItem("did", sess.did);

          setLoggedInSuccess(true);

          // Chrome storage update
        },
      });

      setAgent(agentInstance);
    }
  }, []); // Empty dependency array ensures this runs only once

  const login = async () => {
    if (!agent) return;

    try {
      await agent.login({
        identifier: "<your-identifier-here>",
        password: "<your-password>",
      });
      console.log("successfully logged in");
    } catch (error) {
      console.log("Error logging in:", error);
    }
  };

  const onPost = async () => {
    if (!agent) return;

    try {
      const did = localStorage.getItem("did");
      if (!did) {
        console.log("No DID found in localStorage");
        return;
      }
      const res3 = await agent.app.bsky.feed.post.create(
        { repo: did },
        {
          text: "Time travelling is fun right now!",
          createdAt: "1990-01-01T00:00:00.000Z",
        },
      );
      console.log("posted", res3);
    } catch (error) {
      console.log("error posting:", error);
    }
  };

  return (
    <div className="space-x-4 p-4">
      <button
        onClick={login}
        className="px-4 py-2 border border-black text-black bg-yellow-300 text-lg rounded"
        disabled={!agent}
      >
        Login
      </button>
      <button
        onClick={onPost}
        className="px-4 py-2 border border-black text-black bg-green-300 text-lg rounded"
        disabled={!agent || !loggedInSuccess}
      >
        Post
      </button>
    </div>
  );
};

export default AtProto;
