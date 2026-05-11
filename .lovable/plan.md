

## Problem

The "Entrar" (login) button exists in the navbar, but on mobile screens (under 900px) the entire `.nav-links-list` is hidden via CSS (`display: none`). This means mobile users cannot see or tap the login button.

## Plan

### 1. Add a visible mobile login button to the navbar

Add a separate "Entrar" button **outside** `.nav-links-list` that is only visible on mobile (shown below 900px, hidden above).

**File: `src/pages/Index.tsx`**
- Add a `Link` to `/auth?mode=login` with class `nav-login-mobile` right after the `.nav-links-list` div, inside the `<nav>`.

### 2. Style the mobile login button

**File: `src/styles/landing.css`**
- `.nav-login-mobile`: hidden by default (`display: none`)
- At `@media (max-width: 900px)`: show as a green outline button, similar to the desktop `.nav-login-btn` style but slightly smaller to fit the mobile nav bar

This keeps the desktop nav unchanged and gives mobile users a visible login entry point.

