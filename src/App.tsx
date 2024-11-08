import Login from "./components/login";
import Home from "./components/pages/Home/home";
import Render1 from "./components/pages/Home/render1";
import { LogInProvider } from "./hooks/LogInContext";

const App = () => {
  const onAnalysisComplete = (data: {
    totalTweets: number;
    validTweets: number;
    tweetsLocation: string;
    mediaLocation: string;
  }) => {};

  // return <Render1 onAnalysisComplete={onAnalysisComplete} />;

  return (
    <LogInProvider>
      <Login />
    </LogInProvider>
  );
};

export default App;
