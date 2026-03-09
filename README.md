# Inkspire — Full-Stack Book Discovery & Discussion App

**Inkspire** is a full-stack social platform designed for book lovers to connect, share, and discuss their passion for literature. The platform enables users to post reviews, recommend books, join book clubs, and engage in discussions with readers with similar interests.

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- PostgreSQL database

### Environment Configuration

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note down your project URL and API keys

2. **Configure Environment Variables**:

   **Frontend (.env in `/frontend`)**:

   ```
   VITE_SUPABASE_URL=your_supabase_project_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

   **Backend (.env in `/backend`)**:

   ```
   DATABASE_URL="your_postgresql_connection_string_here"
   SUPABASE_URL=your_supabase_project_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   PORT=3000
   ```

3. **Database Setup**:
   - Run database migrations: `cd backend && npx prisma migrate dev`
   - Generate Prisma client: `cd backend && npx prisma generate`

### Running the Application

1. **Install Dependencies**:

   ```bash
   # Root directory
   npm install

   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

2. **Start the Application**:

   ```bash
   # Terminal 1: Start backend server
   cd backend
   npm start

   # Terminal 2: Start frontend development server
   cd frontend
   npm run dev
   ```

3. **Access the Application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Authentication

The app supports both email/password and Google OAuth authentication. New users will be automatically created in the database upon first login.

## Project Plan and Documentation:

https://docs.google.com/document/d/1emsLdOFMYFdhhUsmLrlw-B4meA2NDDTFCa78DRVpHs4/edit?tab=t.u4cfas5fh4z8#heading=h.4r5w24dxl6e7
