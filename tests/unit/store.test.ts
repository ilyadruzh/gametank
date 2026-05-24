import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../../src/store/gameStore';
import { defaultConfig } from '../../src/game/parts';

function reset() {
  useGame.setState({
    screen: 'title',
    mode: 'versus',
    players: [defaultConfig(), { ...defaultConfig(), country: 'aqu' }],
    buildIndex: 0,
    muted: false,
    result: null,
  });
}

describe('gameStore — переходы экранов', () => {
  beforeEach(reset);

  it('startBuild ведёт на сборку первого игрока', () => {
    useGame.getState().startBuild('versus');
    const s = useGame.getState();
    expect(s.screen).toBe('build');
    expect(s.buildIndex).toBe(0);
    expect(s.mode).toBe('versus');
  });

  it('setPart меняет только указанную деталь у нужного игрока', () => {
    useGame.getState().setPart(0, 'cannon', 'howitzer');
    expect(useGame.getState().players[0].cannon).toBe('howitzer');
    expect(useGame.getState().players[1].cannon).toBe('gun');
  });

  it('versus: первый next -> игрок 2, второй next -> бой', () => {
    useGame.getState().startBuild('versus');
    useGame.getState().nextBuild();
    expect(useGame.getState().buildIndex).toBe(1);
    expect(useGame.getState().screen).toBe('build');
    useGame.getState().nextBuild();
    expect(useGame.getState().screen).toBe('battle');
  });

  it('bot: один next сразу в бой, противника собирает компьютер', () => {
    useGame.getState().startBuild('bot');
    useGame.getState().nextBuild();
    const s = useGame.getState();
    expect(s.screen).toBe('battle');
    expect(s.players[1].country).toBe('vul'); // пресет бота
  });

  it('backBuild: с игрока 2 -> на игрока 1, затем -> в меню', () => {
    useGame.getState().startBuild('versus');
    useGame.setState({ buildIndex: 1 });
    useGame.getState().backBuild();
    expect(useGame.getState().buildIndex).toBe(0);
    useGame.getState().backBuild();
    expect(useGame.getState().screen).toBe('title');
  });

  it('setResult/rematch/toMenu управляют исходом', () => {
    useGame.getState().setResult(1);
    expect(useGame.getState().result).toEqual({ winner: 1 });
    useGame.getState().rematch();
    expect(useGame.getState().result).toBeNull();
    expect(useGame.getState().screen).toBe('battle');
    useGame.getState().toMenu();
    expect(useGame.getState().screen).toBe('title');
  });

  it('toggleMute переключает звук', () => {
    expect(useGame.getState().muted).toBe(false);
    useGame.getState().toggleMute();
    expect(useGame.getState().muted).toBe(true);
  });

  it('toggleView переключает режим отображения 2D/3D', () => {
    useGame.setState({ view: '2d' });
    useGame.getState().toggleView();
    expect(useGame.getState().view).toBe('3d');
    useGame.getState().toggleView();
    expect(useGame.getState().view).toBe('2d');
  });

  it('toggleMusic переключает музыку и сохраняет', () => {
    localStorage.clear();
    useGame.setState({ music: true });
    useGame.getState().toggleMusic();
    expect(useGame.getState().music).toBe(false);
    expect(localStorage.getItem('tankoboy.music.v1')).toBe('off');
  });
});
