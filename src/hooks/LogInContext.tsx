import AtpAgent from "@atproto/api";
import { createContext, useContext, useEffect, useState } from "react";
import { ValidateUser } from "../lib/auth/validateUser";
import { login } from "../lib/auth/login";
import { LogInContextType } from "../types/login.type";

const [loggedIn, setLoggedIn] = useState<boolean>(false);
const [agent, setAgent] = useState<AtpAgent | undefined>(undefined);

const signOut = () => {};

export const LogInContext = createContext<LogInContextType>({
  loggedIn,
  login,
  signOut,
  agent,
});

export const LogInProvider = ({ children }: { children: React.ReactNode }) => {
  const validate = async () => {
    if (!agent) {
      const agentInstance = await ValidateUser(agent);
      setAgent(agentInstance.agent);
      setLoggedIn(agentInstance.loggedInSuccess);
    }
  };

  useEffect(() => {
    validate();
  }, []);

  return (
    <LogInContext.Provider value={{ loggedIn, login, signOut, agent }}>
      {children}
    </LogInContext.Provider>
  );
};

export const useLogInContext = () => {
  if (!LogInContext) {
    throw new Error("useLogInContext must be used within a LogInProvider");
  }
  return useContext(LogInContext);
};
