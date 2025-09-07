# 🔥 Hearth - Recipe Discovery Platform

A beautiful, modern recipe discovery and management platform built with React, TypeScript, and Tailwind CSS. Phase 1 focuses on recipe discovery with external API integration and responsive design.

## ✨ Features

### Phase 1: Recipe Discovery Web App
- **Recipe Search & Discovery**: Search for recipes with real-time suggestions
- **Advanced Filtering**: Filter by cuisine, diet, cooking time, difficulty, and more
- **Beautiful Recipe Cards**: High-quality images with metadata overlay
- **Detailed Recipe View**: Complete recipe information with ingredients and instructions
- **Responsive Design**: Mobile-first approach with tablet and desktop optimization
- **Dark/Light Theme**: System preference detection with manual toggle
- **PWA Ready**: Service worker for offline recipe viewing
- **Search History**: Recent searches and trending queries

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Spoonacular API key (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hearth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Spoonacular API key:
   ```env
   VITE_SPOONACULAR_API_KEY=your-api-key-here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### API Setup

Get your free Spoonacular API key:
1. Visit [Spoonacular API](https://spoonacular.com/food-api)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file

The free tier includes:
- 150 requests per day
- Access to recipe search and details
- Nutrition information
- Ingredient autocomplete

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── components/          # React components
│   ├── common/         # Reusable UI components
│   ├── recipe/         # Recipe-specific components
│   ├── layout/         # Layout components
│   └── home/          # Home page components
├── contexts/           # React context providers
├── services/          # API services and external integrations
├── types/             # TypeScript type definitions
├── utils/             # Utility functions and helpers
├── App.tsx            # Main app component
└── main.tsx           # Application entry point
```

### Key Technologies

- **React 18** with TypeScript for type safety
- **Tailwind CSS** for styling and design system
- **Vite** for fast development and optimized builds
- **PWA** capabilities with Vite PWA plugin
- **Context API** for state management
- **Spoonacular API** for recipe data

## 🎨 Design System

### Colors
- **Primary**: Orange (`#f97316`) - Warm, inviting food theme
- **Gray Scale**: Neutral grays for text and backgrounds
- **Semantic**: Green for success, red for errors, etc.

### Typography
- **Font**: Inter for clean, readable text
- **Scales**: Responsive typography with proper hierarchy

### Components
- **Cards**: Recipe cards with hover effects and metadata
- **Buttons**: Consistent button styles across variants
- **Forms**: Search and filter forms with proper validation
- **Loading**: Skeleton screens for better UX

## 🌙 Theme Support

The app supports three theme modes:
- **Light**: Default light theme
- **Dark**: Dark theme with proper contrast
- **System**: Follows system preference and updates automatically

Theme preference is saved to localStorage and persists across sessions.

## 📱 PWA Features

- **Offline Support**: View previously loaded recipes offline
- **Install Prompt**: Can be installed on mobile and desktop
- **App Icons**: Proper app icons for different platforms
- **Fast Loading**: Optimized assets and caching

## 🔍 API Integration

### Primary API: Spoonacular
- Recipe search with complex filters
- Detailed recipe information
- Nutrition data
- Ingredient autocomplete

### Backup APIs
- **Edamam**: Recipe search API (backup)
- **TheMealDB**: Free recipe database (limited)

## 🚧 Roadmap

### Phase 2: Web Scraping & Database (Next)
- Local database with SQLite
- Web scraping for any recipe website
- In-app browser for recipe extraction

### Phase 3: Multi-User & Family Sharing
- User authentication
- Family groups and recipe sharing
- Social features and collaboration

### Phase 4: Dockerization & NAS Deployment
- Container-based deployment
- NAS system compatibility
- Backup and data persistence

### Phase 5: Mobile Native App
- Android app with offline-first architecture
- Kitchen-optimized interface
- Camera integration for recipe scanning

## 🤝 Contributing

This is currently a personal project, but contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Spoonacular API](https://spoonacular.com/food-api) for recipe data
- [Tailwind CSS](https://tailwindcss.com) for the design system
- [Vite](https://vitejs.dev) for the build tool
- [React](https://reactjs.org) for the UI framework