import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { initAudio } from '../../game/audio';

export default function TitleScreen() {
  const startBuild = useGame((s) => s.startBuild);
  const openCampaign = useGame((s) => s.openCampaign);
  const [showHow, setShowHow] = useState(false);

  const start = (mode: 'versus' | 'bot') => {
    initAudio();
    startBuild(mode);
  };

  const campaign = () => {
    initAudio();
    openCampaign();
  };

  return (
    <section id="screen-title" className="screen" data-testid="screen-title">
      <h1 className="logo">
        ТАНКО<wbr />БОЙ
      </h1>
      <div className="subtitle">собери свой танк из частей и сразись!</div>
      <div className="mode-row">
        <button className="btn primary" data-testid="btn-start-campaign" onClick={campaign}>
          КАМПАНИЯ 🎖️
        </button>
        <button className="btn" data-testid="btn-start-versus" onClick={() => start('versus')}>
          2 ИГРОКА ⚔️
        </button>
        <button className="btn" data-testid="btn-start-bot" onClick={() => start('bot')}>
          ПРОТИВ БОТА 🤖
        </button>
      </div>
      <div className="mode-row" style={{ marginTop: 8 }}>
        <button className="btn ghost" data-testid="btn-how" onClick={() => setShowHow((v) => !v)}>
          Как играть?
        </button>
      </div>
      {showHow && (
        <p className="note" data-testid="how-text">
          Каждый игрок выбирает <b>страну</b>, <b>гусеницы</b>, <b>башню</b>, <b>пушку</b> и <b>корпус</b> — от них зависят
          броня, скорость, урон и скорострельность. Потом танки дерутся на одной клавиатуре. Кто первым обнулит врага —
          побеждает!
        </p>
      )}
    </section>
  );
}
