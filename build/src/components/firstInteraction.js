import React, {useState} from "react";
export default ({children}) => {
  const [clicked, setClicked] = useState(false);
  return clicked ? children : React.createElement("button", {
    onClick: () => {
      document.body.requestFullscreen();
      setClicked(true);
    }
  }, "Start");
};
