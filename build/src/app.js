import React, {useState} from "react";
import {Router} from "@reach/router";
import Home from "./../../src/components/home.tsx";
import About from "./../../src/components/about.tsx";
import Citizen from "./../../src/components/citizen.tsx";
const FirstInteraction = ({children = null}) => {
  const [clicked, setClicked] = useState(false);
  return clicked ? children : React.createElement("button", {
    onClick: () => setClicked(true)
  }, "Start");
};
const HomeAfterInteraction = ({...props}) => React.createElement(FirstInteraction, null, React.createElement(Home, {
  ...props
}));
export default () => React.createElement("div", {
  id: "app"
}, React.createElement(Router, null, React.createElement(HomeAfterInteraction, {
  path: "/"
}), React.createElement(About, {
  path: "/about"
}), React.createElement(Citizen, {
  path: "/:id"
})));
