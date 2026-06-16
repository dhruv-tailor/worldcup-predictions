import { StrictMode, lazy } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProvider } from './context/AppContext'
import Layout from './Layout'
import './index.css'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GamePage = lazy(() => import('./pages/GamePage'))
const BreakdownPage = lazy(() => import('./pages/BreakdownPage'))
const UpcomingPage = lazy(() => import('./pages/UpcomingPage'))
const PlayerPage = lazy(() => import('./pages/PlayerPage'))

declare global {
  interface Window {
    __worldCupRoot?: Root
  }
}

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'game/:id', element: <GamePage /> },
        { path: 'breakdown', element: <BreakdownPage /> },
        { path: 'upcoming', element: <UpcomingPage /> },
        { path: 'player/:name', element: <PlayerPage /> },
      ],
    },
  ],
  { basename: '/worldcup-predictions/' },
)

const container = document.getElementById('root')!
const root = window.__worldCupRoot ?? createRoot(container)
window.__worldCupRoot = root

root.render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>,
)
