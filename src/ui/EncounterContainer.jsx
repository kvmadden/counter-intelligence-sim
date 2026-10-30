import { useState } from 'react';
import DialogueBox from './DialogueBox';
import ActionMenu from './ActionMenu';
import Mascot from './Mascot';
import Witness from './Witness';

const STATEMENTS = [
  {
    id: 1,
    speaker: "SKEPTICAL STEVE",
    text: "I AM ONLY HERE TO PICK UP MY USUAL MONTHLY BAG.",
    pressedText: "EVERY MONTH I COME IN AND LEAVE IN TWO MINUTES.",
  },
  {
    id: 2,
    speaker: "SKEPTICAL STEVE",
    text: "I DON'T HAVE TIME FOR ANYTHING EXTRA TODAY.",
    pressedText: "WELL... I DO HAVE TEN MINUTES WHILE MY ORDER PACKS.",
  },
  {
    id: 3,
    speaker: "SKEPTICAL STEVE",
    text: "AND BESIDES, MY AFTERNOON IS FULL OF BUSY ERRANDS.",
    pressedText: "GROCERIES, DRY CLEANING, CAR WASH... YOU NAME IT.",
  }
];

const EVIDENCE = [
  {
    id: "express_slip",
    name: "EXPRESS SLIP",
    desc: "PROVES COUNTER SERVICE TAKES UNDER TWO MINUTES.",
    tag: "SPEED"
  },
  {
    id: "pickup_bag",
    name: "PICK-UP BAG",
    desc: "CONTAINS REGULAR MONTHLY MAINTENANCE ITEMS.",
    tag: "ITEMS"
  },
  {
    id: "schedule_sheet",
    name: "SCHEDULE SHEET",
    desc: "SHOWS OPEN CONSULTATION STATIONS RIGHT NOW.",
    tag: "HOURS"
  }
];

export default function EncounterContainer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [strikes, setStrikes] = useState(3);
  const [interjection, setInterjection] = useState(null);
  const [penaltyMessage, setPenaltyMessage] = useState(null);
  const [gameState, setGameState] = useState('testimony'); // 'testimony' | 'win' | 'lose'

  const handlePrev = () => {
    if (gameState !== 'testimony') return;
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setIsPressed(false);
    setPenaltyMessage(null);
  };

  const handleNext = () => {
    if (gameState !== 'testimony') return;
    setCurrentIndex((prev) => Math.min(STATEMENTS.length - 1, prev + 1));
    setIsPressed(false);
    setPenaltyMessage(null);
  };

  const handlePress = () => {
    if (gameState !== 'testimony') return;
    setInterjection("HOLD UP!");
    setIsPressed(true);
    setPenaltyMessage(null);
    setTimeout(() => {
      setInterjection(null);
    }, 600);
  };

  const handleTogglePresent = () => {
    if (gameState !== 'testimony') return;
    setIsTrayOpen((prev) => !prev);
    setPenaltyMessage(null);
  };

  const handleSelectEvidence = (evidenceId) => {
    setIsTrayOpen(false);

    // Contradiction Breakthrough:
    // Statement 2 ("I DON'T HAVE TIME FOR ANYTHING EXTRA TODAY.")
    // Must be pressed (revealing 10 minute packing window)
    // and presented with express_slip (service takes under 2 minutes).
    if (currentIndex === 1 && isPressed && evidenceId === "express_slip") {
      setInterjection("OBJECTION!");
      setGameState("win");
      setTimeout(() => {
        setInterjection(null);
      }, 900);
      return;
    }

    // Referee foul / wrong evidence presented
    const remainingStrikes = strikes - 1;
    setStrikes(remainingStrikes);
    setInterjection("FOUL!");
    setPenaltyMessage("FOUL! THAT MOVE DOES NOT EXPOSE A CONTRADICTION!");

    setTimeout(() => {
      setInterjection(null);
    }, 600);

    if (remainingStrikes <= 0) {
      setGameState("lose");
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPressed(false);
    setIsTrayOpen(false);
    setStrikes(3);
    setInterjection(null);
    setPenaltyMessage(null);
    setGameState("testimony");
  };

  const currentStatement = STATEMENTS[currentIndex];
  const currentText = penaltyMessage 
    ? penaltyMessage 
    : isPressed 
    ? currentStatement.pressedText 
    : currentStatement.text;

  const currentSpeaker = penaltyMessage 
    ? "REFEREE" 
    : currentStatement.speaker;

  let mascotMood = "idle";
  let witnessMood = isPressed ? "pressed" : "idle";

  if (gameState === "win") {
    mascotMood = "happy";
    witnessMood = "shocked";
  } else if (gameState === "lose") {
    mascotMood = "sad";
    witnessMood = "idle";
  } else if (interjection === "OBJECTION!") {
    mascotMood = "happy";
    witnessMood = "shocked";
  } else if (interjection === "FOUL!") {
    mascotMood = "panic";
  } else if (interjection === "HOLD UP!") {
    mascotMood = "bark";
  }

  if (gameState === "win") {
    return (
      <div className="screen encounter-container" data-testid="encounter-container">
        {interjection && (
          <div className="interjection-banner" data-testid="interjection-banner">
            <div className="interjection-burst">{interjection}</div>
          </div>
        )}
        <div className="verdict-screen" data-testid="verdict-screen">
          <div className="verdict-card" data-testid="victory-screen">
            <Mascot mood="happy" size={100} />
            <h2 className="verdict-title win">CONTRADICTION RESOLVED!</h2>
            <p className="verdict-subhead">BREAKTHROUGH CONFIRMED</p>
            <p className="verdict-desc">
              EXPRESS SLIP PROVES SERVICE TAKES UNDER TWO MINUTES.
            </p>
            <p className="verdict-desc">
              TEN MINUTES SPARE TIME SECURED!
            </p>
            <button
              type="button"
              className="btn play"
              data-testid="btn-restart"
              onClick={handleRestart}
              style={{ fontSize: '1.2rem', minHeight: '52px', marginTop: 'var(--s2)' }}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "lose") {
    return (
      <div className="screen encounter-container" data-testid="encounter-container">
        <div className="verdict-screen" data-testid="verdict-screen">
          <div className="verdict-card" data-testid="defeat-screen">
            <Mascot mood="sad" size={100} />
            <h2 className="verdict-title loss">OUT OF TIMEOUTS!</h2>
            <p className="verdict-subhead">THREE FOULS COMMITTED</p>
            <p className="verdict-desc">
              SKEPTICAL STEVE WALKED OUT THE DOOR.
            </p>
            <button
              type="button"
              className="btn play"
              data-testid="btn-restart"
              onClick={handleRestart}
              style={{ fontSize: '1.2rem', minHeight: '52px', marginTop: 'var(--s2)' }}
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`screen encounter-container${isTrayOpen ? ' drawer-open' : ''}`}
      data-testid="encounter-container"
    >
      {interjection && (
        <div className="interjection-banner" data-testid="interjection-banner">
          <div className="interjection-burst">{interjection}</div>
        </div>
      )}

      {/* Top: Mascot & Witness */}
      <div data-testid="patient-sprite-area" className="patient-sprite-area">
        <div className="hud-bar" data-testid="hud-bar">
          <span className="encounter-kicker">CROSS-EXAMINATION</span>
          <div className="strikes-display" data-testid="strikes-display">
            <span className="strike-label">FOULS:</span>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`strike-badge ${i < strikes ? 'active' : 'lost'}`}
                data-testid={`strike-${i}`}
              >
                {i < strikes ? '✕' : '·'}
              </span>
            ))}
          </div>
        </div>

        <div className="witness-stage">
          <div className="referee-box">
            <Mascot mood={mascotMood} size={76} />
          </div>
          <Witness mood={witnessMood} />
        </div>
      </div>

      {/* Middle: Dialogue */}
      <div data-testid="dialogue-box-area" className="dialogue-box-area">
        <DialogueBox
          speaker={currentSpeaker}
          text={currentText}
          pager={`${currentIndex + 1} / ${STATEMENTS.length}`}
          isPressed={isPressed}
        />
      </div>

      {/* Bottom: Action Menu */}
      <div data-testid="action-menu-area" className="action-menu-area">
        <ActionMenu
          onPrev={handlePrev}
          onNext={handleNext}
          onPress={handlePress}
          onPresent={handleTogglePresent}
          isTrayOpen={isTrayOpen}
          evidence={EVIDENCE}
          onSelectEvidence={handleSelectEvidence}
          isPrevDisabled={currentIndex === 0}
          isNextDisabled={currentIndex === STATEMENTS.length - 1}
          prevDisabled={currentIndex === 0}
          nextDisabled={currentIndex === STATEMENTS.length - 1}
        />
      </div>
    </div>
  );
}
