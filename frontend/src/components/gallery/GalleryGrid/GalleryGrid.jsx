import "./GalleryGrid.css";

/**
 * Responsive square-thumbnail grid for gallery items. Photos show the image;
 * videos show a poster frame with a ▶ badge. Tapping an item calls onOpen.
 * An optional leading "add" tile is rendered when onAddClick is provided.
 */
const GalleryGrid = ({ items = [], onOpen, onAddClick, addBusy = false, addProgress = 0, emptyLabel }) => {
  const hasItems = items.length > 0;

  return (
    <div className="gg">
      {onAddClick && (
        <button className="gg__tile gg__add" onClick={onAddClick} disabled={addBusy} aria-label="Add photo or video">
          {addBusy ? (
            <span className="gg__progress">{addProgress}%</span>
          ) : (
            <>
              <span className="gg__add-plus">＋</span>
              <span className="gg__add-label">Add</span>
            </>
          )}
        </button>
      )}

      {items.map((item) => (
        <button
          key={item._id}
          className="gg__tile"
          onClick={() => onOpen?.(item)}
          aria-label={item.caption || (item.type === "video" ? "video" : "photo")}
        >
          {item.type === "video" ? (
            <>
              <video className="gg__media" src={item.url} muted playsInline preload="metadata" />
              <span className="gg__play" aria-hidden="true">▶</span>
            </>
          ) : (
            <img className="gg__media" src={item.url} alt={item.caption || "photo"} loading="lazy" />
          )}
          {item.caption && <span className="gg__caption">{item.caption}</span>}
        </button>
      ))}

      {!hasItems && !onAddClick && (
        <p className="gg__empty">{emptyLabel || "Nothing here yet."}</p>
      )}
    </div>
  );
};

export default GalleryGrid;
