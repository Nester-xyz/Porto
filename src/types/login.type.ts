import { AtpAgent } from "@atproto/api";

type Tlogin = ({
  agent,
  identifier,
  password,
}: {
  agent: AtpAgent;
  identifier: string;
  password: string;
}) => void;

export interface LogInContextType {
  loggedIn: boolean;
  login: Tlogin;
  signOut: () => void;
  agent: AtpAgent | undefined;
}
