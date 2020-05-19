import React, {useState, useMemo, useEffect} from "react";
import citizens from "./../../../src/components/createCitizens.tsx";
import MapChart2 from "./../../../src/components/MapChart.tsx";
import Nav from "./../../../src/components/nav.tsx";
import Profile from "./../../../src/components/profile.tsx";
import SpeechSynthesis from "react-speech-kit";
const Derouleur = ({array}) => array.map(([key, value]) => React.createElement(React.Fragment, null, React.createElement("span", {
  key
}, React.createElement("span", {
  style: {
    background: "yellow"
  }
}, key), ":"), React.createElement("span", {
  style: {
    background: "yellow"
  },
  key
}, JSON.stringify(value))));
export default ({id}) => {
  const {speak} = SpeechSynthesis.useSpeechSynthesis();
  const [lat, lng] = useMemo(() => [51.44083 + 0.03 * (0.5 - Math.random()), 5.47778 + 0.03 * (0.5 - Math.random())], [id]);
  const [strokeWidth, setStrokeWidth] = useState(100);
  useEffect(() => {
    let start = true;
    setTimeout(function update(i = strokeWidth) {
      setStrokeWidth(i);
      if (start && i > 0.25)
        requestAnimationFrame(() => update(i - 2));
      else {
        start = false;
        requestAnimationFrame((t) => update(0.23 + 0.2 * Math.abs(Math.sin(t / 1000))));
      }
    });
  }, []);
  const citizen = citizens.nl[id] ?? Object.values(citizens.nl)[0];
  useEffect(() => {
    const voices = speechSynthesis.getVoices();
    speak({
      text: `Name: ${citizen.personal.name}`,
      voice: voices[Math.floor(Math.random() * voices.length)]
    });
  }, [id]);
  return React.createElement("div", {
    className: "citizen"
  }, React.createElement("div", {
    className: "map"
  }, React.createElement(MapChart2, {
    strokeWidth,
    name: citizen.personal.name,
    lat,
    lng
  })), strokeWidth < 2 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "citizen-content"
  }, React.createElement("img", {
    src: citizen.avatar
  }), React.createElement("pre", null, "BSN Number: ", citizen.uuid), React.createElement("div", {
    className: "pre"
  }, React.createElement(Derouleur, {
    array: Object.entries(citizen.personal)
  }))), React.createElement("div", {
    className: "nav"
  }, React.createElement(Nav, null)), React.createElement(Profile, {
    id
  }), React.createElement("div", {
    className: "finger"
  }, React.createElement("img", {
    src: citizen.finger
  }))));
};
