import { Dispatch, SetStateAction } from "react";
import { RateLimitedAgent } from "../lib/rateLimit/RateLimitedAgent";

type Tlogin = ({
  agent,
  identifier,
  password,
}: {
  agent: RateLimitedAgent;
  identifier: string;
  password: string;
}) => void;

export interface LogInContextType {
  loggedIn: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  signOut: () => void;
  agent: RateLimitedAgent | null;
}
