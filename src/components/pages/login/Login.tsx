import { useState } from "react";
import LoginForm from "./loginForm";
import { useLogInContext } from "@/hooks/LogInContext";
import Home from "../Home/home";

const Login = () => {
  const [error, setError] = useState("");
  const { loggedIn, isLoading, signIn } = useLogInContext();

  const handleLogin = async (identifier: string) => {
    setError("");

    try {
      await signIn(identifier);
    } catch (err) {
      const message = err instanceof Error ? err.message : "OAuth sign-in failed.";
      console.error("OAuth login error:", err);
      setError(message);
    }
  };

  if (loggedIn) return <Home />;

  return <LoginForm onLogin={handleLogin} error={error} isLoading={isLoading} />;
};

export default Login;
