import React, { useState } from "react";
import { Router } from "@reach/router";
import Home from "./components/home.tsx";
import About from "./components/about.tsx";
import Citizen from "./components/citizen.tsx";

const FirstInteraction = ({ children = null }) => {
  const [clicked, setClicked] = useState(false);
  return clicked ? (
    children
  ) : (
    <button onClick={() => setClicked(true)}>Start</button>
  );
};

const HomeAfterInteraction = ({ ...props }) => (
  <FirstInteraction>
    <Home {...props}></Home>
  </FirstInteraction>
);

export default () => (
  <div id="app">
    <Router>
      <HomeAfterInteraction path="/" />
      <About path="/about" />
      <Citizen path="/:id" />
    </Router>
  </div>
);
