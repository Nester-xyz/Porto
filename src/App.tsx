import Login from "./components/login";
import Home from "./components/pages/Home/home";
import { LogInProvider } from "./hooks/LogInContext";

const App = () => {
  return (
    <LogInProvider>
      <Login />
    </LogInProvider>
  );
};

export default App;
