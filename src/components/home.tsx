import React, { useRef, useEffect, useState } from "react";
import { navigate } from "@reach/router";
import Type from "/src/components/type.tsx";
import { augmentedString } from "/src/components/nav.tsx";
import useAudio from "/src/hooks/useAudio.ts";

export default () => {
  const audio = useAudio("/src/assets/sounds/startup-sound.mp3");

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (audio) {
      audio.play();
      setTimeout(() => setReady(true), 500);
    }
  }, [audio]);

  const container = useRef();
  return ready ? (
    <div ref={container} className="pre-container">
      <Type
        string={augmentedString}
        offset={300}
        onUpdate={() => {
          container.current &&
            container.current.querySelectorAll("a").forEach((anchor) =>
              anchor.addEventListener("click", (e) => {
                e.preventDefault();
                navigate(anchor.href);
              })
            );
        }}
      >
        <div className="main">
          <Type
            string={`
  Eindhoven 
      Internationals 
    Study

                  Non-Differential Privacy


    Project Design 
            Academy 
              Eindhoven
`}
            speed={22.5}
          ></Type>
        </div>
      </Type>
    </div>
  ) : (
    <></>
  );
};
