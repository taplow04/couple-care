import "./AIReport.css";

const SECTIONS = ["Strengths", "Opportunities", "Suggestions"];
const SECTION_META = {
  Strengths: { icon: "💪", tone: "success" },
  Opportunities: { icon: "🌱", tone: "warning" },
  Suggestions: { icon: "💡", tone: "primary" },
};

// Parse the model's "Strengths / Opportunities / Suggestions + bullets" output
// into structured sections. Returns null if it doesn't match (caller falls
// back to plain text so nothing ever breaks).
const parseReport = (text) => {
  if (!text || typeof text !== "string") return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const cleaned = line.replace(/^[#*\->\s]+/, "").replace(/:$/, "").trim();
    const header = SECTIONS.find((s) => s.toLowerCase() === cleaned.toLowerCase());

    if (header) {
      current = { title: header, items: [] };
      sections.push(current);
      continue;
    }

    const bullet = line.replace(/^[•\-*]+\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
    if (current && bullet) current.items.push(bullet);
  }

  const valid = sections.filter((s) => s.items.length > 0);
  return valid.length ? valid : null;
};

const AIReport = ({ text }) => {
  const sections = parseReport(text);

  // Graceful fallback: render the original text if it isn't in the expected
  // structured format.
  if (!sections) {
    return <p className="ai-report__raw">{text}</p>;
  }

  return (
    <div className="ai-report">
      {sections.map((section) => {
        const meta = SECTION_META[section.title] || { icon: "•", tone: "primary" };
        return (
          <div key={section.title} className={`ai-report__section ai-report__section--${meta.tone}`}>
            <p className="ai-report__heading">
              <span className="ai-report__icon">{meta.icon}</span>
              {section.title}
            </p>
            <ul className="ai-report__list">
              {section.items.map((item, i) => (
                <li key={i} className="ai-report__item">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default AIReport;
