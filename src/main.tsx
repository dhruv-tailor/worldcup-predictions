/* @refresh skip */
import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProvider } from './context/AppContext'
import Layout from './Layout'
import './index.css'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GamePage = lazy(() => import('./pages/GamePage'))
const BreakdownPage = lazy(() => import('./pages/BreakdownPage'))
const UpcomingPage = lazy(() => import('./pages/UpcomingPage'))
const PlayerPage = lazy(() => import('./pages/PlayerPage'))
const PlayersPage = lazy(() => import('./pages/PlayersPage'))
const ControlPage = lazy(() => import('./pages/ControlPage'))

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'game/:id', element: <GamePage /> },
        { path: 'breakdown', element: <BreakdownPage /> },
        { path: 'control', element: <ControlPage /> },
        { path: 'upcoming', element: <UpcomingPage /> },
        { path: 'players', element: <PlayersPage /> },
        { path: 'player/:name', element: <PlayerPage /> },
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
