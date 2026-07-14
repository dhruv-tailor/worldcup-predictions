import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProvider } from './context/AppContext'
import Layout from './Layout'
import './index.css'

const GamePage = lazy(() => import('./pages/GamePage'))
const BreakdownPage = lazy(() => import('./pages/BreakdownPage'))
const UpcomingPage = lazy(() => import('./pages/UpcomingPage'))
const PlayerPage = lazy(() => import('./pages/PlayerPage'))
const PlayersPage = lazy(() => import('./pages/PlayersPage'))
const ControlPage = lazy(() => import('./pages/ControlPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const TimelinesPage = lazy(() => import('./pages/TimelinesPage'))

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <BreakdownPage /> },
        { path: 'game/:id', element: <GamePage /> },
        { path: 'breakdown', element: <BreakdownPage /> },
        { path: 'control', element: <ControlPage /> },
        { path: 'upcoming', element: <UpcomingPage /> },
        { path: 'timelines', element: <TimelinesPage /> },
        { path: 'players', element: <PlayersPage /> },
        { path: 'player/:name', element: <PlayerPage /> },
        { path: 'admin', element: <AdminPage /> },
      ],
    },
  ],
  { basename: '/worldcup-predictions/' },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>,
)
