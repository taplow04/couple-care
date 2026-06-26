import { useEffect, useState } from "react";

import MomentViewer from "../MomentViewer/MomentViewer";
import { getProfileMoments } from "../../../services/moments.service";
import "./ProfileMoments.css";

/**
 * A profile grid of a person's Moments (Feature 17). Self-contained: it fetches
 * its own data and renders NOTHING when there are no moments, so it is safe to
 * drop into the Personal Profile (ownerId="me") or Partner Profile (partner id)
 * without disturbing the page. Tapping a tile plays the set (read-only).
 */
const ProfileMoments = ({ ownerId = "me", title = "Moments" }) => {
  const [moments, setMoments] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    let active = true;
    getProfileMoments(ownerId)
      .then((res) => {
        if (active) setMoments(res.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ownerId]);

  if (moments.length === 0) return null;

  return (
    <div className="profile-moments">
      <h3 className="profile-moments__title">{title}</h3>
      <div className="profile-moments__grid">
        {moments.map((m, i) => (
          <button
            key={m._id}
            type="button"
            className="profile-moments__tile"
            onClick={() => setViewerIndex(i)}
          >
            {m.type === "voice" ? (
              <span className="profile-moments__voice">🎤</span>
            ) : (
              <img src={m.thumbnailUrl || m.mediaUrl} alt={m.caption || "Moment"} />
            )}
            {m.type === "video" && <span className="profile-moments__play">▶</span>}
          </button>
        ))}
      </div>

      {viewerIndex !== null && (
        <MomentViewer
          moments={moments}
          startIndex={viewerIndex}
          isOwn={false}
          readOnly
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};

export default ProfileMoments;
