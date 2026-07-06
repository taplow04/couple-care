import BackHeader from "../../../components/common/BackHeader/BackHeader";
import MaturityInsights from "../../../components/intelligence/MaturityInsights";
import "./MaturityPage.css";

/**
 * Relationship Maturity dashboard (route /maturity) — reachable in EVERY
 * lifecycle stage (preparing / growing / healing): the engine simply scores
 * whatever behaviour is observable for the user's situation.
 */
const MaturityPage = () => (
  <div className="maturity-page">
    <BackHeader
      title="Relationship Maturity"
      subtitle="A living picture of how you show up"
      fallback="/dashboard"
    />
    <div className="maturity-page__content">
      <MaturityInsights />
    </div>
  </div>
);

export default MaturityPage;
