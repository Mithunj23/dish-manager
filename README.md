# 🍽 Dish Manager — Full Stack Project

A production-ready dish management dashboard built with **Node.js + Express** (backend) and **React** (frontend). Dishes can be published/unpublished via a clean UI, with **real-time WebSocket sync** so any backend change instantly reflects in every open browser tab — no refresh needed.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Database Design](#database-design)
4. [API Reference](#api-reference)
5. [Real-Time Architecture](#real-time-architecture)
6. [Setup & Running](#setup--running)
7. [Feature Walkthrough](#feature-walkthrough)
8. [Testing Real-Time Updates](#testing-real-time-updates)
9. [How Each Requirement Is Met](#how-each-requirement-is-met)

---

## Tech Stack

| Layer      | Technology | Why |
|------------|-----------|-----|
| Backend    | Node.js + Express | Fast, minimal REST API server |
| Database   | **lowdb v3** (JSON file) | Pure JavaScript — zero native compilation, works on any Node version |
| Real-time  | WebSocket (`ws` package) | Push updates from server to all connected clients instantly |
| Frontend   | React 18 | Component-driven UI with hooks for state and side effects |
| Styling    | CSS Modules + CSS Variables | Scoped styles, no runtime overhead, easy theming |

> **Why lowdb instead of SQLite?**  
> `better-sqlite3` and `sqlite3` both require compiling native C++ bindings via `node-gyp`, which fails on Node.js v22 without build tools pre-installed. `lowdb` is 100% JavaScript — it stores data as a JSON file (`dishes.json`) with the same query interface, requires no compilation, and works on every platform out of the box.

---

## Project Structure

```
dish-manager/
│
├── backend/                        ← Node.js API server
│   ├── server.js                   ← Express routes + WebSocket setup
│   ├── database.js                 ← lowdb init, seed data, query helpers
│   ├── dishes.json                 ← Auto-created on first run (your "database")
│   └── package.json
│
├── frontend/                       ← React dashboard
│   ├── public/
│   │   └── index.html              ← HTML shell + Google Fonts
│   └── src/
│       ├── index.js                ← React entry point
│       ├── index.css               ← Global CSS reset + design tokens
│       ├── App.js                  ← Main dashboard (layout, filter, search)
│       ├── App.css                 ← Layout, grid, list, stats, sidebar styles
│       ├── useDishes.js            ← Custom hook: REST fetch + WebSocket sync
│       └── components/
│           ├── DishCard.js         ← Grid card component
│           ├── DishCard.module.css ← Card-scoped styles
│           ├── Toast.js            ← Notification system
│           └── Toast.module.css    ← Toast styles
│
└── README.md                       ← This file
```

---

## Database Design

The database is a JSON file (`backend/dishes.json`) managed by **lowdb**. It mirrors a traditional table structure:

```json
{
  "dishes": [
    {
      "dishId":      "d-001",
      "dishName":    "Margherita Pizza",
      "imageUrl":    "https://...",
      "isPublished": true
    }
  ]
}
```

### Schema

| Field | Type | Description |
|-------|------|-------------|
| `dishId` | `string` (PK) | Unique identifier, format `d-NNN` |
| `dishName` | `string` | Display name of the dish |
| `imageUrl` | `string` | Unsplash image URL |
| `isPublished` | `boolean` | `true` = Live (visible), `false` = Draft (hidden) |

### Seed Data

12 dishes are seeded automatically on the **first run** only. If `dishes.json` already exists with data, the seed is skipped so your changes persist across server restarts.

---

## API Reference

Base URL: `http://localhost:4000`

### `GET /api/dishes`

Returns all dishes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "dishId": "d-001",
      "dishName": "Margherita Pizza",
      "imageUrl": "https://images.unsplash.com/...",
      "isPublished": true
    },
    ...
  ]
}
```

---

### `GET /api/dishes/:id`

Returns a single dish by ID.

**Example:** `GET /api/dishes/d-003`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "dishId": "d-003",
    "dishName": "Caesar Salad",
    "imageUrl": "https://...",
    "isPublished": false
  }
}
```

**Response (404):**
```json
{ "success": false, "error": "Dish not found" }
```

---

### `PATCH /api/dishes/:id/toggle`

Toggles the `isPublished` field of a dish (`true → false` or `false → true`). Also broadcasts the change to all connected WebSocket clients.

**Example:** `PATCH /api/dishes/d-001/toggle`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "dishId": "d-001",
    "dishName": "Margherita Pizza",
    "imageUrl": "https://...",
    "isPublished": false
  }
}
```

---

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "dishes": 12,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Real-Time Architecture

```
 Dashboard Tab A          Backend Server            Dashboard Tab B
      │                        │                         │
      │── PATCH /toggle ───────►│                         │
      │                        │── broadcast via WS ─────►│
      │◄─────── REST 200 ───────│                         │
      │  (optimistic update)    │                         │
      │                        │                         │
      │  (WS fires too — UI     │   Tab B updates         │
      │   deduped by same val)  │   automatically ◄───────│
```

**How it works:**

1. The React app connects to `ws://localhost:4000` on mount.
2. The server immediately sends a `snapshot` message with all dishes — Tab B gets fresh data without any REST call.
3. When any client (or a `curl` command) calls `PATCH /api/dishes/:id/toggle`, the server:
   - Updates `dishes.json`
   - Returns the updated dish via HTTP
   - **Broadcasts** `{ type: "dish_updated", dish }` to **every** connected WebSocket client
4. Each React tab receives the push and updates its local state — no polling, no refresh.

**WebSocket Message Types:**

| Type | Direction | Payload |
|------|-----------|---------|
| `snapshot` | Server → Client | `{ type: "snapshot", dishes: [...] }` — sent on connect |
| `dish_updated` | Server → All Clients | `{ type: "dish_updated", dish: {...} }` — sent on every toggle |

---

## Setup & Running

### Prerequisites

- Node.js **v16 or higher** (including v22+)
- npm

### Step 1 — Backend

```bash
cd dish-manager/backend
npm install
npm start
```

You should see:
```
[DB] Seeded 12 dishes into dishes.json

🍽  Dish Manager API is running
   REST → http://localhost:4000/api/dishes
   WS   → ws://localhost:4000
```

### Step 2 — Frontend (new terminal)

```bash
cd dish-manager/frontend
npm install
npm start
```

React dev server opens at **http://localhost:3000** automatically.

> The `"proxy": "http://localhost:4000"` in `frontend/package.json` forwards `/api/*` requests to the backend during development — no CORS issues.

---

## Feature Walkthrough

### Dashboard Layout

- **Sidebar** — brand logo, navigation filters (All / Live / Draft), WebSocket connection status indicator
- **Topbar** — page title, dish count, search box, grid/list view toggle
- **Stats strip** — total, live, and draft counts update in real time
- **Content area** — dish cards (grid) or dish rows (list)

### Dish Card (Grid View)

Each card shows:
- Dish image (graceful fallback emoji if image fails)
- **Live / Draft** badge (top-right of image)
- Dish name + dish ID
- Toggle button: **Publish** (green) or **Unpublish** (grey → red on hover)
- Loading spinner while API call is in-flight

### List View

Same information in a compact horizontal row — useful when viewing many dishes at once.

### Search & Filter

- **Search** — filters by dish name in real time (client-side, instant)
- **Filter tabs** — All / Live / Draft — works alongside search
- Both are purely client-side with no extra API calls

### Toast Notifications

Every state change fires a colour-coded toast (bottom-right):
- 🟢 **Green** — dish published from the dashboard
- 🔴 **Red** — dish unpublished from the dashboard
- 🟡 **Amber** — change detected from the backend (WebSocket sync)

---

## Testing Real-Time Updates

To simulate a **backend-only change** (the bonus requirement), open a terminal while the server and React app are running:

```bash
# Unpublish dish d-002 directly from the backend
curl -X PATCH http://localhost:4000/api/dishes/d-002/toggle
```

Watch the browser — the card for "Chicken Tikka Masala" will flip to Draft **instantly** with an amber toast saying _"Backend changed 'Chicken Tikka Masala' → Draft"_. No page refresh, no polling delay.

You can open the dashboard in **multiple browser tabs** — all tabs update simultaneously when the toggle fires.

---

## How Each Requirement Is Met

| Requirement | Where |
|-------------|-------|
| Database schema with all 4 fields | `backend/database.js` — lowdb JSON structure |
| Seed data (12 dishes) | `backend/database.js` — `SEED` array, auto-inserted on first run |
| GET API — fetch all dishes | `backend/server.js` — `GET /api/dishes` |
| PATCH API — toggle isPublished | `backend/server.js` — `PATCH /api/dishes/:id/toggle` |
| React dashboard | `frontend/src/App.js` |
| Display all dishes with info | `frontend/src/components/DishCard.js` |
| Toggle button updates UI + backend | `frontend/src/useDishes.js` — `toggleDish()` |
| **Real-time updates (bonus)** | WebSocket in `server.js` + `useDishes.js` — push on every toggle |
