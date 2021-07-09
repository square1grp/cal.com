import {useEffect, useState} from "react";

const Theme = (theme?: string) => {
  const [isReady, setIsReady] = useState(false);
  useEffect( () => {
    if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add(theme);
    }
    setIsReady(true);
  }, []);

  return {
    isReady
  }
};

export default Theme;
