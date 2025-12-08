# DKU Adventure Rental Management System

A comprehensive web application for managing outdoor equipment rental operations across multiple resort partnerships.

## Features

- Role-based access control (Engineer, Admin, Manager)
- Asset registration and lifecycle tracking
- Maintenance and spare parts management
- Expense management with approval workflows
- Revenue recording and automated profit-sharing calculations
- Invoice generation and payment tracking
- Resort partner management
- Executive dashboard with KPIs
- Data export (Excel and PDF)
- Mobile responsive design

## Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- Supabase Client

**Backend:**
- Supabase (PostgreSQL + Auth + RLS)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd client
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

### Development

```bash
cd client
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
cd client
npm run build
```

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

Or use Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

## Project Structure

```
.
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts (Auth)
│   │   ├── lib/          # Supabase client
│   │   ├── pages/        # Page components
│   │   ├── types/        # TypeScript types
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   └── package.json
├── vercel.json           # Vercel configuration
└── .env                  # Environment variables
```

## License

ISC
