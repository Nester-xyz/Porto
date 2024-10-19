import { useState } from "react";
import Login from "./components/login";
import { LogInProvider } from "./hooks/LogInContext";

const App = () => {
  return (
    <div>
      <Login />
    </div>
  );
};

export default App;
