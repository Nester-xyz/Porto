import Login from "./components/pages/login/Login";
import { LogInProvider } from "./hooks/LogInContext";
import ThemeToggle from "./components/ThemeToggle";

const App: React.FC = () => {
  return (
    <LogInProvider>
      <div className="m-2 flex justify-end">
        <ThemeToggle />
      </div>
      <Login />
    </LogInProvider>
  );
};

export default App;
