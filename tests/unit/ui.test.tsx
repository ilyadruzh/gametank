import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { useGame } from '../../src/store/gameStore';
import { defaultConfig } from '../../src/game/parts';

// 3D-превью использует WebGL, которого нет в jsdom — подменяем заглушкой.
vi.mock('../../src/components/TankPreview3D', () => ({
  default: () => <div data-testid="preview-3d-mock" />,
}));

function resetStore() {
  localStorage.clear();
  useGame.setState({
    screen: 'title',
    mode: 'versus',
    players: [defaultConfig(), { ...defaultConfig(), country: 'aqu' }],
    buildIndex: 0,
    muted: false,
    result: null,
    completed: [],
    currentMissionId: null,
  });
}

async function renderApp() {
  render(<App />);
  // дожидаемся завершения загрузки физики (в тестах wasm не грузится -> фолбэк)
  await waitFor(() => expect(screen.getByTestId('screen-title')).toBeInTheDocument());
}

describe('UI: титульный экран', () => {
  beforeEach(resetStore);

  it('кнопка «Как играть?» показывает и прячет подсказку', async () => {
    const user = userEvent.setup();
    await renderApp();
    expect(screen.queryByTestId('how-text')).toBeNull();
    await user.click(screen.getByTestId('btn-how'));
    expect(screen.getByTestId('how-text')).toBeInTheDocument();
    await user.click(screen.getByTestId('btn-how'));
    expect(screen.queryByTestId('how-text')).toBeNull();
  });

  it('«2 игрока» открывает конструктор первого игрока', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-versus'));
    expect(screen.getByTestId('screen-build')).toBeInTheDocument();
    expect(screen.getByTestId('pl-badge')).toHaveTextContent('ИГРОК 1');
  });
});

describe('UI: конструктор', () => {
  beforeEach(resetStore);

  it('выбор детали подсвечивается', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-versus'));
    const heavy = screen.getByTestId('card-tracks-heavy');
    expect(heavy).toHaveAttribute('data-selected', 'false');
    await user.click(heavy);
    expect(heavy).toHaveAttribute('data-selected', 'true');
  });

  it('тяжёлый набор увеличивает «Броню»', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-versus'));
    const armorValue = () =>
      Number(within(screen.getByTestId('stat-Броня')).getAllByText(/\d+/).pop()!.textContent);
    const before = armorValue();
    await user.click(screen.getByTestId('card-tracks-heavy'));
    await user.click(screen.getByTestId('card-turret-big'));
    await user.click(screen.getByTestId('card-hull-bunker'));
    expect(armorValue()).toBeGreaterThan(before);
  });

  it('выбор гаубицы обновляет заголовок превью', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-versus'));
    await user.click(screen.getByTestId('card-cannon-howitzer'));
    expect(screen.getByTestId('prev-name')).toHaveTextContent('Гаубица');
  });

  it('versus: два шага «Готово» приводят в бой', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-versus'));
    await user.click(screen.getByTestId('btn-next'));
    expect(screen.getByTestId('pl-badge')).toHaveTextContent('ИГРОК 2');
    await user.click(screen.getByTestId('btn-next'));
    expect(screen.getByTestId('screen-battle')).toBeInTheDocument();
  });

  it('«Назад» с первого игрока возвращает на титул', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-versus'));
    await user.click(screen.getByTestId('btn-back'));
    expect(screen.getByTestId('screen-title')).toBeInTheDocument();
  });
});

describe('UI: бой и исход', () => {
  beforeEach(resetStore);

  it('режим против бота: один шаг -> бой с меткой 🤖', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-bot'));
    await user.click(screen.getByTestId('btn-next'));
    expect(screen.getByTestId('screen-battle')).toBeInTheDocument();
    expect(screen.getByTestId('hud2-name')).toHaveTextContent('🤖');
  });

  it('кнопка звука переключает иконку', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-bot'));
    await user.click(screen.getByTestId('btn-next'));
    expect(screen.getByTestId('btn-mute')).toHaveTextContent('🔊');
    await user.click(screen.getByTestId('btn-mute'));
    expect(screen.getByTestId('btn-mute')).toHaveTextContent('🔇');
  });

  it('экран победы: «Новые танки» ведёт обратно в конструктор', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-bot'));
    await user.click(screen.getByTestId('btn-next'));
    // показываем оверлей победы напрямую через store
    useGame.getState().setResult(0);
    await waitFor(() => expect(screen.getByTestId('overlay-win')).toBeInTheDocument());
    expect(screen.getByTestId('overlay-title')).toHaveTextContent('ПОБЕДА');
    await user.click(screen.getByTestId('btn-rebuild'));
    expect(screen.getByTestId('screen-build')).toBeInTheDocument();
  });
});

describe('UI: кампания', () => {
  beforeEach(resetStore);

  it('кнопка КАМПАНИЯ открывает карту, вторая миссия заблокирована', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-campaign'));
    expect(screen.getByTestId('screen-campaign')).toBeInTheDocument();
    expect(screen.getByTestId('mission-m1-patrol')).toHaveAttribute('data-locked', 'false');
    expect(screen.getByTestId('mission-m2-hold')).toHaveAttribute('data-locked', 'true');
  });

  it('выбор миссии -> брифинг -> сборка с заблокированными деталями -> бой', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-campaign'));
    await user.click(screen.getByTestId('mission-m1-patrol'));
    expect(screen.getByTestId('briefing-title')).toHaveTextContent('Первый выезд');
    await user.click(screen.getByTestId('btn-begin-mission'));
    expect(screen.getByTestId('screen-build')).toBeInTheDocument();
    // гаубица ещё не открыта в кампании
    expect(screen.getByTestId('card-cannon-howitzer')).toHaveAttribute('data-locked', 'true');
    await user.click(screen.getByTestId('btn-next'));
    expect(screen.getByTestId('screen-battle')).toBeInTheDocument();
  });

  it('победа в миссии засчитывает её прохождение и показывает награду', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByTestId('btn-start-campaign'));
    await user.click(screen.getByTestId('mission-m1-patrol'));
    await user.click(screen.getByTestId('btn-begin-mission'));
    await user.click(screen.getByTestId('btn-next'));
    // движок в jsdom не запускается -> эмулируем победу игрока через store
    useGame.getState().completeMission('m1-patrol');
    useGame.getState().setResult(0);
    await waitFor(() => expect(screen.getByTestId('overlay-title')).toHaveTextContent('МИССИЯ ПРОЙДЕНА'));
    expect(useGame.getState().completed).toContain('m1-patrol');
    await user.click(screen.getByTestId('btn-to-map'));
    expect(screen.getByTestId('screen-campaign')).toBeInTheDocument();
    expect(screen.getByTestId('mission-m2-hold')).toHaveAttribute('data-locked', 'false');
  });
});
