-- Sample content for Content Hub testing
-- Run this SQL to populate initial content

-- Insert sample news
INSERT INTO content_hub (title, slug, content, type, status, visibility, created_at, updated_at)
VALUES 
  (
    'Welcome to CastorWorks 2.0',
    'welcome-to-castorworks-2',
    '# Welcome to CastorWorks 2.0\n\nWe are excited to announce the launch of **CastorWorks 2.0** with many new features!\n\n## What''s New\n\n- **AI-Powered Insights** - Get intelligent recommendations for your projects\n- **New Content Hub** - Centralized news, articles, and documentation\n- **Enhanced Mobile Experience** - Better performance on all devices\n\nThank you for choosing CastorWorks for your construction project management needs!',
    'news',
    'published',
    '["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "editor"]',
    NOW(),
    NOW()
  ),
  (
    'Q1 2026 Roadmap Update',
    'q1-2026-roadmap',
    '# Q1 2026 Roadmap Update\n\nHere''s what we''re working on for the first quarter of 2026:\n\n## Priority Features\n\n1. **Client Portal Enhancements** - New approval workflows\n2. **SINAPI Integration** - Automatic material price updates\n3. **Performance Optimizations** - 40% faster page loads\n\n## Timeline\n\n- January: Client Portal v2\n- February: SINAPI Integration\n- March: Performance & Stability\n\nStay tuned for more updates!',
    'news',
    'published',
    '["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "editor"]',
    NOW(),
    NOW()
  );

-- Insert sample article
INSERT INTO content_hub (title, slug, content, type, status, visibility, created_at, updated_at)
VALUES 
  (
    'Best Practices for Project Budget Management',
    'project-budget-management-best-practices',
    '# Best Practices for Project Budget Management\n\nManaging construction project budgets effectively is crucial for profitability. Here are our top recommendations:\n\n## 1. Start with Accurate Estimates\n\nUse the SINAPI database for up-to-date material costs in Brazil. Review historical data from similar projects.\n\n## 2. Track Changes Proactively\n\nDocument every change order and track its impact on the budget. Use the Budget Control dashboard for real-time visibility.\n\n## 3. Regular Budget Reviews\n\nConduct weekly budget reviews with the project team. Identify variances early and take corrective action.\n\n## 4. contingency Planning\n\nAlways include a contingency buffer (typically 5-10%) for unexpected costs.\n\n## Key Metrics to Monitor\n\n- **CPI** (Cost Performance Index)\n- **SPI** (Schedule Performance Index)\n- **Variance at Completion (VAC)**',
    'article',
    'published',
    '["admin", "project_manager", "site_supervisor", "admin_office", "editor"]',
    NOW(),
    NOW()
  );

-- Insert sample FAQ
INSERT INTO content_hub (title, slug, content, type, status, visibility, created_at, updated_at)
VALUES 
  (
    'How do I create a new project?',
    'how-create-new-project',
    '# How do I create a new project?\n\nCreating a new project in CastorWorks is simple:\n\n1. Navigate to **Projects** from the sidebar\n2. Click the **New Project** button\n3. Fill in the required information:\n   - Project name\n   - Client\n   - Start date\n   - Estimated end date\n   - Budget\n4. Click **Create Project**\n\nOnce created, you can add tasks, assign team members, and start tracking progress.',
    'faq',
    'published',
    '["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "editor", "client"]',
    NOW(),
    NOW()
  ),
  (
    'How do I reset my password?',
    'how-reset-password',
    '# How do I reset my password?\n\nIf you''ve forgotten your password:\n\n1. Go to the login page\n2. Click **Forgot Password?**\n3. Enter your email address\n4. Check your email for a password reset link\n5. Click the link and create a new password\n\nThe reset link expires after 24 hours. If you don''t receive an email, check your spam folder or contact your administrator.',
    'faq',
    'published',
    '["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "editor", "client"]',
    NOW(),
    NOW()
  ),
  (
    'What browsers are supported?',
    'supported-browsers',
    '# What browsers are supported?\n\nCastorWorks supports the latest versions of major browsers:\n\n- **Chrome** (recommended)\n- **Firefox**\n- **Safari**\n- **Edge**\n\nFor the best experience, we recommend using Chrome with auto-updates enabled.\n\n## Mobile Browsers\n\n- **Safari** on iOS (latest)\n- **Chrome** on Android (latest)\n\nInternet Explorer is not supported.',
    'faq',
    'published',
    '["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "editor", "client"]',
    NOW(),
    NOW()
  );

SELECT 'Sample content inserted successfully!' as status;
