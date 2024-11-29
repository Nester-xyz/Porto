import { createContext, useContext, useEffect, useState } from "react";
import { ValidateUser } from "../lib/auth/validateUser";
import { LogInContextType } from "../types/login.type";
import { RateLimitedAgent } from "@/lib/rateLimit/RateLimitedAgent";

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
    const validate = async () => {
      if (!agent) {
        try {
          console.log("Validating user...");
          const { agent: baseAgent } = await ValidateUser(loggedIn);

          // Wrap the base agent with RateLimitedAgent
          const rateLimitedAgent = new RateLimitedAgent(baseAgent);

          setAgent(rateLimitedAgent);
        } catch (error) {
          console.error("Validation failed:", error);
          signOut();
        }
      }
    };

    validate();
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
