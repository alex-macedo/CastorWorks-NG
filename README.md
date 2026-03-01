# CastorWorks 🏗️

**CastorWorks** is a professional construction project management platform designed for the modern engineering and construction industry, with a special focus on the Brazilian market.

![CastorWorks Banner](https://images.unsplash.com/photo-1503387762-592dea58ef23?auto=format&fit=crop&q=80&w=1200)

## 🌟 Key Features

- **Project Planning & Roadmaps**: Advanced timeline management and milestone tracking.
- **Financial Management**: Comprehensive budgeting, estimates, invoicing, and payment tracking.
- **Procurement & Materials**: SINAPI integration for precise material costing and supplier management.
- **Daily Logs & Photos**: Detailed construction activity tracking with visual documentation.
- **Client Portal**: Dedicated interface for project visibility and client approvals.
- **AI-Powered Insights**: Smart estimates and automated report generation.
- **Multi-tenant Architecture**: Secure data isolation with enterprise-grade protection.

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime).
- **State Management**: TanStack Query & Zustand.
- **Validation**: Zod.
- **Testing**: Vitest & Playwright.
- **PWA**: Offline-first capability with service workers.

## 🛠️ Getting Started

### Prerequisites

- Node.js v18+
- Docker Desktop (for local Supabase development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/alex-macedo/CastorWorks.git
   cd CastorWorks
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development environment:
   ```bash
   ./castorworks.sh start
   ```

The application will be available at `http://localhost:5181`. (CastorWorks-NG uses port 5181 so it can run in parallel with CastorWorks on 5173.)

## 📖 Documentation

For detailed information on architecture, coding standards, and workflows, please refer to:

- [AGENTS.md](./AGENTS.md) - Core engineering reference and AI agent guide.
- [docs/](./docs/) - Project documentation (PRD, Architecture, Roadmap).
- [.github/workflows/README.md](./.github/workflows/README.md) - GitHub Actions workflows and Dependabot auto-merge setup.

## 🛡️ Security

CastorWorks implements rigorous security standards:
- Row-Level Security (RLS) on all database tables.
- Server-side role verification in Edge Functions.
- XSS protection via DOMPurify.
- Signed URLs for private storage.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
Built with ❤️ by the CastorWorks Team.
