import Login from "./components/login";
import Post from "./components/Post";
import { LogInProvider } from "./hooks/LogInContext";

const App = () => {
  return (
    <Post />
    // <LogInProvider>
    //   <Login />
    // </LogInProvider>
  );
};

export default App;
