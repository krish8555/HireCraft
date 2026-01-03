# HireCraft

A system prototype made for integrating and shortlisting candidates based on AI.

## Admin Panel

A Next.js admin application for managing job postings with Supabase integration.

### Features

- 🔐 Secure admin authentication
- 📝 Post and manage job listings
- 🎨 Beautiful dark gradient theme (Indigo/Slate/Emerald)
- 💾 Supabase database integration
- 📱 Responsive design

### Getting Started

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Environment Variables

Update the `.env.local` file with your credentials:

```env
# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### 3. Set Up Supabase Database

Create the following tables in your Supabase project:

**Jobs Table:**

```sql
create table jobs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  requirements text not null,
  location text not null,
  type text not null,
  salary_range text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

**Admin Table (Optional):**

```sql
create table admins (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

#### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. Navigate to `/login`
2. Use the credentials from your `.env.local` file
3. Access the dashboard to post and manage jobs

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase
- **Styling**: Tailwind CSS
- **Language**: TypeScript 
