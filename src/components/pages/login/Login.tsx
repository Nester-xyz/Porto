import { useState } from "react";
import LoginForm from "./loginForm";
import { useLogInContext } from "@/hooks/LogInContext";
import Home from "../Home/home";

const Login = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const { agent, loggedIn, setLoggedIn } = useLogInContext();

  const handleLogin = async (userName: string, password: string) => {
    if (!agent) throw new Error("No agent found");
    setIsLoading(true);
    setError("");

    try {
      const user = await agent.login({
        identifier: userName,
        password: password,
        authFactorToken: verificationCode
      });

      if (user.success) {
        setLoggedIn(true);
        localStorage.setItem('emailConfirmed', String(user.data.emailConfirmed));
        console.info("User logged in successfully");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Check for the specific error message from Bluesky API
      if (error?.message?.includes("A sign in code has been sent") || 
          error?.cause?.message?.includes("A sign in code has been sent")) {
        setShowTwoFactor(true);
        setError("A sign-in code has been sent to your email. Please enter it below.");
      } else {
        setError("Invalid username or password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loggedIn) return <Home />;

  return (
    <LoginForm
      onLogin={handleLogin}
      error={error}
      isLoading={isLoading}
      showTwoFactor={showTwoFactor}
      verificationCode={verificationCode}
      onVerificationCodeChange={setVerificationCode}
    />
  );
};

export default Login;