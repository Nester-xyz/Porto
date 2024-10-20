import { createContext, useContext, useEffect, useState } from "react";
import { ValidateUser } from "../lib/auth/validateUser";
import { LogInContextType } from "../types/login.type";

// Create context with a default value
export const LogInContext = createContext<LogInContextType>({
  loggedIn: false,
  signOut: () => { },
  agent: null,
});

export const LogInProvider = ({ children }: { children: React.ReactNode }) => {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [agent, setAgent] = useState<any>(null);

  const signOut = () => {
    // Add your signOut logic here
    setLoggedIn(false);
    setAgent(null);
  };

  useEffect(() => {
    const validate = async () => {
      if (!agent) {
        const agentInstance = await ValidateUser(agent);
        setAgent(agentInstance.agent);
        setLoggedIn(agentInstance.loggedInSuccess);
      }
    };
    validate();
  }, [agent]);

  return (
    <LogInContext.Provider value={{ loggedIn, signOut, agent }}>
      {children}
    </LogInContext.Provider>
  );
};

export const useLogInContext = () => {
  const context = useContext(LogInContext);
  if (!context) {
    throw new Error("useLogInContext must be used within a LogInProvider");
  }
  return context;
};
