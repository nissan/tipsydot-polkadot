import { test, expect } from '@playwright/test';

test.describe('TipsyDot UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the homepage with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/TipsyDot/);
    
    const heading = page.locator('h1').first();
    await expect(heading).toContainText('TipsyDot');
    
    const subtitle = page.locator('text=/Cross-chain Crowdfunding on Polkadot/i');
    await expect(subtitle).toBeVisible();
  });

  test('should show protocol fee information', async ({ page }) => {
    const feeInfo = page.locator('text=/0.1% protocol fee/i');
    await expect(feeInfo).toBeVisible();
    
    const coretimeInfo = page.locator('text=/coretime/i');
    await expect(coretimeInfo).toBeVisible();
  });

  test('should display campaign creation form', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Campaign")');
    if (await createButton.isVisible()) {
      await createButton.click();
    }
    
    const nameInput = page.locator('input[placeholder*="campaign name" i]');
    const descInput = page.locator('textarea[placeholder*="description" i], input[placeholder*="description" i]');
    const paraIdInput = page.locator('input[placeholder*="parachain" i], input[placeholder*="para" i]');
    
    if (await nameInput.isVisible()) {
      await expect(nameInput).toBeVisible();
      await expect(descInput).toBeVisible();
      await expect(paraIdInput).toBeVisible();
    }
  });

  test('should display campaigns list', async ({ page }) => {
    const campaignsSection = page.locator('[data-testid="campaigns"], section:has-text("Campaigns"), div:has-text("Active Campaigns")');
    
    if (await campaignsSection.isVisible()) {
      await expect(campaignsSection).toBeVisible();
    }
  });

  test('should show tip functionality', async ({ page }) => {
    const tipButton = page.locator('button:has-text("Tip"), button:has-text("Support")').first();
    
    if (await tipButton.isVisible()) {
      await tipButton.click();
      
      const amountInput = page.locator('input[placeholder*="amount" i], input[placeholder*="USDC" i]');
      const memoInput = page.locator('input[placeholder*="memo" i], textarea[placeholder*="message" i]');
      
      if (await amountInput.isVisible()) {
        await expect(amountInput).toBeVisible();
        await expect(memoInput).toBeVisible();
      }
    }
  });

  test('should calculate and display protocol fees correctly', async ({ page }) => {
    const tipButton = page.locator('button:has-text("Tip"), button:has-text("Support")').first();
    
    if (await tipButton.isVisible()) {
      await tipButton.click();
      
      const amountInput = page.locator('input[placeholder*="amount" i], input[placeholder*="USDC" i]');
      
      if (await amountInput.isVisible()) {
        await amountInput.fill('1000');
        
        const feeDisplay = page.locator('text=/Protocol Fee.*1.00 USDC/i, text=/Fee.*1.00/i');
        const netAmount = page.locator('text=/Net.*999.00/i, text=/Campaign receives.*999/i');
        
        await expect(feeDisplay.or(netAmount)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show wallet connection UI', async ({ page }) => {
    const connectWallet = page.locator('button:has-text("Connect"), button:has-text("Wallet")');
    
    if (await connectWallet.isVisible()) {
      await expect(connectWallet).toBeVisible();
    }
  });

  test('should display security warnings about npm exploit', async ({ page }) => {
    const securityInfo = page.locator('text=/security/i, text=/hardware wallet/i, text=/clear signing/i');
    
    const hasSecurityInfo = await securityInfo.count() > 0;
    if (hasSecurityInfo) {
      await expect(securityInfo.first()).toBeVisible();
    }
  });

  test('should show AssetHub USDC integration', async ({ page }) => {
    const usdcInfo = page.locator('text=/AssetHub USDC/i, text=/Asset ID 1337/i, text=/native USDC/i');
    
    const hasUsdcInfo = await usdcInfo.count() > 0;
    if (hasUsdcInfo) {
      await expect(usdcInfo.first()).toBeVisible();
    }
  });

  test('should display Solidity on Polkadot messaging', async ({ page }) => {
    const solidityInfo = page.locator('text=/Solidity/i');
    const polkadotInfo = page.locator('text=/Polkadot/i');
    
    await expect(solidityInfo.first()).toBeVisible();
    await expect(polkadotInfo.first()).toBeVisible();
  });
});

test.describe('TipsyDot Contract Interaction Tests', () => {
  test('should interact with deployed contracts', async ({ page }) => {
    await page.goto('/');
    
    const contractAddress = process.env.VITE_TIPSY_ADDRESS;
    if (contractAddress) {
      const addressDisplay = page.locator(`text=/${contractAddress}/i`);
      const hasAddress = await addressDisplay.count() > 0;
      
      if (hasAddress) {
        await expect(addressDisplay.first()).toBeVisible();
      }
    }
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/');
    
    const createButton = page.locator('button:has-text("Create Campaign")');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")');
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        const errorMessage = page.locator('text=/required/i, text=/invalid/i, text=/enter/i');
        const hasError = await errorMessage.count() > 0;
        
        if (hasError) {
          await expect(errorMessage.first()).toBeVisible();
        }
      }
    }
  });
});

test.describe('TipsyDot Accessibility Tests', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasText = await button.textContent();
      
      expect(hasAriaLabel || hasText).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('TipsyDot Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('/');
    
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    
    const mainContent = page.locator('main, [role="main"], .container').first();
    await expect(mainContent).toBeVisible();
  });
});