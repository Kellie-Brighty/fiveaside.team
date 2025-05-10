# MonkeyPost

A modern web application for managing five-aside football teams, matches, and betting.

## Features

- **Team Management**: Create and manage teams (sets) for five-aside football
- **Match Management**: Track live matches with automatic timing and score tracking
- **Winner-stays-on System**: Automatically manage team rotation based on match results
- **Betting System**: Place bets on matches with dynamically calculated odds

## Technologies

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run development server
npm run dev
```

### Build

```bash
# Build for production
npm run build
```

## Usage

The platform has two main user roles:

### Regular Users

- Can view matches
- Can register teams
- Can place bets on matches

### Referee

- Has all regular user abilities
- Can start/manage matches
- Can record scores
- Can manage the team queue

To access the referee features, check the "Login as Referee" option on the login page.

## Project Structure

```
MonkeyPost/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── pages/            # Page components
│   ├── types/            # TypeScript type definitions
│   ├── hooks/            # Custom React hooks
│   ├── App.tsx           # Main app component with routing
│   └── main.tsx          # Entry point
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## Future Enhancements

- Backend integration
- Real-time updates
- Payment integration for betting
- User profile management
- Team statistics and leaderboards
