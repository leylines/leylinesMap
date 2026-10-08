import globeGif from "../Styles/globe.gif";
import Styles from "./loader.scss";

export const Loader = () => {
  return (
    <div
      className={Styles.loaderUi}
      style={{
        backgroundColor: "#000000"
      }}
    >
      <img src={globeGif} />
    </div>
  );
};
