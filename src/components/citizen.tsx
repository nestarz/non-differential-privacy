import React, { useState, useMemo, useEffect } from "react";

import citizens from "./createCitizens.tsx";
import MapChart from "./MapChart.tsx";
import Nav from "./nav.tsx";
import Profile from "./profile.tsx";
import SpeechSynthesis from "react-speech-kit";

const Derouleur = ({ array }) =>
  array.map(([key, value]) => (
    <>
      <span key={key}>
        <span style={{ background: "yellow" }}>{key}</span>:
      </span>
      <span style={{ background: "yellow" }} key={key}>
        {JSON.stringify(value)}
      </span>
    </>
  ));

export default ({ id }) => {
  const { speak } = SpeechSynthesis.useSpeechSynthesis();
  const [lat, lng] = useMemo(
    () => [
      51.44083 + 0.03 * (0.5 - Math.random()),
      5.47778 + 0.03 * (0.5 - Math.random()),
    ],
    [id]
  );
  const [strokeWidth, setStrokeWidth] = useState(100);
  useEffect(() => {
    let start = true;
    setTimeout(function update(i = strokeWidth) {
      //console.log(strokeWidth);
      setStrokeWidth(i);
      if (start && i > 0.25) requestAnimationFrame(() => update(i - 2));
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
      voice: voices[Math.floor(Math.random() * voices.length)],
    });
  }, [id]);
  return (
    <div className="citizen">
      <div className="map">
        <MapChart
          strokeWidth={strokeWidth}
          name={citizen.personal.name}
          lat={lat}
          lng={lng}
        />
      </div>
      {strokeWidth < 2 && (
        <>
          <div className="citizen-content">
            <img src={citizen.avatar} />
            <pre>BSN Number: {citizen.uuid}</pre>
            <div className="pre">
              <Derouleur array={Object.entries(citizen.personal)}></Derouleur>
              {/* <Derouleur array={Object.entries(citizen.ratios)}></Derouleur>
              <Derouleur array={Object.entries(citizen.address)}></Derouleur> */}
            </div>
          </div>
          <div className="nav">
            <Nav></Nav>
          </div>
          <Profile id={id}></Profile>
          <div className="finger">
            <img src={citizen.finger} />
          </div>
        </>
      )}
    </div>
  );
};
