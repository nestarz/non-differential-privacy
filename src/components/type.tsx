import React, { useState, useEffect } from "react";

export default ({
  string,
  children,
  speed = 0,
  offset = 1,
  onUpdate = (trim) => null,
}) => {
  const [trim, setTrim] = useState("");
  useEffect(() => {
    setTimeout(function type(i = 0) {
      setTrim(string.slice(0, i));
      onUpdate(trim);
      if (i < string.length) setTimeout(() => type(i + offset), speed);
    });
  }, []);

  return (
    <>
      <pre dangerouslySetInnerHTML={{ __html: trim }}></pre>
      {string === trim && children}
    </>
  );
};