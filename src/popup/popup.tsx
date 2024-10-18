import React from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

const Popup = () => {
  const [response, setResponse] = React.useState("");

  const handleClick = () => {
    chrome.runtime.sendMessage({ action: "sayHello" }, (res) => {
      setResponse(res.response);
    });
  };

  return (
    <div>
      <h1>Popup Page</h1>
      <button onClick={handleClick}>Send Message to Background</button>
      <p>{response}</p>
    </div>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<Popup />);
} else {
  console.error("Root element not found");
}
