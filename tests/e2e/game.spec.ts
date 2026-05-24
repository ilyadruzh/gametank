import { expect, test, type Page } from '@playwright/test';

// Ждём загрузки WASM-физики (экран загрузки исчезает -> появляется титул).
async function waitTitle(page: Page) {
  await expect(page.getByTestId('screen-title')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitTitle(page);
});

test.describe('Титульный экран', () => {
  test('логотип и кнопки на месте', async ({ page }) => {
    await expect(page.locator('h1.logo')).toContainText('ТАНКО');
    await expect(page.getByTestId('btn-start-versus')).toBeVisible();
    await expect(page.getByTestId('btn-start-bot')).toBeVisible();
  });

  test('«Как играть?» переключает подсказку', async ({ page }) => {
    await expect(page.getByTestId('how-text')).toHaveCount(0);
    await page.getByTestId('btn-how').click();
    await expect(page.getByTestId('how-text')).toBeVisible();
    await page.getByTestId('btn-how').click();
    await expect(page.getByTestId('how-text')).toHaveCount(0);
  });
});

test.describe('Конструктор танка', () => {
  test('выбор деталей подсвечивается и меняет характеристики', async ({ page }) => {
    await page.getByTestId('btn-start-versus').click();
    await expect(page.getByTestId('screen-build')).toBeVisible();
    await expect(page.getByTestId('pl-badge')).toHaveText('ИГРОК 1');

    // 3D-превью смонтировано (canvas внутри контейнера)
    await expect(page.getByTestId('preview-3d').locator('canvas')).toBeVisible({ timeout: 15000 });

    // Изначально выбрана "Пушка" -> броня базовая. Берём тяжёлый набор.
    const armorBefore = await page.getByTestId('stat-Броня').locator('.lab span').last().textContent();

    await page.getByTestId('card-tracks-heavy').click();
    await page.getByTestId('card-turret-big').click();
    await page.getByTestId('card-hull-bunker').click();
    await expect(page.getByTestId('card-tracks-heavy')).toHaveAttribute('data-selected', 'true');

    const armorAfter = await page.getByTestId('stat-Броня').locator('.lab span').last().textContent();
    expect(Number(armorAfter)).toBeGreaterThan(Number(armorBefore));
  });

  test('выбор пушки обновляет заголовок превью', async ({ page }) => {
    await page.getByTestId('btn-start-versus').click();
    await page.getByTestId('card-cannon-howitzer').click();
    await expect(page.getByTestId('prev-name')).toContainText('Гаубица');
  });

  test('versus: проходим оба конструктора и попадаем в бой', async ({ page }) => {
    await page.getByTestId('btn-start-versus').click();
    await page.getByTestId('btn-next').click(); // -> игрок 2
    await expect(page.getByTestId('pl-badge')).toHaveText('ИГРОК 2');
    await page.getByTestId('btn-next').click(); // -> бой
    await expect(page.getByTestId('screen-battle')).toBeVisible();
    await expect(page.getByTestId('arena')).toBeVisible();
  });

  test('кнопка «Назад» возвращает на титул', async ({ page }) => {
    await page.getByTestId('btn-start-versus').click();
    await page.getByTestId('btn-back').click();
    await waitTitle(page);
  });
});

test.describe('Бой', () => {
  async function gotoBattleVersus(page: Page) {
    await page.getByTestId('btn-start-versus').click();
    await page.getByTestId('btn-next').click();
    await page.getByTestId('btn-next').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible();
  }

  test('HUD, кнопки и подсказки отрисованы', async ({ page }) => {
    await gotoBattleVersus(page);
    await expect(page.getByTestId('hud1-name')).toBeVisible();
    await expect(page.getByTestId('hud2-name')).toBeVisible();
    await expect(page.getByTestId('btn-mute')).toBeVisible();
    await expect(page.getByTestId('btn-quit')).toBeVisible();
  });

  test('кнопка звука переключает иконку', async ({ page }) => {
    await gotoBattleVersus(page);
    await expect(page.getByTestId('btn-mute')).toHaveText('🔊');
    await page.getByTestId('btn-mute').click();
    await expect(page.getByTestId('btn-mute')).toHaveText('🔇');
  });

  test('управление с клавиатуры двигает танк (WASM-кинематика идёт)', async ({ page }) => {
    await gotoBattleVersus(page);
    // несколько кадров с зажатой клавишей не должны падать; проверяем живость канваса
    await page.getByTestId('arena').focus().catch(() => {});
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    await page.keyboard.up('Space');
    await expect(page.getByTestId('arena')).toBeVisible();
  });

  test('выход (✕) возвращает в меню', async ({ page }) => {
    await gotoBattleVersus(page);
    await page.getByTestId('btn-quit').click();
    await waitTitle(page);
  });

  test('экран победы: реванш, новые танки, меню', async ({ page }) => {
    await gotoBattleVersus(page);
    // детерминированно показываем оверлей победы через тестовый store-хук
    await page.evaluate(() => {
      (window as unknown as { __game: { getState: () => { setResult: (w: number) => void } } }).__game
        .getState()
        .setResult(0);
    });
    await expect(page.getByTestId('overlay-win')).toBeVisible();
    await expect(page.getByTestId('overlay-title')).toContainText('ПОБЕДА');

    await page.getByTestId('btn-rematch').click();
    await expect(page.getByTestId('overlay-win')).toHaveCount(0);
    await expect(page.getByTestId('arena')).toBeVisible();

    // снова показать оверлей и проверить «Новые танки»
    await page.evaluate(() => {
      (window as unknown as { __game: { getState: () => { setResult: (w: number) => void } } }).__game
        .getState()
        .setResult(1);
    });
    await page.getByTestId('btn-rebuild').click();
    await expect(page.getByTestId('screen-build')).toBeVisible();
  });
});

test.describe('Режим против бота', () => {
  test('один шаг сборки -> бой, противник помечен 🤖', async ({ page }) => {
    await page.getByTestId('btn-start-bot').click();
    await expect(page.getByTestId('screen-build')).toBeVisible();
    await page.getByTestId('btn-next').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible();
    await expect(page.getByTestId('hud2-name')).toContainText('🤖');
  });
});

test.describe('Ночной режим', () => {
  test('переключатель меняет тему всего приложения', async ({ page }) => {
    await expect(page.getByTestId('app')).toHaveAttribute('data-theme', 'day');
    await page.getByTestId('btn-theme').click();
    await expect(page.getByTestId('app')).toHaveAttribute('data-theme', 'night');
  });
});

test.describe('Кампания', () => {
  test('карта -> миссия -> сборка -> бой', async ({ page }) => {
    await page.getByTestId('btn-start-campaign').click();
    await expect(page.getByTestId('screen-campaign')).toBeVisible();
    await expect(page.getByTestId('mission-m2-hold')).toHaveAttribute('data-locked', 'true');
    await page.getByTestId('mission-m1-patrol').click();
    await expect(page.getByTestId('briefing-title')).toContainText('Первый выезд');
    await page.getByTestId('btn-begin-mission').click();
    await expect(page.getByTestId('card-cannon-howitzer')).toHaveAttribute('data-locked', 'true');
    await page.getByTestId('btn-next').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible();
  });
});

test.describe('Гараж и спецпушки', () => {
  test('выбор персонажа из гаража и спецпушки', async ({ page }) => {
    await page.getByTestId('btn-start-versus').click();
    await page.getByTestId('garage-drakosha').click();
    await expect(page.getByTestId('prev-name')).toContainText('Огнемёт');
    await page.getByTestId('card-cannon-chicken').click();
    await expect(page.getByTestId('prev-name')).toContainText('Курострел');
  });

  test('новые персонажи гаража (Вонючка с пукалкой)', async ({ page }) => {
    await page.getByTestId('btn-start-versus').click();
    await page.getByTestId('garage-vonyuchka').click();
    await expect(page.getByTestId('prev-name')).toContainText('Пукалка');
  });
});

test.describe('Музыка', () => {
  test('тумблер музыки на титуле переключается', async ({ page }) => {
    const btn = page.getByTestId('btn-music');
    await expect(btn).toContainText('Музыка');
    await btn.click();
    await expect(btn).toContainText('🔇');
  });
});

test.describe('Управление мышью', () => {
  test('выбор мыши включает прицел на арене', async ({ page }) => {
    await page.getByTestId('btn-start-bot').click();
    await page.getByTestId('control-mouse').click();
    await page.getByTestId('btn-next').click();
    await expect(page.getByTestId('arena')).toHaveClass(/mouse-aim/);
    // выстрел по клику мыши не должен ломать арену
    const box = await page.getByTestId('arena').boundingBox();
    if (box) await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await expect(page.getByTestId('arena')).toBeVisible();
  });
});

test.describe('Мультивыстрел', () => {
  test('цифра задаёт веер, стрельба не падает', async ({ page }) => {
    await page.getByTestId('btn-start-bot').click();
    await page.getByTestId('btn-next').click();
    await page.keyboard.press('Digit5');
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    await expect(page.getByTestId('arena')).toBeVisible();
  });
});

test.describe('3D-режим боя', () => {
  test('переключение на 3D показывает 3D-сцену', async ({ page }) => {
    await page.getByTestId('btn-start-bot').click();
    await page.getByTestId('btn-next').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible();
    await page.getByTestId('btn-view').click();
    // в 3D-режиме появляется r3f-канвас поверх арены
    await expect(page.getByTestId('battle3d').locator('canvas')).toBeVisible({ timeout: 15000 });
    // мышь/клавиатура продолжают работать (оверлей pointer-events:none)
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(200);
    await page.keyboard.up('KeyW');
    await page.getByTestId('btn-view').click(); // обратно в 2D
    await expect(page.getByTestId('arena')).toBeVisible();
  });
});
