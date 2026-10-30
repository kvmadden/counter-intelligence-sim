export default function ActionMenu({
  onPress,
  onPresent,
  onPrev,
  onNext,
  isTrayOpen = false,
  evidence = [],
  onSelectEvidence,
  disabled = false,
  isPrevDisabled = false,
  isNextDisabled = false,
  prevDisabled = false,
  nextDisabled = false
}) {
  if (isTrayOpen) {
    return (
      <div className="action-menu-area" data-testid="action-menu-area">
        <div className="evidence-drawer" data-testid="evidence-drawer">
          <div className="evidence-drawer-header">
            <h3 className="evidence-drawer-title">SELECT COUNTER MOVE</h3>
            <button
              type="button"
              className="btn btn-sm"
              data-testid="close-tray"
              onClick={onPresent}
              style={{ minHeight: '44px', minWidth: '44px', padding: 'var(--s1) var(--s3)' }}
            >
              CANCEL
            </button>
          </div>
          <div className="evidence-list" data-testid="evidence-list">
            {evidence.map((item) => (
              <button
                key={item.id}
                type="button"
                className="evidence-item"
                data-testid="evidence-item"
                data-evidence-id={item.id}
                onClick={() => onSelectEvidence && onSelectEvidence(item.id)}
                disabled={disabled}
              >
                <div className="evidence-title-row">
                  <span className="evidence-name">{item.name}</span>
                  <span className="evidence-tag">{item.tag}</span>
                </div>
                <span className="evidence-desc">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="action-menu"
      data-testid="action-menu"
    >
      {onPrev && (
        <button
          type="button"
          className={`btn action-btn nav-btn ${isPrevDisabled || prevDisabled ? 'disabled' : ''}`}
          data-testid="action-prev"
          data-disabled={isPrevDisabled || prevDisabled ? 'true' : undefined}
          onClick={onPrev}
          disabled={disabled}
        >
          &lt; Prev
        </button>
      )}
      <button
        type="button"
        className="btn action-btn press-btn"
        data-testid="action-press"
        onClick={onPress}
        disabled={disabled}
      >
        Press
      </button>
      <button
        type="button"
        className="btn action-btn present-btn"
        data-testid="action-present"
        onClick={onPresent}
        disabled={disabled}
      >
        Present
      </button>
      {onNext && (
        <button
          type="button"
          className={`btn action-btn nav-btn ${isNextDisabled || nextDisabled ? 'disabled' : ''}`}
          data-testid="action-next"
          data-disabled={isNextDisabled || nextDisabled ? 'true' : undefined}
          onClick={onNext}
          disabled={disabled}
        >
          Next &gt;
        </button>
      )}
    </div>
  );
}
