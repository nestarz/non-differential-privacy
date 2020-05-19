import React, {useRef, useEffect, useState} from "react";
import {navigate} from "@reach/router";
import Type from "./../../../src/components/type.tsx";
import {augmentedString} from "./../../../src/components/nav.tsx";
import useAudio2 from "./../../../src/hooks/useAudio.ts";
export default () => {
  const audio = useAudio2("src/assets/sounds/startup-sound.mp3");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (audio) {
      audio.play();
      setTimeout(() => setReady(true), 500);
    }
  }, [audio]);
  const container = useRef();
  return ready ? React.createElement("div", {
    ref: container,
    className: "pre-container"
  }, React.createElement(Type, {
    string: augmentedString,
    offset: 300,
    onUpdate: () => {
      container.current && container.current.querySelectorAll("a").forEach((anchor) => anchor.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(anchor.href);
      }));
    }
  }, React.createElement("div", {
    className: "main"
  }, React.createElement(Type, {
    string: `
  Eindhoven 
      Internationals 
    Study

                  Non-Differential Privacy


    Project Design 
            Academy 
              Eindhoven
`,
    speed: 22.5
  })))) : React.createElement(React.Fragment, null);
};
