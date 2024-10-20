import { createContext, useContext, useEffect, useState } from "react";
import { ValidateUser } from "../lib/auth/validateUser";
import { LogInContextType } from "../types/login.type";

// Create context with a default value
export const LogInContext = createContext<LogInContextType>({
  loggedIn: false,
  setLoggedIn: () => { },
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
    console.log("logged in contet");
    let agentInstance;
    const validate = async () => {
      if (!agent) {
        // setLoggedIn(!loggedIn);
        console.log("validate init");
        agentInstance = await ValidateUser(loggedIn);
        setAgent(agentInstance.agent);
        console.log("agent instance vayo");
      }
    };
    validate();
    console.log(agentInstance);
  }, [agent]);

  return (
    <LogInContext.Provider value={{ loggedIn, signOut, agent, setLoggedIn }}>
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
