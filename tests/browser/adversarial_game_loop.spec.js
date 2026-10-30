import { test, expect } from '@playwright/test';

test.describe('Adversarial Game Loop & Edge Case Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Check 1: Rapid clicking / double-clicking on Press and Present buttons', async ({ page }) => {
    const pressBtn = page.locator('[data-testid="action-press"]');
    const presentBtn = page.locator('[data-testid="action-present"]');
    const drawer = page.locator('[data-testid="evidence-drawer"]');

    // 1.1 Rapid spam on Press button (5 rapid clicks)
    for (let i = 0; i < 5; i++) {
      await pressBtn.click({ force: true });
    }

    // Interjection banner should appear with "HOLD UP!"
    const banner = page.locator('[data-testid="interjection-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText(/HOLD UP!/);

    // Wait for interjection timeout (600ms + buffer)
    await page.waitForTimeout(750);
    await expect(banner).toBeHidden();

    // Statement 1 should be pressed
    await expect(page.locator('[data-testid="opening-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      'EVERY MONTH I COME IN AND LEAVE IN TWO MINUTES.'
    );

    // 1.2 Rapid spam on Present toggle
    // Click present to open tray
    await presentBtn.click();
    await expect(drawer).toBeVisible();

    // Click cancel to close
    const cancelBtn = page.locator('[data-testid="close-tray"]');
    await cancelBtn.click();
    await expect(drawer).toBeHidden();
    await expect(presentBtn).toBeVisible();

    // Rapid double click on Present
    await presentBtn.dblclick();
    // Verify no unhandled errors or desync: either drawer is open or closed, but UI is functional
    const isDrawerVisible = await drawer.isVisible();
    if (isDrawerVisible) {
      await page.locator('[data-testid="close-tray"]').click();
      await expect(drawer).toBeHidden();
    }
    await expect(presentBtn).toBeVisible();
  });

  test('Check 2: Statement paging boundaries (cannot navigate before statement 1 or after statement 3)', async ({ page }) => {
    const prevBtn = page.locator('[data-testid="action-prev"]');
    const nextBtn = page.locator('[data-testid="action-next"]');
    const pager = page.locator('[data-testid="statement-pager"]');
    const text = page.locator('[data-testid="dialogue-text"]');

    // Initially at Statement 1
    await expect(pager).toHaveText('1 / 3');
    await expect(text).toHaveText('I AM ONLY HERE TO PICK UP MY USUAL MONTHLY BAG.');

    // Attempt to navigate BEFORE Statement 1
    // The requirement states: "cannot navigate before statement 1 or after statement 3"
    await prevBtn.click();

    const pagerTextAfterPrevAtStart = await pager.textContent();
    const statementTextAfterPrevAtStart = await text.textContent();

    console.log(`[PAGING CHECK] After Prev at Statement 1: pager='${pagerTextAfterPrevAtStart}', text='${statementTextAfterPrevAtStart}'`);

    // In a system adhering strictly to "cannot navigate before statement 1",
    // the pager should remain "1 / 3" or prevBtn should be disabled.
    // We assert whether boundary paging is enforced:
    expect(pagerTextAfterPrevAtStart).toBe('1 / 3');
  });

  test('Check 2b: Statement paging boundary at Statement 3 (cannot navigate after statement 3)', async ({ page }) => {
    const prevBtn = page.locator('[data-testid="action-prev"]');
    const nextBtn = page.locator('[data-testid="action-next"]');
    const pager = page.locator('[data-testid="statement-pager"]');
    const text = page.locator('[data-testid="dialogue-text"]');

    // Navigate to Statement 2
    await nextBtn.click();
    await expect(pager).toHaveText('2 / 3');

    // Navigate to Statement 3
    await nextBtn.click();
    await expect(pager).toHaveText('3 / 3');
    await expect(text).toHaveText('AND BESIDES, MY AFTERNOON IS FULL OF BUSY ERRANDS.');

    // Attempt to navigate AFTER Statement 3
    await nextBtn.click();

    const pagerTextAfterNextAtEnd = await pager.textContent();
    const statementTextAfterNextAtEnd = await text.textContent();

    console.log(`[PAGING CHECK] After Next at Statement 3: pager='${pagerTextAfterNextAtEnd}', text='${statementTextAfterNextAtEnd}'`);

    // In a system adhering strictly to "cannot navigate after statement 3",
    // the pager should remain "3 / 3" or nextBtn should be disabled.
    expect(pagerTextAfterNextAtEnd).toBe('3 / 3');
  });

  test('Check 3: Presenting wrong evidence on statements 1, 2, and 3 (penalties, strike decrement, Defeat on 0 strikes)', async ({ page }) => {
    const presentBtn = page.locator('[data-testid="action-present"]');
    const nextBtn = page.locator('[data-testid="action-next"]');
    const pager = page.locator('[data-testid="statement-pager"]');
    const dialogue = page.locator('[data-testid="dialogue-text"]');
    const strikesDisplay = page.locator('[data-testid="strikes-display"]');

    // Initial strikes: 3
    await expect(page.locator('[data-testid="strike-0"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-1"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('✕');

    // --- Statement 1: Present express_slip (wrong evidence on stmt 1) ---
    await expect(pager).toHaveText('1 / 3');
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="express_slip"]').click();

    // Strike 2 lost
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('·');
    await expect(page.locator('[data-testid="strike-1"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-0"]')).toHaveText('✕');
    await expect(dialogue).toHaveText('FOUL! THAT MOVE DOES NOT EXPOSE A CONTRADICTION!');

    // --- Statement 2: Present pickup_bag (wrong evidence on stmt 2) ---
    await nextBtn.click();
    await expect(pager).toHaveText('2 / 3');
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="pickup_bag"]').click();

    // Strike 1 lost
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('·');
    await expect(page.locator('[data-testid="strike-1"]')).toHaveText('·');
    await expect(page.locator('[data-testid="strike-0"]')).toHaveText('✕');
    await expect(dialogue).toHaveText('FOUL! THAT MOVE DOES NOT EXPOSE A CONTRADICTION!');

    // --- Statement 3: Present schedule_sheet (wrong evidence on stmt 3) ---
    await nextBtn.click();
    await expect(pager).toHaveText('3 / 3');
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="schedule_sheet"]').click();

    // Strike 0 lost -> Defeat screen triggered
    const defeatScreen = page.locator('[data-testid="defeat-screen"]');
    await expect(defeatScreen).toBeVisible();
    await expect(page.locator('text=OUT OF TIMEOUTS!')).toBeVisible();
    await expect(page.locator('text=THREE FOULS COMMITTED')).toBeVisible();
    await expect(page.locator('text=SKEPTICAL STEVE WALKED OUT THE DOOR.')).toBeVisible();
  });

  test('Check 4: Presenting express_slip on statement 2 BEFORE pressing vs AFTER pressing', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="action-next"]');
    const presentBtn = page.locator('[data-testid="action-present"]');
    const pressBtn = page.locator('[data-testid="action-press"]');
    const dialogue = page.locator('[data-testid="dialogue-text"]');

    // Navigate to Statement 2
    await nextBtn.click();
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('2 / 3');
    await expect(dialogue).toHaveText("I DON'T HAVE TIME FOR ANYTHING EXTRA TODAY.");

    // 4.1 BEFORE pressing: present express_slip
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="express_slip"]').click();

    // Breakthrough MUST NOT occur! Must trigger foul penalty!
    await expect(page.locator('[data-testid="victory-screen"]')).toBeHidden();
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('·');
    await expect(dialogue).toHaveText('FOUL! THAT MOVE DOES NOT EXPOSE A CONTRADICTION!');

    // 4.2 PRESS statement 2 to reveal behavioral opening
    await pressBtn.click();
    await expect(page.locator('[data-testid="opening-badge"]')).toBeVisible();
    await expect(dialogue).toHaveText('WELL... I DO HAVE TEN MINUTES WHILE MY ORDER PACKS.');

    // 4.3 AFTER pressing: present express_slip
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="express_slip"]').click();

    // Breakthrough MUST occur! Interjection and Victory screen
    const victoryScreen = page.locator('[data-testid="victory-screen"]');
    await expect(victoryScreen).toBeVisible();
    await expect(page.locator('text=CONTRADICTION RESOLVED!')).toBeVisible();
    await expect(page.locator('text=BREAKTHROUGH CONFIRMED')).toBeVisible();
    await expect(page.locator('text=EXPRESS SLIP PROVES SERVICE TAKES UNDER TWO MINUTES.')).toBeVisible();
    await expect(page.locator('text=TEN MINUTES SPARE TIME SECURED!')).toBeVisible();
  });

  test('Check 5: Restart / Play Again functionality from Victory and Defeat screens', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="action-next"]');
    const presentBtn = page.locator('[data-testid="action-present"]');
    const pressBtn = page.locator('[data-testid="action-press"]');

    // --- 5.1 Test Play Again from Victory Screen ---
    // Navigate to stmt 2, press, present express_slip -> Victory
    await nextBtn.click();
    await pressBtn.click();
    await presentBtn.click();
    await page.locator('[data-testid="evidence-item"][data-evidence-id="express_slip"]').click();

    const victoryScreen = page.locator('[data-testid="victory-screen"]');
    await expect(victoryScreen).toBeVisible();

    // Click PLAY AGAIN
    const playAgainBtn = page.locator('[data-testid="btn-restart"]');
    await expect(playAgainBtn).toHaveText('PLAY AGAIN');
    await playAgainBtn.click();

    // Verify complete state reset
    await expect(victoryScreen).toBeHidden();
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('1 / 3');
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      'I AM ONLY HERE TO PICK UP MY USUAL MONTHLY BAG.'
    );
    await expect(page.locator('[data-testid="strike-0"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-1"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="opening-badge"]')).toBeHidden();

    // --- 5.2 Test Try Again from Defeat Screen ---
    // Incur 3 fouls
    for (let i = 0; i < 3; i++) {
      await presentBtn.click();
      await page.locator('[data-testid="evidence-item"][data-evidence-id="pickup_bag"]').click();
    }

    const defeatScreen = page.locator('[data-testid="defeat-screen"]');
    await expect(defeatScreen).toBeVisible();

    // Click TRY AGAIN
    const tryAgainBtn = page.locator('[data-testid="btn-restart"]');
    await expect(tryAgainBtn).toHaveText('TRY AGAIN');
    await tryAgainBtn.click();

    // Verify complete state reset
    await expect(defeatScreen).toBeHidden();
    await expect(page.locator('[data-testid="statement-pager"]')).toHaveText('1 / 3');
    await expect(page.locator('[data-testid="dialogue-text"]')).toHaveText(
      'I AM ONLY HERE TO PICK UP MY USUAL MONTHLY BAG.'
    );
    await expect(page.locator('[data-testid="strike-0"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-1"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="strike-2"]')).toHaveText('✕');
    await expect(page.locator('[data-testid="opening-badge"]')).toBeHidden();
  });
});
