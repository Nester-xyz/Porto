import Login from "./components/login";
import { LogInProvider } from "./hooks/LogInContext";

const App = () => {
  return (
    <LogInProvider>
      <Login />
    </LogInProvider>
  );
};

export default App;
