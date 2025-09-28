import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for TipsyDot tipping functionality
 */

test.describe('TipsyDot Tipping Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display landing page with connect wallet button', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: /TipsyDot/i })).toBeVisible();
    
    // Check connect wallet button
    const connectButton = page.getByRole('button', { name: /Connect Wallet/i });
    await expect(connectButton).toBeVisible();
  });

  test('should show wallet modal when connect button clicked', async ({ page }) => {
    // Click connect wallet
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    
    // Check modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Check wallet options
    await expect(page.getByText(/MetaMask/i)).toBeVisible();
    await expect(page.getByText(/WalletConnect/i)).toBeVisible();
    await expect(page.getByText(/Polkadot\.js/i)).toBeVisible();
  });

  test('should navigate to builders page', async ({ page }) => {
    // Click builders link
    await page.getByRole('link', { name: /Builders/i }).click();
    
    // Check URL
    await expect(page).toHaveURL(/.*\/builders/);
    
    // Check builders list or empty state
    const buildersSection = page.getByTestId('builders-section');
    await expect(buildersSection).toBeVisible();
  });

  test('should open builder registration modal', async ({ page }) => {
    // Navigate to builders page
    await page.getByRole('link', { name: /Builders/i }).click();
    
    // Click register builder button
    await page.getByRole('button', { name: /Register as Builder/i }).click();
    
    // Check modal fields
    await expect(page.getByLabel(/Builder Name/i)).toBeVisible();
    await expect(page.getByLabel(/Wallet Address/i)).toBeVisible();
    await expect(page.getByLabel(/Description/i)).toBeVisible();
  });

  test('should validate builder registration form', async ({ page }) => {
    // Navigate to registration modal
    await page.getByRole('link', { name: /Builders/i }).click();
    await page.getByRole('button', { name: /Register as Builder/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /Submit/i }).click();
    
    // Check validation messages
    await expect(page.getByText(/Name is required/i)).toBeVisible();
    await expect(page.getByText(/Address is required/i)).toBeVisible();
  });

  test('should display tip modal for builder', async ({ page }) => {
    // Mock a builder in the list
    await page.route('**/api/builders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          builders: [
            {
              id: '1',
              name: 'Test Builder',
              address: '0x1234567890123456789012345678901234567890',
              totalReceived: '1000000000000000000',
              tipCount: '5',
            },
          ],
        }),
      });
    });

    // Navigate to builders
    await page.getByRole('link', { name: /Builders/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Click tip button on builder card
    await page.getByRole('button', { name: /Tip/i }).first().click();
    
    // Check tip modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/Amount/i)).toBeVisible();
    await expect(page.getByLabel(/Message/i)).toBeVisible();
  });

  test('should validate tip amount', async ({ page }) => {
    // Navigate to tip modal (using mocked builder)
    await page.route('**/api/builders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          builders: [{ id: '1', name: 'Test', address: '0x123', totalReceived: '0', tipCount: '0' }],
        }),
      });
    });

    await page.getByRole('link', { name: /Builders/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Tip/i }).first().click();
    
    // Enter invalid amount
    await page.getByLabel(/Amount/i).fill('0');
    await page.getByRole('button', { name: /Send Tip/i }).click();
    
    // Check validation
    await expect(page.getByText(/Amount must be greater than 0/i)).toBeVisible();
    
    // Enter valid amount
    await page.getByLabel(/Amount/i).fill('10');
    await page.getByLabel(/Message/i).fill('Great work!');
    
    // Button should be enabled
    const sendButton = page.getByRole('button', { name: /Send Tip/i });
    await expect(sendButton).toBeEnabled();
  });

  test('should show campaigns section', async ({ page }) => {
    // Navigate to campaigns
    await page.getByRole('link', { name: /Campaigns/i }).click();
    
    // Check URL
    await expect(page).toHaveURL(/.*\/campaigns/);
    
    // Check campaigns section
    const campaignsSection = page.getByTestId('campaigns-section');
    await expect(campaignsSection).toBeVisible();
  });

  test('should display campaign creation form', async ({ page }) => {
    // Navigate to campaigns
    await page.getByRole('link', { name: /Campaigns/i }).click();
    
    // Click create campaign
    await page.getByRole('button', { name: /Create Campaign/i }).click();
    
    // Check form fields
    await expect(page.getByLabel(/Campaign Name/i)).toBeVisible();
    await expect(page.getByLabel(/Target Amount/i)).toBeVisible();
    await expect(page.getByLabel(/Duration/i)).toBeVisible();
    await expect(page.getByLabel(/Description/i)).toBeVisible();
  });

  test('should show transaction history', async ({ page }) => {
    // Navigate to history
    await page.getByRole('link', { name: /History/i }).click();
    
    // Check URL
    await expect(page).toHaveURL(/.*\/history/);
    
    // Check history section
    const historySection = page.getByTestId('history-section');
    await expect(historySection).toBeVisible();
  });
});

test.describe('Wallet Integration', () => {
  test('should detect MetaMask installation', async ({ page, context }) => {
    // Inject MetaMask-like object
    await context.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async () => [],
      };
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    
    // MetaMask option should be enabled
    const metaMaskButton = page.getByRole('button', { name: /MetaMask/i });
    await expect(metaMaskButton).toBeEnabled();
  });

  test('should detect Polkadot.js extension', async ({ page, context }) => {
    // Inject Polkadot.js-like object
    await context.addInitScript(() => {
      (window as any).injectedWeb3 = {
        'polkadot-js': {
          enable: async () => ({
            accounts: {
              get: async () => [],
              subscribe: () => {},
            },
          }),
        },
      };
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    
    // Polkadot.js option should be enabled
    const polkadotButton = page.getByRole('button', { name: /Polkadot\.js/i });
    await expect(polkadotButton).toBeEnabled();
  });

  test('should show wallet type indicator when connected', async ({ page, context }) => {
    // Mock wallet connection
    await context.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        selectedAddress: '0x1234567890123456789012345678901234567890',
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0x1';
          }
          return null;
        },
      };
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    await page.getByRole('button', { name: /MetaMask/i }).click();
    
    // Should show connected state
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible();
    await expect(page.getByText(/EVM/i)).toBeVisible();
  });
});

test.describe('Cross-Contract Features', () => {
  test('should switch between EVM and Ink modes', async ({ page }) => {
    await page.goto('/');
    
    // Check mode switcher
    const modeSwitcher = page.getByTestId('contract-mode-switcher');
    await expect(modeSwitcher).toBeVisible();
    
    // Default should be auto
    await expect(page.getByText(/Auto/i)).toBeVisible();
    
    // Switch to EVM
    await modeSwitcher.click();
    await page.getByRole('menuitem', { name: /EVM Only/i }).click();
    await expect(page.getByText(/EVM Mode/i)).toBeVisible();
    
    // Switch to Ink
    await modeSwitcher.click();
    await page.getByRole('menuitem', { name: /Ink! Only/i }).click();
    await expect(page.getByText(/Ink! Mode/i)).toBeVisible();
  });

  test('should show appropriate wallet options based on mode', async ({ page }) => {
    await page.goto('/');
    
    // Set to EVM mode
    const modeSwitcher = page.getByTestId('contract-mode-switcher');
    await modeSwitcher.click();
    await page.getByRole('menuitem', { name: /EVM Only/i }).click();
    
    // Open wallet modal
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    
    // Should only show EVM wallets
    await expect(page.getByText(/MetaMask/i)).toBeVisible();
    await expect(page.getByText(/WalletConnect/i)).toBeVisible();
    await expect(page.getByText(/Polkadot\.js/i)).not.toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Switch to Ink mode
    await modeSwitcher.click();
    await page.getByRole('menuitem', { name: /Ink! Only/i }).click();
    
    // Open wallet modal again
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    
    // Should only show Substrate wallets
    await expect(page.getByText(/Polkadot\.js/i)).toBeVisible();
    await expect(page.getByText(/Talisman/i)).toBeVisible();
    await expect(page.getByText(/SubWallet/i)).toBeVisible();
    await expect(page.getByText(/MetaMask/i)).not.toBeVisible();
  });

  test('should display performance metrics comparison', async ({ page }) => {
    await page.goto('/');
    
    // Open performance modal
    await page.getByRole('button', { name: /Performance/i }).click();
    
    // Check metrics display
    await expect(page.getByText(/Gas Savings: 60%/i)).toBeVisible();
    await expect(page.getByText(/Contract Size: 80% smaller/i)).toBeVisible();
    await expect(page.getByText(/Transaction Speed: 2-3x faster/i)).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show mobile menu', async ({ page }) => {
    await page.goto('/');
    
    // Desktop nav should be hidden, hamburger should be visible
    await expect(page.getByTestId('desktop-nav')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Menu/i })).toBeVisible();
    
    // Open mobile menu
    await page.getByRole('button', { name: /Menu/i }).click();
    
    // Check menu items
    await expect(page.getByRole('link', { name: /Builders/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Campaigns/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /History/i })).toBeVisible();
  });

  test('should adapt tip modal for mobile', async ({ page }) => {
    // Mock builder data
    await page.route('**/api/builders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          builders: [{ id: '1', name: 'Test', address: '0x123', totalReceived: '0', tipCount: '0' }],
        }),
      });
    });

    await page.goto('/builders');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Tip/i }).first().click();
    
    // Modal should be full screen on mobile
    const modal = page.getByRole('dialog');
    const modalBox = await modal.boundingBox();
    
    expect(modalBox?.width).toBeCloseTo(375, 10);
    expect(modalBox?.height).toBeGreaterThan(400);
  });
});
