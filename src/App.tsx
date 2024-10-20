import { LogInProvider } from "./hooks/LogInContext";
import Login from "./components/login";

const App = () => {
  return (
    <LogInProvider>
      <Login />
    </LogInProvider>
  );
};

export default App;
