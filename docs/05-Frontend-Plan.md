# PeerTest Hub - Frontend Plan

## Overview

This document outlines the complete frontend architecture for PeerTest Hub using **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**. The frontend provides a modern, responsive interface for clients, testers, and administrators.

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5.x
- **Styling:** Tailwind CSS 3.x
- **Routing:** React Router 6.x
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form + Zod validation
- **Screenshot Annotation:** Fabric.js
- **HTTP Client:** Axios
- **Date/Time:** date-fns
- **Icons:** Heroicons
- **Charts:** Recharts

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Route Map](#2-route-map)
3. [Component Architecture](#3-component-architecture)
4. [Design System & Tailwind Config](#4-design-system--tailwind-config)
5. [State Management](#5-state-management)
6. [Screenshot Annotation](#6-screenshot-annotation)
7. [Authentication Flow](#7-authentication-flow)
8. [Key Features Implementation](#8-key-features-implementation)
9. [Responsive Design Strategy](#9-responsive-design-strategy)
10. [Performance Optimization](#10-performance-optimization)

---

## 1. Project Structure

```
peertest-hub-frontend/
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── api/                    # API client and services
│   │   ├── client.ts          # Axios instance
│   │   ├── auth.ts            # Auth API calls
│   │   ├── jobs.ts            # Job API calls
│   │   ├── submissions.ts     # Submission API calls
│   │   └── ...
│   ├── assets/                # Static assets
│   │   ├── images/
│   │   └── icons/
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── ...
│   │   ├── layout/           # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── forms/            # Form components
│   │   │   ├── FormField.tsx
│   │   │   ├── FormError.tsx
│   │   │   └── ...
│   │   └── shared/           # Shared feature components
│   │       ├── JobCard.tsx
│   │       ├── UserAvatar.tsx
│   │       ├── RatingDisplay.tsx
│   │       ├── StatusBadge.tsx
│   │       └── ...
│   ├── features/             # Feature-based modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ForgotPasswordForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   └── pages/
│   │   │       ├── LoginPage.tsx
│   │   │       └── RegisterPage.tsx
│   │   ├── jobs/
│   │   │   ├── components/
│   │   │   │   ├── JobList.tsx
│   │   │   │   ├── JobDetail.tsx
│   │   │   │   ├── JobForm.tsx
│   │   │   │   ├── JobFilters.tsx
│   │   │   │   └── UserJourneyBuilder.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useJobs.ts
│   │   │   │   └── useJobFilters.ts
│   │   │   └── pages/
│   │   │       ├── JobMarketplacePage.tsx
│   │   │       ├── JobDetailPage.tsx
│   │   │       ├── CreateJobPage.tsx
│   │   │       └── MyJobsPage.tsx
│   │   ├── submissions/
│   │   │   ├── components/
│   │   │   │   ├── SubmissionForm.tsx
│   │   │   │   ├── TestResultsEditor.tsx
│   │   │   │   ├── BugReportForm.tsx
│   │   │   │   ├── ScreenshotAnnotator.tsx
│   │   │   │   └── SubmissionReview.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSubmissions.ts
│   │   │   └── pages/
│   │   │       ├── SubmissionFormPage.tsx
│   │   │       ├── SubmissionDetailPage.tsx
│   │   │       └── MySubmissionsPage.tsx
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── DashboardStats.tsx
│   │   │   │   ├── RecentActivity.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   └── pages/
│   │   │       ├── ClientDashboard.tsx
│   │   │       ├── TesterDashboard.tsx
│   │   │       └── AdminDashboard.tsx
│   │   ├── payments/
│   │   │   ├── components/
│   │   │   │   ├── PaymentMethodList.tsx
│   │   │   │   ├── AddPaymentMethod.tsx
│   │   │   │   ├── EscrowStatus.tsx
│   │   │   │   └── EarningsChart.tsx
│   │   │   └── pages/
│   │   │       ├── PaymentMethodsPage.tsx
│   │   │       └── EarningsPage.tsx
│   │   ├── disputes/
│   │   ├── ratings/
│   │   ├── notifications/
│   │   ├── organizations/
│   │   └── admin/
│   ├── hooks/                # Global hooks
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useLocalStorage.ts
│   │   └── ...
│   ├── layouts/              # Page layouts
│   │   ├── AuthLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── PublicLayout.tsx
│   ├── routes/               # Routing configuration
│   │   ├── index.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleRoute.tsx
│   ├── store/                # Zustand stores
│   │   ├── authStore.ts
│   │   ├── notificationStore.ts
│   │   └── uiStore.ts
│   ├── types/                # TypeScript types
│   │   ├── api.ts
│   │   ├── user.ts
│   │   ├── job.ts
│   │   └── ...
│   ├── utils/                # Utility functions
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   ├── constants.ts
│   │   └── ...
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles + Tailwind imports
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 2. Route Map

### Public Routes

```tsx
// No authentication required
/                           → Landing Page
/login                      → Login Page
/register                   → Register Page (with role selection)
/forgot-password            → Forgot Password
/reset-password/:token      → Reset Password
/verify-email/:token        → Email Verification
/jobs                       → Job Marketplace (Browse)
/jobs/:id                   → Job Detail (Preview)
/testers/:id                → Tester Public Profile
/about                      → About Page
/pricing                    → Pricing Page
/terms                      → Terms of Service
/privacy                    → Privacy Policy
```

### Client Routes

```tsx
// Role: client
/dashboard                  → Client Dashboard
/projects                   → My Projects
/projects/new               → Create Project
/projects/:id               → Project Detail
/projects/:id/edit          → Edit Project
/jobs/my-jobs               → My Jobs (as client)
/jobs/create                → Create Job
/jobs/:id                   → Job Detail (full access)
/jobs/:id/edit              → Edit Job
/jobs/:id/submissions       → View Submissions for Job
/submissions/:id            → View Submission Detail
/submissions/:id/review     → Review Submission
/payments                   → Payment Methods
/payments/history           → Payment History
/notifications              → Notifications
/settings                   → Account Settings
/settings/profile           → Profile Settings
/settings/notifications     → Notification Preferences
/settings/billing           → Billing Settings
```

### Tester Routes

```tsx
// Role: tester
/dashboard                  → Tester Dashboard
/jobs                       → Job Marketplace (Browse & Claim)
/jobs/:id                   → Job Detail (full if claimed)
/jobs/my-assignments        → My Assignments
/submissions/new/:jobId     → Create Submission
/submissions/:id            → My Submission Detail
/submissions/:id/edit       → Edit Submission
/earnings                   → Earnings & Payouts
/qualifications             → Qualification Status
/qualifications/test        → Take Qualification Test
/ratings                    → My Ratings
/settings                   → Account Settings
/settings/profile           → Profile Settings
/settings/tester-info       → Tester Information
/settings/payout            → Payout Settings (Stripe Connect)
```

### Admin Routes

```tsx
// Role: admin
/admin                      → Admin Dashboard
/admin/users                → User Management
/admin/users/:id            → User Detail
/admin/jobs                 → All Jobs
/admin/submissions          → All Submissions
/admin/disputes             → Dispute Management
/admin/disputes/:id         → Dispute Detail
/admin/qualifications       → Qualification Tests
/admin/qualifications/:id   → Review Test
/admin/templates            → AI Templates Management
/admin/analytics            → Analytics & Reports
/admin/settings             → System Settings
```

### Organization Routes (Innovation Group)

```tsx
// Organization features
/organizations                      → My Organizations
/organizations/new                  → Create Organization
/organizations/:id                  → Organization Dashboard
/organizations/:id/members          → Team Members
/organizations/:id/projects         → Organization Projects
/organizations/:id/billing          → Organization Billing
/organizations/:id/settings         → Organization Settings
```

---

## 3. Component Architecture

### Base UI Components (`components/ui/`)

#### Button Component

```tsx
// components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
        ghost: 'text-gray-700 hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)

interface ButtonProps 
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </>
        ) : children}
      </button>
    )
  }
)
```

#### Card Component

```tsx
// components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  hover = false 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  return (
    <div className={`
      bg-white rounded-lg border border-gray-200 shadow-sm
      ${paddingClasses[padding]}
      ${hover ? 'transition-shadow hover:shadow-md' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}
```

#### Badge Component

```tsx
// components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  size = 'md' 
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  }
  
  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      ${variants[variant]}
      ${sizes[size]}
    `}>
      {children}
    </span>
  )
}
```

### Feature Components

#### Job Card

```tsx
// components/shared/JobCard.tsx
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatRelativeTime } from '@/utils/format'
import type { Job } from '@/types/job'

interface JobCardProps {
  job: Job
  onView?: () => void
  onClaim?: () => void
  showActions?: boolean
}

export const JobCard: React.FC<JobCardProps> = ({ 
  job, 
  onView, 
  onClaim,
  showActions = true 
}) => {
  return (
    <Card hover className="cursor-pointer" onClick={onView}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {job.title}
        </h3>
        <Badge variant="info">
          {formatCurrency(job.budget_per_tester_usd)}
        </Badge>
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {job.description}
      </p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge size="sm">{job.test_type}</Badge>
        <Badge size="sm" variant="default">{job.tester_level}</Badge>
        {job.required_devices.slice(0, 2).map(device => (
          <Badge key={device} size="sm" variant="default">{device}</Badge>
        ))}
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center text-gray-500">
          <ClockIcon className="h-4 w-4 mr-1" />
          {formatRelativeTime(job.deadline)}
        </div>
        
        <div className="text-gray-500">
          {job.assigned_count}/{job.max_testers} testers
        </div>
      </div>
      
      {showActions && (
        <div className="mt-4 pt-4 border-t">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation()
              onClaim?.()
            }}
            className="w-full"
          >
            Claim Job
          </Button>
        </div>
      )}
    </Card>
  )
}
```

---

## 4. Design System & Tailwind Config

### Tailwind Configuration

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',  // Main brand color
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        }
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
```

### Global Styles

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-gray-200;
  }
  
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
  
  h1 {
    @apply text-4xl font-bold;
  }
  
  h2 {
    @apply text-3xl font-bold;
  }
  
  h3 {
    @apply text-2xl font-semibold;
  }
  
  h4 {
    @apply text-xl font-semibold;
  }
  
  p {
    @apply text-base leading-relaxed;
  }
}

@layer components {
  .container-custom {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
  }
  
  .card-hover {
    @apply transition-all duration-200 hover:shadow-md hover:-translate-y-0.5;
  }
  
  .input-field {
    @apply block w-full rounded-lg border-gray-300 shadow-sm 
           focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
  }
  
  .label-text {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

---

## 5. State Management

### Zustand Stores

#### Auth Store

```tsx
// store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/user'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => 
        set({ user, token, isAuthenticated: true }),
      
      logout: () => 
        set({ user: null, token: null, isAuthenticated: false }),
      
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

#### Notification Store

```tsx
// store/notificationStore.ts
import { create } from 'zustand'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: Math.random().toString(36) }
      ]
    })),
  
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    })),
}))
```

### React Query Setup

```tsx
// api/client.ts
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

```tsx
// App.tsx - React Query setup
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* App routes */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

---

## 6. Screenshot Annotation

### Fabric.js Integration

```tsx
// features/submissions/components/ScreenshotAnnotator.tsx
import React, { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { Button } from '@/components/ui/Button'

interface ScreenshotAnnotatorProps {
  imageUrl: string
  onSave: (annotatedImageUrl: string) => void
}

export const ScreenshotAnnotator: React.FC<ScreenshotAnnotatorProps> = ({
  imageUrl,
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [tool, setTool] = useState<'arrow' | 'rectangle' | 'text' | 'pen'>('arrow')
  const [isDrawing, setIsDrawing] = useState(false)
  
  useEffect(() => {
    if (!canvasRef.current) return
    
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff'
    })
    
    // Load image
    fabric.Image.fromURL(imageUrl, (img) => {
      const scale = Math.min(
        fabricCanvas.width! / img.width!,
        fabricCanvas.height! / img.height!
      )
      img.scale(scale)
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas))
    })
    
    setCanvas(fabricCanvas)
    
    return () => {
      fabricCanvas.dispose()
    }
  }, [imageUrl])
  
  useEffect(() => {
    if (!canvas) return
    
    canvas.isDrawingMode = tool === 'pen'
    
    if (tool === 'pen') {
      canvas.freeDrawingBrush.color = '#ef4444'
      canvas.freeDrawingBrush.width = 3
    }
  }, [canvas, tool])
  
  const addArrow = () => {
    if (!canvas) return
    
    const arrow = new fabric.Path('M 0 0 L 40 0 L 40 -10 L 60 10 L 40 30 L 40 20 L 0 20 Z', {
      fill: '#ef4444',
      left: 100,
      top: 100,
      angle: 45
    })
    
    canvas.add(arrow)
  }
  
  const addRectangle = () => {
    if (!canvas) return
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: 'transparent',
      stroke: '#ef4444',
      strokeWidth: 3
    })
    
    canvas.add(rect)
  }
  
  const addText = () => {
    if (!canvas) return
    
    const text = new fabric.IText('Click to edit', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: '#ef4444',
      fontFamily: 'Arial',
      backgroundColor: 'rgba(255, 255, 255, 0.8)'
    })
    
    canvas.add(text)
  }
  
  const handleSave = async () => {
    if (!canvas) return
    
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1
    })
    
    onSave(dataURL)
  }
  
  const handleClear = () => {
    if (!canvas) return
    canvas.getObjects().forEach(obj => {
      if (obj !== canvas.backgroundImage) {
        canvas.remove(obj)
      }
    })
    canvas.renderAll()
  }
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 p-4 bg-white rounded-lg border">
        <Button
          variant={tool === 'arrow' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setTool('arrow')
            addArrow()
          }}
        >
          ← Arrow
        </Button>
        
        <Button
          variant={tool === 'rectangle' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setTool('rectangle')
            addRectangle()
          }}
        >
          □ Box
        </Button>
        
        <Button
          variant={tool === 'text' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setTool('text')
            addText()
          }}
        >
          T Text
        </Button>
        
        <Button
          variant={tool === 'pen' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTool('pen')}
        >
          ✎ Draw
        </Button>
        
        <div className="flex-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
        >
          Clear All
        </Button>
        
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
      
      {/* Canvas */}
      <div className="bg-gray-100 p-4 rounded-lg inline-block">
        <canvas ref={canvasRef} />
      </div>
      
      {/* Instructions */}
      <div className="text-sm text-gray-600">
        <p>💡 <strong>Tips:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Click objects to select and move them</li>
          <li>Use corner handles to resize</li>
          <li>Double-click text to edit</li>
          <li>Delete key removes selected objects</li>
        </ul>
      </div>
    </div>
  )
}
```

### Screenshot Upload Flow

```tsx
// features/submissions/components/ScreenshotUpload.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ScreenshotAnnotator } from './ScreenshotAnnotator'
import { uploadScreenshot } from '@/api/submissions'

interface ScreenshotUploadProps {
  submissionId: string
  onUploadComplete: (url: string) => void
}

export const ScreenshotUpload: React.FC<ScreenshotUploadProps> = ({
  submissionId,
  onUploadComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [showAnnotator, setShowAnnotator] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setShowAnnotator(false)
  }
  
  const handleAnnotate = () => {
    setShowAnnotator(true)
  }
  
  const handleSaveAnnotation = async (annotatedDataUrl: string) => {
    setIsUploading(true)
    
    try {
      // Convert data URL to Blob
      const response = await fetch(annotatedDataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'annotated-screenshot.png', { type: 'image/png' })
      
      // Upload to server
      const result = await uploadScreenshot(submissionId, file)
      onUploadComplete(result.screenshot_url)
      
      // Reset
      setSelectedFile(null)
      setPreviewUrl('')
      setShowAnnotator(false)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleUploadWithoutAnnotation = async () => {
    if (!selectedFile) return
    
    setIsUploading(true)
    try {
      const result = await uploadScreenshot(submissionId, selectedFile)
      onUploadComplete(result.screenshot_url)
      setSelectedFile(null)
      setPreviewUrl('')
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }
  
  return (
    <div className="space-y-4">
      {!previewUrl ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="screenshot-upload"
          />
          <label htmlFor="screenshot-upload" className="cursor-pointer">
            <div className="space-y-2">
              <div className="text-4xl">📸</div>
              <p className="text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG up to 10MB
              </p>
            </div>
          </label>
        </div>
      ) : showAnnotator ? (
        <ScreenshotAnnotator
          imageUrl={previewUrl}
          onSave={handleSaveAnnotation}
        />
      ) : (
        <div className="space-y-4">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="max-w-full rounded-lg border"
          />
          
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleAnnotate}
            >
              Annotate Screenshot
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleUploadWithoutAnnotation}
              isLoading={isUploading}
            >
              Upload Without Annotation
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedFile(null)
                setPreviewUrl('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 7. Authentication Flow

### Protected Route Component

```tsx
// routes/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}
```

### Login Form

```tsx
// features/auth/components/LoginForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })
  
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.access_token)
      navigate('/dashboard')
    },
    onError: (error: any) => {
      alert(error.response?.data?.error?.message || 'Login failed')
    }
  })
  
  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label-text">Email</label>
        <Input
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
      </div>
      
      <div>
        <label className="label-text">Password</label>
        <Input
          type="password"
          {...register('password')}
          error={errors.password?.message}
        />
      </div>
      
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isLoading={loginMutation.isPending}
      >
        Sign In
      </Button>
    </form>
  )
}
```

---

## 8. Key Features Implementation

### User Journey Builder

```tsx
// features/jobs/components/UserJourneyBuilder.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Step {
  step_number: number
  action: string
  expected_result: string
}

interface UserJourneyBuilderProps {
  initialSteps?: Step[]
  onChange: (steps: Step[]) => void
}

export const UserJourneyBuilder: React.FC<UserJourneyBuilderProps> = ({
  initialSteps = [],
  onChange
}) => {
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  
  const addStep = () => {
    const newStep: Step = {
      step_number: steps.length + 1,
      action: '',
      expected_result: ''
    }
    const updated = [...steps, newStep]
    setSteps(updated)
    onChange(updated)
  }
  
  const updateStep = (index: number, field: keyof Step, value: string) => {
    const updated = steps.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    )
    setSteps(updated)
    onChange(updated)
  }
  
  const removeStep = (index: number) => {
    const updated = steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, step_number: i + 1 }))
    setSteps(updated)
    onChange(updated)
  }
  
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <Card key={index} padding="md">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
              {step.step_number}
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <label className="label-text">Action</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Describe the action to perform"
                  value={step.action}
                  onChange={(e) => updateStep(index, 'action', e.target.value)}
                />
              </div>
              
              <div>
                <label className="label-text">Expected Result</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="What should happen?"
                  value={step.expected_result}
                  onChange={(e) => updateStep(index, 'expected_result', e.target.value)}
                />
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeStep(index)}
            >
              ✕
            </Button>
          </div>
        </Card>
      ))}
      
      <Button
        variant="outline"
        onClick={addStep}
        className="w-full"
      >
        + Add Step
      </Button>
    </div>
  )
}
```

---

## 9. Responsive Design Strategy

### Breakpoints

```tsx
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    
    return () => media.removeEventListener('change', listener)
  }, [query])
  
  return matches
}

// Usage
export const useResponsive = () => {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)')
  const isDesktop = useMediaQuery('(min-width: 1025px)')
  
  return { isMobile, isTablet, isDesktop }
}
```

### Mobile-First Approach

All components should be designed mobile-first with progressive enhancement:

```tsx
// Example: Responsive Job Card Grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {jobs.map(job => (
    <JobCard key={job.id} job={job} />
  ))}
</div>
```

---

## 10. Performance Optimization

### Code Splitting

```tsx
// Lazy load routes
import { lazy, Suspense } from 'react'

const JobMarketplacePage = lazy(() => import('@/features/jobs/pages/JobMarketplacePage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <JobMarketplacePage />
</Suspense>
```

### Image Optimization

```tsx
// Use responsive images
<img 
  src={imageUrl}
  srcSet={`${imageUrl}?w=400 400w, ${imageUrl}?w=800 800w`}
  sizes="(max-width: 640px) 400px, 800px"
  loading="lazy"
  alt="Description"
/>
```

### React Query Optimization

```tsx
// Prefetch on hover
const prefetchJob = (jobId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId)
  })
}

<JobCard 
  job={job}
  onMouseEnter={() => prefetchJob(job.id)}
/>
```

---

## Assumptions and Alternatives

### Assumptions
1. **Modern browsers** (ES2020+ support)
2. **High-speed internet** for file uploads
3. **Desktop-first for complex workflows** (submission creation, admin panel)
4. **Mobile-optimized for browsing** (job marketplace, dashboard)

### Alternative Approaches
1. **Next.js** instead of Vite for SSR/SSG
2. **Redux Toolkit** instead of Zustand
3. **TanStack Router** instead of React Router
4. **Styled Components** instead of Tailwind
5. **Konva** instead of Fabric.js for canvas

---

## Next Steps

1. **Initialize Vite project** with React + TypeScript
2. **Install dependencies** (Tailwind, React Query, etc.)
3. **Set up folder structure** and base components
4. **Implement authentication** flow
5. **Build job marketplace** and submission features
6. **Integrate with backend API**
7. **Add screenshot annotation** feature
8. **Comprehensive testing** (Vitest + Testing Library)
9. **Build and deploy** to production

