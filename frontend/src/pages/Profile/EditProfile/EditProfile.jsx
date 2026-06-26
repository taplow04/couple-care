import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { updateProfile } from "../../../services/users.service";
import ImageUploader from "../../../components/profile/ImageUploader/ImageUploader";
import ProfileForm from "../../../components/profile/ProfileForm/ProfileForm";
import BackHeader from "../../../components/common/BackHeader/BackHeader";
import "./EditProfile.css";

const validate = (values) => {
  const errors = {};
  if (!values.name.trim()) {
    errors.name = "Name is required.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (values.name.trim().length > 60) {
    errors.name = "Name must be 60 characters or less.";
  }
  return errors;
};

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "",
    hobbies: user?.hobbies || [],
    likes: user?.likes || [],
    dislikes: user?.dislikes || [],
    profilePhoto: user?.profilePhoto || "",
    // <input type="date"> wants YYYY-MM-DD.
    birthday: user?.birthday ? user.birthday.split("T")[0] : "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const handlePhotoUpload = useCallback((url) => {
    setForm((f) => ({ ...f, profilePhoto: url }));
    setUploadError("");
  }, []);

  const handleSave = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      const res = await updateProfile(form);
      updateUser(res.data);
      setSaved(true);
      setTimeout(() => {
        navigate("/profile");
      }, 900);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Could not save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile">
      <BackHeader title="Edit Profile" fallback="/profile" />

      {/* ── Avatar hero ── */}
      <div className="edit-profile__hero">
        <ImageUploader
          currentUrl={form.profilePhoto}
          name={form.name}
          onUploadComplete={handlePhotoUpload}
          onError={setUploadError}
        />

        <p className="edit-profile__hero-sub">
          {uploadError || "Update your info to personalize your experience"}
        </p>
      </div>

      {/* ── Form body ── */}
      <div className="edit-profile__body">
        <ProfileForm
          values={form}
          onChange={setForm}
          errors={errors}
        />

        {saveError && (
          <p className="edit-profile__save-err" role="alert">{saveError}</p>
        )}

        {/* Save button */}
        <button
          className={`edit-profile__save-btn ${saved ? "edit-profile__save-btn--saved" : ""}`}
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saved ? (
            <>
              <CheckIcon />
              Saved!
            </>
          ) : saving ? (
            <span className="edit-profile__spinner" />
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
};

export default EditProfile;
