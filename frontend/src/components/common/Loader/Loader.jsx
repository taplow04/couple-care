import "./Loader.css";

const Loader = ({ fullScreen = false, text = "Loading your love story..." }) => {
  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader-heart-pulse">
          <span role="img" aria-label="heart">♥</span>
        </div>
        <p className="loader-fullscreen-text">{text}</p>
      </div>
    );
  }

  return (
    <div className="loader-dots" role="status" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
};

export default Loader;
