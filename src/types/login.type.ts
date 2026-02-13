import { Dispatch, SetStateAction } from "react";
import { RateLimitedAgent } from "../lib/rateLimit/RateLimitedAgent";

export interface LogInContextType {
  loggedIn: boolean;
  isLoading: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  signIn: (identifier: string) => Promise<void>;
  signOut: () => Promise<void>;
  agent: RateLimitedAgent | null;
}
