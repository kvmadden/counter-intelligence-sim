import { test, expect } from '@playwright/test';

test.describe('Phoenix Wright Courtroom Narrative Game', () => {
  test('portrait layout renders without clipping and plays full game loop to victory', async ({ page }) => {
    await page.goto('/');

    // 1. Verify portrait layout renders core areas without clipping
    const encounterContainer = page.locator('[data-testid="encounter-container"]');
    await expect(encounterContainer).toBeVisible();

    const spriteArea = page.locator('[data-testid="patient-sprite-area"]');
    const dialogueArea = page.locator('[data-testid="dialogue-box-area"]');
    const actionArea = page.locator('[data-testid="action-menu-area"]');

    await expect(spriteArea).toBeVisible();
    await expect(dialogueArea).toBeVisible();
    await expect(actionArea).toBeVisible();

    // Verify witness and mascot are rendered
    await expect(page.locator('.witness-sprite')).toBeVisible();
    await expect(page.locator('.mascot')).toBeVisible();

    // Verify initial statement (Statement 1)
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('1 / 3');
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      'I AM ONLY HERE TO PICK UP MY USUAL MONTHLY BAG.'
    );

    // 2. Navigate statements using Next and Prev
    const nextBtn = page.locator('[data-testid="action-next"]');
    const prevBtn = page.locator('[data-testid="action-prev"]');

    await nextBtn.click();
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('2 / 3');
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      "I DON'T HAVE TIME FOR ANYTHING EXTRA TODAY."
    );

    await nextBtn.click();
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('3 / 3');
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      'AND BESIDES, MY AFTERNOON IS FULL OF BUSY ERRANDS.'
    );

    await prevBtn.click();
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('2 / 3');
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      "I DON'T HAVE TIME FOR ANYTHING EXTRA TODAY."
    );

    // 3. Test penalty system: Presenting evidence before pressing loses a strike
    const presentBtn = page.locator('[data-testid="action-present"]');
    await presentBtn.click();

    // Evidence drawer is open
    const drawer = page.locator('[data-testid="evidence-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(page.locator('[data-testid="evidence-item"]')).toHaveCount(3);

    // Present pickup_bag (wrong evidence)
    const bagItem = page.locator('[data-testid="evidence-item"][data-evidence-id="pickup_bag"]');
    await bagItem.click();

    // Foul triggered!
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('·');
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      'FOUL! THAT MOVE DOES NOT EXPOSE A CONTRADICTION!'
    );

    // 4. Press the patient on Statement 2 to reveal behavioral opening
    const pressBtn = page.locator('[data-testid="action-press"]');
    await pressBtn.click();

    await expect(page.locator('[data-testid="opening-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      'WELL... I DO HAVE TEN MINUTES WHILE MY ORDER PACKS.'
    );

    // 5. Present the winning counter move: express_slip
    await presentBtn.click();
    await expect(drawer).toBeVisible();

    const expressSlipItem = page.locator(
      '[data-testid="evidence-item"][data-evidence-id="express_slip"]'
    );
    await expressSlipItem.click();

    // 6. Breakthrough objection & Victory Screen
    const victoryScreen = page.locator('[data-testid="victory-screen"]');
    await expect(victoryScreen).toBeVisible();
    await expect(page.locator('text=CONTRADICTION RESOLVED!')).toBeVisible();
    await expect(page.locator('text=EXPRESS SLIP PROVES SERVICE TAKES UNDER TWO MINUTES.')).toBeVisible();

    // 7. Restart capability
    const restartBtn = page.locator('[data-testid="btn-restart"]');
    await expect(restartBtn).toBeVisible();
    await restartBtn.click();

    // Resets back to Statement 1 with 3 fouls remaining
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('1 / 3');
    await expect(page.locator('[data-testid="strike-0"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-1"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('✕');
  });

  test('referee foul system triggers defeat screen on 3 strikes', async ({ page }) => {
    await page.goto('/');

    const presentBtn = page.locator('[data-testid="action-present"]');

    // Strike 1
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="pickup_bag"]').click();
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('·');

    // Strike 2
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="schedule_sheet"]').click();
    await expect(page.locator('[data-testid="strike-1"]')).toHaveText('·');

    // Strike 3
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="pickup_bag"]').click();

    // Defeat screen
    const defeatScreen = page.locator('[data-testid="defeat-screen"]');
    await expect(defeatScreen).toBeVisible();
    await expect(page.locator('text=OUT OF TIMEOUTS!')).toBeVisible();
    await expect(page.locator('text=SKEPTICAL STEVE WALKED OUT THE DOOR.')).toBeVisible();

    // Restart
    await page.locator('[data-testid="btn-restart"]').click();
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('1 / 3');
  });
});
