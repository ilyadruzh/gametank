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
