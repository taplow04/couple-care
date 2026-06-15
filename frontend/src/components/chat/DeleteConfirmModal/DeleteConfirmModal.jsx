import "./DeleteConfirmModal.css";

const DeleteConfirmModal = ({ message, onConfirm, onCancel }) => {
  const preview = message.text.length > 80
    ? message.text.slice(0, 80) + "…"
    : message.text;

  return (
    <div className="del-modal-overlay" onClick={onCancel}>
      <div className="del-modal" onClick={(e) => e.stopPropagation()}>
        <div className="del-modal__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <p className="del-modal__title">Delete message?</p>
        <p className="del-modal__preview">"{preview}"</p>
        <p className="del-modal__note">This will be removed for everyone.</p>
        <div className="del-modal__actions">
          <button className="del-modal__btn del-modal__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="del-modal__btn del-modal__btn--confirm" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
