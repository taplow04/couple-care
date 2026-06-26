import { useEffect, useState } from "react";
import BackHeader from "../../components/common/BackHeader/BackHeader";
import PassportCard from "../../components/passport/PassportCard/PassportCard";
import { getPassport } from "../../services/profile.service";
import "./RelationshipPassport.css";

const RelationshipPassport = () => {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPassport()
      .then((res) => setPassport(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Couldn't load your passport."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rpass">
      <BackHeader title="Relationship Passport" fallback="/profile" />

      <div className="rpass__content">
        {loading ? (
          <p className="rpass__msg">Loading…</p>
        ) : error ? (
          <p className="rpass__msg">{error}</p>
        ) : (
          <PassportCard passport={passport} />
        )}
      </div>
    </div>
  );
};

export default RelationshipPassport;
