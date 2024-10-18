import React, { useEffect } from "react";
import "./popup.css";

const App = () => {
  const [response, setResponse] = React.useState("");

  const handleClick = () => {
    chrome.runtime.sendMessage({ action: "sayHello" }, (res) => {
      setResponse(res.response);
    });
  };
  return (
    <div>
      <button> Login </button>
      <h1>Popup Page</h1>
      <button onClick={handleClick}>Send Message to Background</button>
      <p>{response}</p>
    </div>
  );
};

export default App;
