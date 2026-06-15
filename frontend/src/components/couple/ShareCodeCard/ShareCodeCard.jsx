import { useState } from "react";
import "./ShareCodeCard.css";

const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const ShareCodeCard = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on CoupleCare 💕",
          text: `Use my pair code ${code} to connect with me on CoupleCare!`,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }
    handleCopy();
  };

  return (
    <div className="share-code-card">
      <button
        className={`share-code-card__btn share-code-card__btn--copy ${copied ? "share-code-card__btn--copied" : ""}`}
        onClick={handleCopy}
      >
        <CopyIcon />
        {copied ? "Copied!" : "Copy Code"}
      </button>

      <button className="share-code-card__btn share-code-card__btn--share" onClick={handleShare}>
        <ShareIcon />
        Share
      </button>
    </div>
  );
};

export default ShareCodeCard;
