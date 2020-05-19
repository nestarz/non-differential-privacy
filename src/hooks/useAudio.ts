import { useEffect, useState } from "react";

export default (src) => {
  const [audio, setAudio] = useState();
  useEffect(() => {
    new Promise((resolve) => {
      const audio = new Audio(src);
      audio.addEventListener("canplaythrough", () => resolve(audio));
    }).then(setAudio);

    return () => audio && audio.pause();
  }, []);

  return audio;
};
