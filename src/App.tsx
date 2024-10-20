import { useState } from "react";
import Login from "./components/login";
import { LogInProvider } from "./hooks/LogInContext";
import Post from "./components/Post";

const App = () => {
  return (
    <div>
      <Post />
    </div>
  );
};

export default App;
