import Login from "./components/pages/login/Login";
import { LogInProvider } from "./hooks/LogInContext";

const App = () => {
  return (
    <LogInProvider>
      <Login />
    </LogInProvider>
  );
};

export default App;
