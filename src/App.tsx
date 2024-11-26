import Login from "./components/pages/login/Login";
import { LogInProvider } from "./hooks/LogInContext";

const App: React.FC = () => {
  return (
    <LogInProvider>
      <Login />
    </LogInProvider>
  );
};

export default App;
