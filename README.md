# 🌿 Cannect

A modern social media app built with React Native, Expo, and Supabase.

## ✨ Features

- **Authentication** - Email/password and social login
- **Feed** - Infinite scrolling feed with posts
- **Posts** - Create, like, repost, and reply to posts
- **Profiles** - User profiles with followers/following
- **Search** - Search users and posts
- **Notifications** - Real-time notifications
- **Dark Theme** - Premium green & dark design

## 🛠️ Tech Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **Expo** (SDK 52) - Development platform
- **Expo Router** - File-based routing
- **NativeWind** - Tailwind CSS for React Native
- **TanStack Query** - Data fetching & caching
- **Zustand** - State management

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage (for media)

### Optional
- **Cloudflare** - CDN, R2 storage, Workers

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   cd cannect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the schema in `supabase/schema.sql` in the SQL Editor
   - Get your project URL and anon key

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

## 📁 Project Structure

```
cannect/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Auth screens
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/            # Main tab screens
│   │   ├── feed.tsx
│   │   ├── search.tsx
│   │   ├── compose.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── post/[id].tsx      # Post detail
│   └── user/[username].tsx # User profile
├── components/
│   ├── Post/              # Post components
│   ├── Profile/           # Profile components
│   └── ui/                # Reusable UI components
├── lib/
│   ├── hooks/             # React Query hooks
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   ├── utils/             # Utilities
│   ├── supabase.ts        # Supabase client
│   └── query-client.ts    # TanStack Query config
├── assets/                # Images, fonts
├── supabase/              # Database schema
└── tailwind.config.js     # NativeWind theme
```

## 🎨 Theme

Premium dark theme with emerald green accents:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#10B981` | Buttons, links |
| Background | `#0A0A0A` | Main background |
| Surface | `#141414` | Cards, modals |
| Text Primary | `#FAFAFA` | Headings |
| Text Secondary | `#A1A1A1` | Captions |

## 📱 Scripts

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript check
```

## 🔧 Development

### Adding a new screen

1. Create a file in `app/` directory
2. Export a default React component
3. The route is automatically created

### Adding a new hook

1. Create hook in `lib/hooks/`
2. Export from `lib/hooks/index.ts`
3. Import with `import { useHook } from "@/lib/hooks"`

### Styling

Use NativeWind (Tailwind) classes:

```tsx
<View className="bg-surface rounded-xl p-4 border border-border">
  <Text className="text-text-primary font-semibold">Hello!</Text>
</View>
```

## 📄 License

MIT License - feel free to use this for your own projects!

---

Built with 💚 using Expo & Supabase
