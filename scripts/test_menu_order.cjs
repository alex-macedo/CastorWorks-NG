const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.testing
function loadEnvVars() {
  const envPath = path.join(__dirname, '.env.testing');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
    }
  });
  
  return envVars;
}

async function testMenuOrderSave() {
  console.log('🚀 Testing Menu Order Save Functionality');
  
  // Load environment variables
  const env = loadEnvVars();
  console.log('📝 Environment variables loaded');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login as admin (using the test admin user from .env.testing)
    console.log('📝 Logging in as admin...');
    await page.goto('http://localhost:5173/login');
    
    // Use the test admin user from .env.testing
    await page.fill('input[type="email"]', env.ACCOUNT_TEST_EMAIL);
    await page.fill('input[type="password"]', env.ACCOUNT_TEST_EMAIL_PASSWORD);
    
    console.log(`🔑 Using admin email: ${env.ACCOUNT_TEST_EMAIL}`);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    try {
      await page.waitForURL('**/', { timeout: 10000 });
      console.log('✅ Successfully logged in as admin');
    } catch (error) {
      console.log('⚠️ Navigation timeout, checking current URL...');
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/localhost:5173/')) {
        console.log('✅ Successfully logged in - redirected to role-specific page');
      } else {
        console.log('❌ Login failed');
        console.log(`💡 Check credentials for ${env.ACCOUNT_TEST_EMAIL}`);
        return;
      }
    }
    
    // Navigate to Settings
    console.log('⚙️ Navigating to Settings...');
    await page.goto('http://localhost:5173/settings');
    await page.waitForTimeout(3000);
    console.log('✅ Settings page loaded');
    
    // Check if we have admin access
    const pageContent = await page.content();
    const hasMenuOrderAccess = pageContent.includes('Menu Order') || pageContent.includes('menu-order');
    
    if (!hasMenuOrderAccess) {
      console.log('⚠️ No admin access to Menu Order Management');
      console.log('🔍 Checking if there are any admin users...');
      
      // Look for admin indication
      if (pageContent.includes('admin')) {
        console.log('👤 User appears to have admin role but no Menu Order access');
      } else {
        console.log('👤 User does not appear to have admin role');
        console.log('💡 You need to log in as an admin user to test Menu Order functionality');
        console.log('🔧 Try creating an admin user or checking existing admin credentials');
      }
      return;
    }
    
    console.log('✅ Admin access confirmed');
    
    // Look for tabs in the Settings page
    const tabs = await page.locator('button[role="tab"]').count();
    console.log(`📊 Found ${tabs} tabs on Settings page`);
    
    if (tabs > 0) {
      // List all tab texts
      for (let i = 0; i < Math.min(tabs, 10); i++) {
        const tabText = await page.locator('button[role="tab"]').nth(i).textContent();
        console.log(`📍 Tab ${i + 1}: ${tabText}`);
      }
    }
    
    // Try to find Users tab and then Menu Order tab
    console.log('🔍 Looking for Users tab...');
    const usersTabs = await page.locator('button:has-text("Users")').count();
    if (usersTabs > 0) {
      await page.locator('button:has-text("Users")').first().click();
      console.log('✅ Clicked Users tab');
      await page.waitForTimeout(2000);
      
      // Now look for Menu Order tab
      console.log('🔍 Looking for Menu Order tab...');
      const menuOrderTabs = await page.locator('button:has-text("Menu Order")').count();
      if (menuOrderTabs > 0) {
        await page.locator('button:has-text("Menu Order")').first().click();
        console.log('✅ Clicked Menu Order tab');
        await page.waitForTimeout(2000);
        
        // Take screenshot of Menu Order interface
        await page.screenshot({ path: 'test-results/menu-order-interface.png' });
        console.log('📸 Menu Order interface screenshot saved');
        
        // Look for sortable options
        const sortableOptions = await page.locator('[data-testid="sortable-option"]').count();
        console.log(`📊 Found ${sortableOptions} sortable options`);
        
        if (sortableOptions >= 2) {
          console.log('🎯 Testing drag and drop...');
          
          // Get first two options
          const firstOption = page.locator('[data-testid="sortable-option"]').first();
          const secondOption = page.locator('[data-testid="sortable-option"]').nth(1);
          
          const firstOptionText = await firstOption.textContent();
          const secondOptionText = await secondOption.textContent();
          
          console.log(`📍 First option: ${firstOptionText?.trim()}`);
          console.log(`📍 Second option: ${secondOptionText?.trim()}`);
          
          // Drag the first option and drop it on the second
          console.log('🔄 Performing drag and drop...');
          await firstOption.dragTo(secondOption);
          await page.waitForTimeout(1000);
          
          // Check if Save Changes button is enabled
          const saveButton = page.locator('button:has-text("Save Changes")');
          const isSaveEnabled = await saveButton.isEnabled();
          
          if (isSaveEnabled) {
            console.log('✅ Save Changes button is enabled after reordering');
            
            // Click save
            console.log('💾 Clicking Save Changes...');
            await saveButton.click();
            
            // Wait for success message or error
            await page.waitForTimeout(3000);
            
            // Check for success message
            const successMessage = await page.locator('text=Menu order updated successfully').count();
            const errorMessage = await page.locator('text=Failed').count();
            
            if (successMessage > 0) {
              console.log('🎉 SUCCESS: Menu order saved successfully!');
            } else if (errorMessage > 0) {
              console.log('❌ ERROR: Failed to save menu order');
              const errorText = await page.locator('text=Failed').textContent();
              console.log(`📝 Error message: ${errorText}`);
            } else {
              console.log('⚠️ No success or error message detected');
            }
            
            // Take final screenshot
            await page.screenshot({ path: 'test-results/menu-order-after-save.png' });
            console.log('📸 Final screenshot saved');
            
          } else {
            console.log('⚠️ Save Changes button is not enabled');
          }
        } else {
          console.log('⚠️ Not enough options to test drag and drop');
        }
      } else {
        console.log('❌ Menu Order tab not found');
      }
    } else {
      console.log('❌ Users tab not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot of current state for debugging
    await page.screenshot({ path: 'test-results/menu-order-test-error.png' });
    console.log('📸 Error screenshot saved: menu-order-test-error.png');
    
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
}

// Run the test
testMenuOrderSave().catch(console.error);
