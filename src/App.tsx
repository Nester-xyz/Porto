import Login from "./components/pages/login/Login";
import { LogInProvider } from "./hooks/LogInContext";
import ThemeToggle from "./components/ThemeToggle";

const App: React.FC = () => {
  return (
    <LogInProvider>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Login />
    </LogInProvider>
  );
};

export default App;
