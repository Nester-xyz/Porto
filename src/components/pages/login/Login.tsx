import { useState } from "react";
import LoginForm from "./loginForm";
import { useLogInContext } from "@/hooks/LogInContext";
import Home from "../Home/home";

const Login = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { agent, loggedIn, setLoggedIn } = useLogInContext();

  const handleLogin = (userName: string, password: string) => {
    if (!agent) throw new Error("No agent found");
    setIsLoading(true);
    agent
      .login({
        identifier: userName,
        password: password,
      })
      .then((user) => {
        if (user.success) {
          setLoggedIn(user.success);
          console.info("User Logged in with", userName);
        }
      })
      .catch((error) => {
        console.error(
          "Error logging in:",
          error,
          "when trying to log in with",
          userName,
        );
        setError("Invalid username or password");
        setIsLoading(false);
      });
  };

  if (loggedIn) return <Home />;

  return (
    <LoginForm onLogin={handleLogin} error={error} isLoading={isLoading} />
  );
};

export default Login;
