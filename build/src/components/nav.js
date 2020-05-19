import React, {useRef} from "react";
import {navigate} from "@reach/router";
import Type from "/src/components/type.tsx";
import eindhovenLogoString from "/src/assets/eindhoven-logo.txt";
import citizens from "/src/components/createCitizens.tsx";
export const augmentedString = eindhovenLogoString.split("").map((letter, index) => ({
  letter,
  citizen: Object.values(citizens.nl)[index % Object.keys(citizens.nl).length]
})).map(({letter, citizen}) => letter !== " " ? `<a href="${citizen.id}">${letter}</a>` : letter).join("");
export default () => {
  const container = useRef();
  return React.createElement("div", {
    ref: container,
    className: "pre-container"
  }, React.createElement(Type, {
    string: augmentedString,
    offset: 300,
    onUpdate: () => {
      container.current.querySelectorAll("a").forEach((anchor) => anchor.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(anchor.href);
      }));
    }
  }));
};
