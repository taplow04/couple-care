import { useEffect, useState } from "react";
import { getTodaySurprise, openSurprise } from "../../../services/surprise.service";
import "./SurpriseBox.css";

const REWARD_META = {
  date_idea: { label: "Date Idea", emoji: "💑" },
  love_quote: { label: "Love Quote", emoji: "💬" },
  conversation_starter: { label: "Conversation Starter", emoji: "🗨️" },
  relationship_tip: { label: "Relationship Tip", emoji: "💡" },
  challenge: { label: "Couple Challenge", emoji: "🎯" },
  memory_prompt: { label: "Memory Prompt", emoji: "📸" },
  bucket_idea: { label: "Bucket List Idea", emoji: "🪣" },
  compliment: { label: "Compliment", emoji: "🌹" },
  mood_booster: { label: "Mood Booster", emoji: "☀️" },
  encouragement: { label: "Daily Encouragement", emoji: "✨" },
};

const SurpriseBox = () => {
  const [status, setStatus] = useState("loading"); // loading | unopened | opening | opened
  const [reward, setReward] = useState(null);

  useEffect(() => {
    let alive = true;
    getTodaySurprise()
      .then((res) => {
        if (!alive) return;
        if (res.data?.opened) {
          setReward({ rewardType: res.data.rewardType, content: res.data.content });
          setStatus("opened");
        } else {
          setStatus("unopened");
        }
      })
      .catch(() => alive && setStatus("unopened"));
    return () => {
      alive = false;
    };
  }, []);

  const handleOpen = async () => {
    if (status !== "unopened") return;
    setStatus("opening");
    try {
      const res = await openSurprise();
      setReward({ rewardType: res.data.rewardType, content: res.data.content });
      // Let the burst animation play before revealing.
      setTimeout(() => setStatus("opened"), 850);
    } catch {
      setStatus("unopened");
    }
  };

  if (status === "loading") {
    return <div className="surprise surprise--skeleton" />;
  }

  const meta = reward ? REWARD_META[reward.rewardType] || REWARD_META.encouragement : null;

  if (status === "opened") {
    return (
      <div className="surprise surprise--opened">
        <div className="surprise__reward-head">
          <span className="surprise__reward-emoji">{meta.emoji}</span>
          <div>
            <p className="surprise__reward-eyebrow">Today's Surprise</p>
            <h3 className="surprise__reward-label">{meta.label}</h3>
          </div>
        </div>
        <p className="surprise__reward-content">{reward.content}</p>
        <p className="surprise__come-back">Come back tomorrow for another 💝</p>
      </div>
    );
  }

  // unopened | opening
  return (
    <button
      className={`surprise surprise--gift ${status === "opening" ? "surprise--opening" : ""}`}
      onClick={handleOpen}
      disabled={status === "opening"}
    >
      <div className="surprise__sparkles" aria-hidden="true">
        <span>✨</span><span>💫</span><span>⭐</span><span>✨</span>
      </div>
      <span className="surprise__gift">🎁</span>
      <div className="surprise__gift-text">
        <h3 className="surprise__gift-title">Today's Surprise</h3>
        <p className="surprise__gift-sub">
          {status === "opening" ? "Unwrapping…" : "Tap to open your daily surprise"}
        </p>
      </div>
    </button>
  );
};

export default SurpriseBox;
