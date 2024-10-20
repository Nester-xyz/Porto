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
  signOut: () => void;
  agent: AtpAgent | null;
}
