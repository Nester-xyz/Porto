import React, { useEffect } from "react";
import AtProto from "./components/atproto";
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
      <h1>Popup Page</h1>
      <AtProto />
      <button onClick={handleClick} className="btn-primary">Send Message to Background</button>
      <p>{response}</p>
      
    </div>
  )
};

export default App;
