import { useState } from "react";
import Login from "./components/login";

const App = () => {
  const [response, setResponse] = useState("");

  const handleClick = () => {
    chrome.runtime.sendMessage({ action: "sayHello" }, (res) => {
      setResponse(res.response);
    });
  };
  return (
    <div>
      <h1>Popup Page</h1>
      <Login />
      <button onClick={handleClick} className="bg-red-300">
        Send Message to Background
      </button>
      <p>{response}</p>
    </div>
  );
};

export default App;
