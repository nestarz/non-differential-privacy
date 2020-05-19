import React, { useRef, useMemo } from "react";
import { navigate } from "@reach/router";

import Type from "./type.tsx";
import citizens from "./createCitizens.tsx";

import eindhovenLogoString from "../assets/eindhoven-logo.txt";

export const augmentedString = eindhovenLogoString
  .split("")
  .map((letter, index) => ({
    letter,
    citizen: Object.values(citizens.nl)[
      index % Object.keys(citizens.nl).length
    ],
  }))
  .map(({ letter, citizen }) =>
    letter !== " " ? `<a href="${citizen.id}">${letter}</a>` : letter
  )
  .join("");

export default () => {
  const container = useRef();
  return (
    <div ref={container} className="pre-container">
      <Type
        string={augmentedString}
        offset={300}
        onUpdate={() => {
          container.current.querySelectorAll("a").forEach((anchor) =>
            anchor.addEventListener("click", (e) => {
              e.preventDefault();
              navigate(anchor.href);
            })
          );
        }}
      ></Type>
    </div>
  );
};
