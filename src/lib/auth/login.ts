import AtpAgent from "@atproto/api";
type loginProps = {
  agent: AtpAgent;
  identifier: string;
  password: string;
};

export const login = async ({ agent, identifier, password }: loginProps) => {
  if (!agent) return;

  try {
    await agent.login({
      identifier,
      password,
    });
    console.log("successfully logged in");
  } catch (error) {
    console.log("Error logging in:", error);
  }
};
