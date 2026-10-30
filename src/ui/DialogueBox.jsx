export default function DialogueBox({ speaker, text, pager, isPressed }) {
  return (
    <div 
      className="dialogue-box card" 
      data-testid="dialogue-box"
    >
      {(speaker || pager) && (
        <div className="dialogue-header">
          {speaker && (
            <span className="speaker-tag" data-testid="speaker-tag">
              {speaker}
            </span>
          )}
          {pager && (
            <span className="statement-pager" data-testid="statement-pager">
              {pager}
            </span>
          )}
        </div>
      )}
      <p 
        className="dialogue-text"
        data-testid="dialogue-text"
      >
        {text}
      </p>
      {isPressed && (
        <span className="opening-badge" data-testid="opening-badge">
          BEHAVIORAL OPENING
        </span>
      )}
    </div>
  );
}
