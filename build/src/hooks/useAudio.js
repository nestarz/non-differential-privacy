import {useEffect, useState} from "react";
export default (src) => {
  const [audio, setAudio] = useState();
  useEffect(() => {
    new Promise((resolve) => {
      const audio2 = new Audio(src);
      audio2.addEventListener("canplaythrough", () => resolve(audio2));
    }).then(setAudio);
    return () => audio && audio.pause();
  }, []);
  return audio;
};
