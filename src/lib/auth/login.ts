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
  } catch (error) {}
};
