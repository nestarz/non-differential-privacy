import React from "react";
import Type from "../components/type.tsx";
import aboutString from "../assets/description-150520.txt";

const texts = [
  `A candidate platform to host this tool was a <b>web</b> application, with displayed visualizations.
  Web because it's the most convenient platform to think of a real-time surveillance of 
    Internationals platform.`,
  ``,
  "",
  "",
  `A map to localize the Internationals in Eindhoven was found from the CBS archive and 
    used to place geo annotations on the map of possible position of the individual.`,
  `A basic radar chart has been added to represent the profile of the current individual, the revenue he might earn, his employment rate, 
      since when he is settled in Eindhoven, how much he is a "knowledge" person etc...`,
];

export default () => {
  return (
    <div className="about">
      <Type
        string={`

          Before the project...
























      `}
        speed={1}
        offset={2}
      >
        <img src="src/assets/screenshots/AC75-2621.jpeg"></img>
        <pre>
          {`Artist Donald Davis’ illustration of the Stanford torus, a futurist
           concept that inspired Elysium’s space station.  

           


            
            
            `}
        </pre>
        <img src="src/assets/screenshots/Bwaf9bo.jpg" />
        <pre>
          {`WoW Classic (7th November 2018) — 
          Graphics Settings: Classic Mode — Blizzard
          
          
          
          
          
          
          
          `}
        </pre>
        <div>
        <img src="src/assets/screenshots/Screenshot 2020-05-19 at 11.35.57.png" />
        <img src="src/assets/screenshots/Screenshot 2020-05-19 at 11.36.15.png" />
          </div>
        <Type string={aboutString} speed={1} offset={2}>
          <div className="screenshots">
            <img src={"src/assets/images/image34.jpg"} />
  <pre>{`thispersondoesnotexist.com`}</pre>
            <div>
              <img
                src="https://upload.wikimedia.org/wikipedia/fr/thumb/6/6b/Papers_Please_Logo.svg/1280px-Papers_Please_Logo.svg.png"
                style={{ width: "80%" }}
              />
              <img
                style={{ width: "80%" }}
                src="https://steamcdn-a.akamaihd.net/steam/apps/239030/ss_9a3659d39c5099e2e1689a83d90adb0c985bf7a0.1920x1080.jpg?t=1567111408"
              />
            </div>
          </div>
          <div className="fingers">
            {[...Array(14).keys()].map((i) => (
              <img src={`src/assets/fingers/finger${1 + i}.png`} />
            ))}
          </div>
          <div className="screenshots a">
            {[...Array(9).keys()].map((i) => (
              <div>
                {i === 1 && <pre>{`
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                













                `}</pre>}
                <img
                  src={`src/assets/screenshots/x${i}.${
                    i === 0 ? "gif" : "png"
                  }`}
                />
                {texts[i] && (
                  <div
                    className="text"
                    dangerouslySetInnerHTML={{ __html: texts[i] }}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <video
            controls
            src="video-src/NonDifferentialPrivacy-170520.mp4"
          ></video>
        </Type>
      </Type>
    </div>
  );
};
