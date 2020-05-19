import React from "react";
import ReactDOM from "react-dom";
import App from "./app.tsx";

ReactDOM.render(
  React.createElement(App),
  document.body.appendChild(document.createElement("div"))
);
