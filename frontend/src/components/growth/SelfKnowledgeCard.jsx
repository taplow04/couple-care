import "./growth.css";

const LOVE_LANGUAGE_LABELS = {
  words_of_affirmation: "Words of Affirmation",
  quality_time: "Quality Time",
  acts_of_service: "Acts of Service",
  physical_touch: "Physical Touch",
  receiving_gifts: "Receiving Gifts",
};

const ATTACHMENT_LABELS = {
  secure: "Secure",
  anxious: "Anxious",
  avoidant: "Avoidant",
  fearful_avoidant: "Fearful-Avoidant",
};

/**
 * Two-tile self-knowledge card: love language + attachment style. Tapping a tile
 * launches the matching quiz (handled by the parent via onTakeQuiz(kind)).
 */
const SelfKnowledgeCard = ({ loveLanguage, attachmentStyle, onTakeQuiz }) => (
  <div className="gcard">
    <div className="gcard__head">
      <h3 className="gcard__title">🧭 Know Yourself</h3>
    </div>
    <div className="gself__grid">
      <div className="gself__tile">
        <div className="gself__emoji">💞</div>
        <div className="gself__name">Love Language</div>
        {loveLanguage ? (
          <div className="gself__value">{LOVE_LANGUAGE_LABELS[loveLanguage]}</div>
        ) : (
          <button className="gself__cta" onClick={() => onTakeQuiz("loveLanguage")}>
            Discover →
          </button>
        )}
        {loveLanguage && (
          <button className="gself__cta" onClick={() => onTakeQuiz("loveLanguage")}>
            Retake
          </button>
        )}
      </div>
      <div className="gself__tile">
        <div className="gself__emoji">🧷</div>
        <div className="gself__name">Attachment</div>
        {attachmentStyle ? (
          <div className="gself__value">{ATTACHMENT_LABELS[attachmentStyle]}</div>
        ) : (
          <button className="gself__cta" onClick={() => onTakeQuiz("attachment")}>
            Discover →
          </button>
        )}
        {attachmentStyle && (
          <button className="gself__cta" onClick={() => onTakeQuiz("attachment")}>
            Retake
          </button>
        )}
      </div>
    </div>
  </div>
);

export default SelfKnowledgeCard;
