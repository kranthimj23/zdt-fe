# Project Registration & Configuration - UI Designs

## Iteration 00 | Next.js 14 + shadcn/ui + Tailwind CSS

---

## Table of Contents

1. [Design System & Tokens](#1-design-system--tokens)
2. [Navigation & Layout](#2-navigation--layout)
3. [Screen 1: Project List](#3-screen-1-project-list)
4. [Screen 2: Onboarding Wizard](#4-screen-2-onboarding-wizard)
5. [Screen 3: Project Overview](#5-screen-3-project-overview)
6. [Screen 4: Project Settings](#6-screen-4-project-settings)
7. [Screen 5: Promotion Repo](#7-screen-5-promotion-repo)
8. [Screen 6: Source Repos](#8-screen-6-source-repos)
9. [Screen 7: Environments](#9-screen-7-environments)
10. [Screen 8: Credentials](#10-screen-8-credentials)
11. [Screen 9: Branch Tracker](#11-screen-9-branch-tracker)
12. [Screen 10: Config Export](#12-screen-10-config-export)
13. [Modals & Dialogs](#13-modals--dialogs)
14. [Mobile Responsiveness](#14-mobile-responsiveness)
15. [Next.js App Router Structure](#15-nextjs-app-router-structure)
16. [State Management](#16-state-management)
17. [API Coverage Matrix](#17-api-coverage-matrix)

---

## 1. Design System & Tokens

### Color Palette

```
Primary:       hsl(222.2, 84%, 4.9%)     --  Slate 950 (sidebar, headers)
Primary FG:    hsl(210, 40%, 98%)         --  White text on primary
Accent:        hsl(217.2, 91.2%, 59.8%)   --  Blue 500 (buttons, links)
Destructive:   hsl(0, 84.2%, 60.2%)       --  Red 500 (delete, danger)
Warning:       hsl(38, 92%, 50%)          --  Amber 500 (expiring creds)
Success:       hsl(142.1, 76.2%, 36.3%)   --  Green 600 (verified, active)
Muted:         hsl(210, 40%, 96.1%)       --  Gray 100 (backgrounds)
Border:        hsl(214.3, 31.8%, 91.4%)   --  Gray 200 (dividers)
```

### Typography

```
Font:          Inter (sans-serif)
H1:            text-3xl font-bold tracking-tight      (30px, page titles)
H2:            text-2xl font-semibold tracking-tight   (24px, section headers)
H3:            text-lg font-semibold                   (18px, card headers)
Body:          text-sm                                 (14px, default text)
Caption:       text-xs text-muted-foreground           (12px, timestamps, labels)
Mono:          font-mono text-sm                       (14px, URLs, code, JSON)
```

### Spacing Scale

```
Page padding:     p-6 (24px)
Card gap:         gap-6 (24px)
Section gap:      space-y-8 (32px)
Form field gap:   space-y-4 (16px)
Inline gap:       gap-2 (8px)
```

### shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Button` | All actions (primary, secondary, destructive, ghost, outline) |
| `Card` | Project cards, summary cards, form sections |
| `Input` | Text fields, URLs, names |
| `Select` | Dropdowns (repo type, env template, credential type) |
| `Table` | Data grids (repos, environments, branches, credentials) |
| `Dialog` | Confirmation modals, add/edit forms |
| `Sheet` | Mobile sidebar navigation |
| `Badge` | Status indicators (active, archived, verified) |
| `Tabs` | Section switching within pages |
| `Breadcrumb` | Navigation breadcrumbs |
| `Skeleton` | Loading placeholders |
| `Alert` | Inline warnings, errors, info messages |
| `AlertDialog` | Destructive action confirmations |
| `Toast` | Success/error notifications |
| `Tooltip` | Icon button labels, truncated text |
| `Separator` | Visual dividers |
| `Switch` | Boolean toggles (isProduction) |
| `Form` | React Hook Form integration (all forms) |
| `Command` | Search/filter in project list |
| `Pagination` | Project list pagination |
| `Progress` | Wizard step progress |
| `Collapsible` | Sidebar sections |
| `DropdownMenu` | Row actions (edit, delete, verify) |
| `HoverCard` | Preview details on hover |
| `ScrollArea` | JSON viewer, long lists |
| `Textarea` | Description fields |
| `Label` | Form field labels |
| `Popover` | Date pickers, info popovers |
| `Calendar` | Credential expiry date picker |
| `Checkbox` | Bulk select in source repos |

---

## 2. Navigation & Layout

### App Shell

```
+------------------------------------------------------------------+
| HEADER (h-14, border-b, fixed top)                               |
| +------+------------------------------------------+------+------+|
| | Logo | Garuda.One                                | [?]  | [AV]||
| +------+------------------------------------------+------+------+|
+--------+---------------------------------------------------------+
| SIDEBAR| MAIN CONTENT                                            |
| (w-64) |                                                         |
| fixed  | +-----------------------------------------------------+|
| left   | | BREADCRUMB                                           ||
|        | | Projects > Payment Gateway > Environments            ||
|        | +-----------------------------------------------------+|
| [Proj] | |                                                     ||
| [----] | | PAGE CONTENT                                        ||
|  Dash  | |                                                     ||
|  Proj  | | (scrollable, p-6)                                   ||
|        | |                                                     ||
| [Proj] | |                                                     ||
| [----] | |                                                     ||
|  Over  | |                                                     ||
|  Promo | |                                                     ||
|  Repos | |                                                     ||
|  Envs  | |                                                     ||
|  Creds | |                                                     ||
|  Branc | |                                                     ||
|  Conf  | |                                                     ||
|  Sett  | |                                                     ||
+--------+---------------------------------------------------------+
```

### Sidebar Structure

```
SIDEBAR (w-64, bg-sidebar, border-r)
+----------------------------+
| Garuda.One            [<<] |   <-- Collapsible toggle
+----------------------------+
| [icon] Dashboard           |   /
| [icon] Projects            |   /projects
+----------------------------+
|                            |
| PROJECT CONTEXT            |   (visible when project selected)
| "Payment Gateway"          |
+----------------------------+
| [icon] Overview            |   /projects/[id]
| [icon] Promotion Repo      |   /projects/[id]/promotion-repo
| [icon] Source Repos         |   /projects/[id]/source-repos
| [icon] Environments        |   /projects/[id]/environments
| [icon] Credentials         |   /projects/[id]/credentials
| [icon] Branch Tracker      |   /projects/[id]/branches
| [icon] Config Export        |   /projects/[id]/config
+----------------------------+
| [icon] Settings            |   /projects/[id]/settings
+----------------------------+
```

**Components:** `Sidebar`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarGroup`, `SidebarGroupLabel`, `Collapsible`

### Breadcrumb Pattern

```
/projects                        →  Projects
/projects/new                    →  Projects > New Project
/projects/[id]                   →  Projects > {displayName}
/projects/[id]/source-repos      →  Projects > {displayName} > Source Repos
/projects/[id]/settings          →  Projects > {displayName} > Settings
```

**Component:** `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`

### Route Map

```
/                                    →  Redirect to /projects
/projects                            →  Project List (Screen 1)
/projects/new                        →  Onboarding Wizard (Screen 2)
/projects/[id]                       →  Project Overview (Screen 3)
/projects/[id]/settings              →  Project Settings (Screen 4)
/projects/[id]/promotion-repo        →  Promotion Repo (Screen 5)
/projects/[id]/source-repos          →  Source Repos (Screen 6)
/projects/[id]/environments          →  Environments (Screen 7)
/projects/[id]/credentials           →  Credentials (Screen 8)
/projects/[id]/branches              →  Branch Tracker (Screen 9)
/projects/[id]/config                →  Config Export (Screen 10)
```

---

## 3. Screen 1: Project List

**Route:** `/projects`
**API:** `GET /api/projects?page=1&limit=20`

### Wireframe

```
+------------------------------------------------------------------+
| Projects                                          [+ New Project] |
+------------------------------------------------------------------+
| +-------------------------------+  +---------------------------+  |
| | [Search projects...]          |  | Status: [All v] Type [v]  |  |
| +-------------------------------+  +---------------------------+  |
|                                                                   |
| View:  [Grid] [Table]                          Showing 1-20 of 47|
|                                                                   |
| GRID VIEW:                                                        |
| +---------------------+ +---------------------+ +---------------+ |
| | Payment Gateway      | | Auth Service        | | Data Pipeline | |
| | payments-team        | | platform-team       | | data-team     | |
| |                      | |                     | |               | |
| | 12 repos  5 envs     | | 3 repos   4 envs   | | 8 repos  3 env| |
| | [Active]  [Verified] | | [Active]  [!Unver]  | | [Archived]    | |
| |                      | |                     | |               | |
| | Updated 2h ago       | | Updated 1d ago      | | Updated 30d   | |
| +---------------------+ +---------------------+ +---------------+ |
|                                                                   |
| TABLE VIEW:                                                       |
| +------+-------------+--------+------+------+--------+---------+ |
| |      | Name        | Team   | Repos| Envs | Status | Updated | |
| +------+-------------+--------+------+------+--------+---------+ |
| | [ ]  | Payment GW  | pay-tm |  12  |  5   | Active | 2h ago  | |
| | [ ]  | Auth Svc    | plt-tm |   3  |  4   | Active | 1d ago  | |
| | [ ]  | Data Pipe   | dat-tm |   8  |  3   | Archvd | 30d ago | |
| +------+-------------+--------+------+------+--------+---------+ |
|                                                                   |
| [< Prev]  1  2  3  ...  5  [Next >]                              |
+------------------------------------------------------------------+
```

### Component Breakdown

| Element | Component | Props/Notes |
|---------|-----------|-------------|
| Page title | `h1` | `text-3xl font-bold tracking-tight` |
| New Project button | `Button` | `variant="default"`, links to `/projects/new` |
| Search bar | `Input` | `type="search"`, `placeholder="Search projects..."`, debounced 300ms |
| Status filter | `Select` | Options: All, Active, Inactive, Archived |
| View toggle | `Button` (group) | `variant="outline"`, icons for grid/table |
| Project card | `Card` | `CardHeader`, `CardContent`, `CardFooter` |
| Status badge | `Badge` | `variant="default"` (active), `variant="secondary"` (inactive), `variant="outline"` (archived) |
| Verification badge | `Badge` | Green checkmark (verified), amber warning (unverified) |
| Data table | `Table` | Sortable columns: Name, Team, Status, Updated |
| Row checkbox | `Checkbox` | For bulk actions |
| Pagination | `Pagination` | `PaginationContent`, `PaginationItem`, `PaginationLink` |
| Project count | `p` | `text-sm text-muted-foreground` |

### States

**Empty State:**
```
+------------------------------------------------------------------+
|                                                                   |
|                    [illustration: empty folder]                    |
|                                                                   |
|                    No projects registered yet                     |
|            Get started by creating your first project             |
|                                                                   |
|                       [+ New Project]                             |
|                                                                   |
+------------------------------------------------------------------+
```

**Loading State:**
```
+------------------------------------------------------------------+
| Projects                                          [+ New Project] |
+------------------------------------------------------------------+
| +-------------------------------+                                 |
| | [Search projects...]          |                                 |
| +-------------------------------+                                 |
|                                                                   |
| +---------------------+ +---------------------+ +---------------+ |
| | [Skeleton]           | | [Skeleton]           | | [Skeleton]   | |
| | [Skeleton]           | | [Skeleton]           | | [Skeleton]   | |
| | [Skeleton]           | | [Skeleton]           | | [Skeleton]   | |
| +---------------------+ +---------------------+ +---------------+ |
+------------------------------------------------------------------+
```
**Component:** `Skeleton` - 6 card-shaped skeletons in grid layout.

**Error State:**
```
+------------------------------------------------------------------+
|  [!] Failed to load projects                                      |
|  Could not connect to the server. Please try again.               |
|  [Retry]                                                          |
+------------------------------------------------------------------+
```
**Component:** `Alert` with `variant="destructive"`, `Button` for retry.

### Interactions

| Action | Behavior |
|--------|----------|
| Click project card/row | Navigate to `/projects/[id]` |
| Click "New Project" | Navigate to `/projects/new` |
| Type in search | Debounce 300ms, filter by name/team client-side (or server if >100 projects) |
| Change status filter | Re-fetch with `?status=active` query param |
| Toggle grid/table | Persist preference in `localStorage` |
| Click column header (table) | Sort ascending/descending |
| Click pagination | Fetch page with `?page=N&limit=20` |

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects?page=1&limit=20` | GET |
| Pagination | `/api/projects?page=N&limit=20` | GET |
| Search | `/api/projects?page=1&limit=20&search=term` | GET |
| Filter | `/api/projects?page=1&limit=20&status=active` | GET |

---

## 4. Screen 2: Onboarding Wizard

**Route:** `/projects/new`
**Purpose:** 5-step guided project creation + completion screen

### Wizard Layout

```
+------------------------------------------------------------------+
| Projects > New Project                                            |
+------------------------------------------------------------------+
|                                                                   |
|  Step 1        Step 2        Step 3        Step 4        Step 5   |
|  [*]---------->[ ]---------->[ ]---------->[ ]---------->[ ]      |
|  Project       Promotion     Source        Environments  Creds    |
|  Details       Repo          Repos                                |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  STEP CONTENT AREA                                                |
|  (changes per step)                                               |
|                                                                   |
+------------------------------------------------------------------+
|                                           [Back]  [Next Step ->]  |
+------------------------------------------------------------------+
```

**Component:** `Progress` or custom step indicator, `Card` for content area.

### Step 1: Project Details

```
+------------------------------------------------------------------+
| Step 1 of 5: Project Details                                      |
+------------------------------------------------------------------+
|                                                                   |
| +------------------------------------------------------------+   |
| | Project Name *                                              |   |
| | [payment-gateway                               ]            |   |
| | Lowercase, alphanumeric with hyphens. Max 63 chars.         |   |
| +------------------------------------------------------------+   |
|                                                                   |
| +------------------------------------------------------------+   |
| | Display Name *                                              |   |
| | [Payment Gateway Service                       ]            |   |
| +------------------------------------------------------------+   |
|                                                                   |
| +------------------------------------------------------------+   |
| | Description                                                 |   |
| | [                                              ]            |   |
| | [                                              ]            |   |
| +------------------------------------------------------------+   |
|                                                                   |
| +---------------------------+ +------------------------------+    |
| | Team *                    | | Team Email *                 |    |
| | [payments-team         ]  | | [pay-team@company.com    ]   |    |
| +---------------------------+ +------------------------------+    |
|                                                                   |
|                                           [Cancel] [Next Step ->] |
+------------------------------------------------------------------+
```

| Element | Component | Validation |
|---------|-----------|------------|
| Project Name | `Input` | Required, `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, max 63 chars |
| Display Name | `Input` | Required |
| Description | `Textarea` | Optional |
| Team | `Input` | Required |
| Team Email | `Input` | Required, valid email format |
| Cancel | `Button variant="outline"` | Confirm discard via `AlertDialog` |
| Next Step | `Button variant="default"` | Validates form before proceeding |

**API on Next:** `POST /api/projects` — Creates the project, stores the returned `id` for subsequent steps.

### Step 2: Promotion Repository

```
+------------------------------------------------------------------+
| Step 2 of 5: Promotion Repository                                 |
+------------------------------------------------------------------+
|                                                                   |
| This is the Helm chart repository that holds environment-specific |
| values files for all your services.                               |
|                                                                   |
| +------------------------------------------------------------+   |
| | Repository URL *                                            |   |
| | [https://github.com/org/promo-helm-charts.git  ]            |   |
| | Must be an HTTPS Git URL ending in .git                     |   |
| +------------------------------------------------------------+   |
|                                                                   |
| +---------------------------+ +------------------------------+    |
| | Default Branch            | | Helm Charts Path             |    |
| | [master              ]    | | [helm-charts            ]    |    |
| +---------------------------+ +------------------------------+    |
|                                                                   |
| +------------------------------------------------------------+   |
| | Meta Sheet Path (optional, for migration)                   |   |
| | [meta-sheet.xlsx                               ]            |   |
| +------------------------------------------------------------+   |
|                                                                   |
|  [Skip this step]                     [<- Back] [Next Step ->]    |
+------------------------------------------------------------------+
```

| Element | Component | Validation |
|---------|-----------|------------|
| Repo URL | `Input` | Required, `^https:\/\/.+\.git$`, no embedded credentials |
| Default Branch | `Input` | Optional, defaults to "master" |
| Helm Charts Path | `Input` | Optional, defaults to "helm-charts" |
| Meta Sheet Path | `Input` | Optional |
| Skip | `Button variant="ghost"` | Skips step (can configure later) |

**API on Next:** `POST /api/projects/:id/promotion-repo` then `POST /api/projects/:id/promotion-repo/verify` (runs in background, shows toast result).

### Step 3: Source Repositories

```
+------------------------------------------------------------------+
| Step 3 of 5: Source Repositories                                  |
+------------------------------------------------------------------+
|                                                                   |
| Add the microservice repositories for this project.               |
|                                                                   |
| +-----+----------------------------------+--------+--------+---+ |
| |  #  | Repository URL                   | Name   | Type   | X | |
| +-----+----------------------------------+--------+--------+---+ |
| |  1  | [https://github.com/org/svc.git] | [svc ] | [App v]| x | |
| |  2  | [https://github.com/org/db.git ] | [db  ] | [SQL v]| x | |
| +-----+----------------------------------+--------+--------+---+ |
| | [+ Add Row]                                                   | |
| +---------------------------------------------------------------+ |
|                                                                   |
| -- OR --                                                          |
|                                                                   |
| [Import from text]   Paste newline-separated repo URLs            |
|                                                                   |
|  [Skip this step]                     [<- Back] [Next Step ->]    |
+------------------------------------------------------------------+
```

| Element | Component | Notes |
|---------|-----------|-------|
| Repo row | `Input` + `Input` + `Select` | Inline editable row |
| Type dropdown | `Select` | Options: app, aql-db, sql-db, infra |
| Remove button | `Button variant="ghost" size="icon"` | X icon to remove row |
| Add Row | `Button variant="outline"` | Appends empty row |
| Import button | `Button variant="secondary"` | Opens `Dialog` with `Textarea` for bulk paste |

**API on Next:** `POST /api/projects/:id/source-repos` for each repo (sequentially, with progress indicator).

### Step 4: Environments

```
+------------------------------------------------------------------+
| Step 4 of 5: Environments                                         |
+------------------------------------------------------------------+
|                                                                   |
| Define the environment promotion pipeline.                        |
|                                                                   |
| [Use Default Template]   Applies: dev > sit > uat > pre-prod > prod|
|                                                                   |
| +---+----------+---------------------------+-----+-----------+--+ |
| | # | Name     | Display Name              | NS  | Cluster   |  | |
| +---+----------+---------------------------+-----+-----------+--+ |
| | 1 | [dev   ] | [Development            ] | [dn]| [gke-dev] |x | |
| | 2 | [sit   ] | [System Integration Test] | [sn]| [gke-sit] |x | |
| | 3 | [uat   ] | [User Acceptance Test   ] | [un]| [gke-uat] |x | |
| | 4 | [pre-pr] | [Pre-Production         ] | [pn]| [gke-pre] |x | |
| | 5 | [prod  ] | [Production             ] | [pn]| [gke-pro] |x | |
| +---+----------+---------------------------+-----+-----------+--+ |
| | [+ Add Environment]                                           | |
| +---------------------------------------------------------------+ |
|                                                                   |
| Note: Promotion order is determined by row position (drag to      |
| reorder).                                                         |
|                                                                   |
|  [Skip this step]                     [<- Back] [Next Step ->]    |
+------------------------------------------------------------------+
```

| Element | Component | Notes |
|---------|-----------|-------|
| Template button | `Button variant="secondary"` | Populates table with 5 default envs |
| Env rows | Inline `Input` fields | Drag handle for reorder |
| Promotion order | Implicit from row position | Auto-numbered |
| Add Environment | `Button variant="outline"` | Appends row |
| isProduction toggle | `Switch` | Only shown in expanded row view |

**API on Next:** `POST /api/projects/:id/environments/apply-template` (if template used) or `POST /api/projects/:id/environments` per row.

### Step 5: Credentials

```
+------------------------------------------------------------------+
| Step 5 of 5: Credentials                                          |
+------------------------------------------------------------------+
|                                                                   |
| Store credentials for accessing repositories and external         |
| services. Values are encrypted and never displayed again.         |
|                                                                   |
| +------------------------------------------------------------+   |
| | Credential Name *                                           |   |
| | [github-token                                  ]            |   |
| +------------------------------------------------------------+   |
|                                                                   |
| +---------------------------+ +------------------------------+    |
| | Type *                    | | Expires At (optional)        |    |
| | [Git Token           v]   | | [Pick a date...        [c]] |    |
| +---------------------------+ +------------------------------+    |
|                                                                   |
| +------------------------------------------------------------+   |
| | Value *                                                     |   |
| | [ghp_xxxxxxxxxxxxxxxxxxxx              ] [Show/Hide]        |   |
| | This value will be encrypted and cannot be viewed again.    |   |
| +------------------------------------------------------------+   |
|                                                                   |
| [+ Add Another Credential]                                        |
|                                                                   |
| Added credentials:                                                |
| +---------------------------+----------+-----------+--------+     |
| | Name                      | Type     | Expires   | Action |     |
| +---------------------------+----------+-----------+--------+     |
| | github-token              | git-token| 2026-12-31| [Del]  |     |
| +---------------------------+----------+-----------+--------+     |
|                                                                   |
|  [Skip this step]                     [<- Back] [Finish Setup ->] |
+------------------------------------------------------------------+
```

| Element | Component | Notes |
|---------|-----------|-------|
| Credential name | `Input` | Required |
| Type | `Select` | Options: git-token, jira-api-key, gcp-service-account, generic |
| Expires | `Popover` + `Calendar` | Optional date picker |
| Value | `Input type="password"` | Required, toggle show/hide |
| Show/Hide toggle | `Button variant="ghost" size="icon"` | Eye/EyeOff icon |
| Add Another | `Button variant="outline"` | Saves current, resets form |
| Credential list | `Table` | Read-only, no value column |

**API on Add:** `POST /api/projects/:id/credentials`

### Completion Screen

```
+------------------------------------------------------------------+
|                                                                   |
|                         [checkmark icon]                          |
|                                                                   |
|                   Project Created Successfully!                   |
|                                                                   |
|           "Payment Gateway Service" is ready to use.              |
|                                                                   |
| +------------------------------------------------------------+   |
| | Summary                                                     |   |
| | Project:      payment-gateway                               |   |
| | Team:         payments-team                                 |   |
| | Promotion:    https://github.com/org/promo.git [Verified]   |   |
| | Source Repos: 12 repositories                               |   |
| | Environments: dev > sit > uat > pre-prod > prod             |   |
| | Credentials:  2 stored                                      |   |
| +------------------------------------------------------------+   |
|                                                                   |
|        [View Project]              [Create Another]               |
|                                                                   |
+------------------------------------------------------------------+
```

| Element | Component |
|---------|-----------|
| Success icon | Lucide `CheckCircle2` icon, `text-green-500 h-16 w-16` |
| Summary card | `Card` with `CardContent` |
| View Project | `Button variant="default"` → `/projects/[id]` |
| Create Another | `Button variant="outline"` → `/projects/new` |

### Wizard State Management

```
Wizard state stored in React context (not URL):
{
  currentStep: 1-5,
  projectId: null | string,     // Set after Step 1
  stepStatus: {
    1: "complete" | "current" | "upcoming",
    2: "complete" | "current" | "upcoming" | "skipped",
    3: "complete" | "current" | "upcoming" | "skipped",
    4: "complete" | "current" | "upcoming" | "skipped",
    5: "complete" | "current" | "upcoming" | "skipped",
  },
  formData: {
    project: {...},
    promotionRepo: {...} | null,
    sourceRepos: [...],
    environments: [...],
    credentials: [...],
  }
}
```

---

## 5. Screen 3: Project Overview

**Route:** `/projects/[id]`
**API:** `GET /api/projects/:id/config` (full config for summary)

### Wireframe

```
+------------------------------------------------------------------+
| Projects > Payment Gateway Service                                |
+------------------------------------------------------------------+
| Payment Gateway Service                  [Active]    [Settings]   |
| payments-team | pay-team@company.com                              |
| Centralized payment processing for all client applications        |
+------------------------------------------------------------------+
|                                                                   |
| +---------------------+ +---------------------+ +---------------+ |
| | Promotion Repo      | | Source Repos         | | Environments  | |
| |                     | |                      | |               | |
| | promo-helm-charts   | | 12 repositories      | | 5 configured  | |
| | [Verified]          | | 11 verified, 1 fail  | | dev>sit>uat>  | |
| |                     | |                      | | pre-prod>prod | |
| | Last check: 2h ago  | | app: 8               | |               | |
| |                     | | aql-db: 2            | | [View]        | |
| | [View] [Re-verify]  | | sql-db: 1            | |               | |
| |                     | | infra: 1             | |               | |
| |                     | |                      | |               | |
| |                     | | [View]               | |               | |
| +---------------------+ +---------------------+ +---------------+ |
|                                                                   |
| +---------------------+ +---------------------+ +---------------+ |
| | Credentials         | | Active Branches      | | Config Export | |
| |                     | |                      | |               | |
| | 2 stored            | | dev:  release/2.0.0  | | Full JSON     | |
| | github-token        | | sit:  release/1.0.0  | | available     | |
| |   expires: 2026-12  | | uat:  release/1.0.0  | |               | |
| | jira-api-key        | | prod: release/0.9.0  | | [View]        | |
| |   no expiry         | |                      | | [Copy URL]    | |
| |                     | | [View All]           | |               | |
| | [Manage]            | |                      | |               | |
| +---------------------+ +---------------------+ +---------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Page header | `div` with `flex justify-between` | Title + status badge + settings link |
| Status badge | `Badge` | `variant="default"` (active), green dot indicator |
| Settings button | `Button variant="outline"` | Gear icon, links to `/projects/[id]/settings` |
| Project metadata | `p text-muted-foreground` | Team, email, description |
| Summary cards (6) | `Card` | 3x2 grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |
| Card title | `CardHeader` with `CardTitle` | Icon + label |
| Card content | `CardContent` | Key stats, mini-lists |
| Card actions | `CardFooter` | View/action buttons |
| Verified badge | `Badge variant="outline"` | Green check icon + "Verified" |
| Failed badge | `Badge variant="destructive"` | Red X icon + "Failed" |

### States

**Empty State (freshly created project, wizard skipped steps):**
```
+---------------------+ +---------------------+ +---------------+
| Promotion Repo      | | Source Repos         | | Environments  |
|                     | |                      | |               |
| Not configured      | | No repositories      | | No envs set   |
|                     | |                      | |               |
| [Configure Now]     | | [Add Repos]          | | [Add Envs]    |
+---------------------+ +---------------------+ +---------------+
```
Each empty card shows a call-to-action button linking to the respective configuration page.

**Loading State:**
All 6 cards render as `Skeleton` with card dimensions.

**Error State:**
```
+------------------------------------------------------------------+
| [!] Failed to load project details                                |
| The project may have been deleted or you may not have access.     |
| [Retry]  [Go to Projects]                                        |
+------------------------------------------------------------------+
```

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id/config` | GET |

---

## 6. Screen 4: Project Settings

**Route:** `/projects/[id]/settings`
**API:** `PATCH /api/projects/:id`, `DELETE /api/projects/:id`

### Wireframe

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Settings                             |
+------------------------------------------------------------------+
| Project Settings                                                  |
+------------------------------------------------------------------+
|                                                                   |
| General Information                                               |
| +------------------------------------------------------------+   |
| |                                                             |   |
| | Project Name                                                |   |
| | payment-gateway                              [Read-only]    |   |
| |                                                             |   |
| | Display Name *                                              |   |
| | [Payment Gateway Service                       ]            |   |
| |                                                             |   |
| | Description                                                 |   |
| | [Centralized payment processing for all       ]             |   |
| | [client applications                          ]             |   |
| |                                                             |   |
| | Team *                          Team Email *                |   |
| | [payments-team             ]    [pay-team@company.com    ]  |   |
| |                                                             |   |
| | Status                                                      |   |
| | [Active            v]                                       |   |
| |                                                             |   |
| |                                          [Save Changes]     |   |
| +------------------------------------------------------------+   |
|                                                                   |
+------------------------------------------------------------------+
| Danger Zone                                                       |
| +------------------------------------------------------------+   |
| | Archive Project                                             |   |
| |                                                             |   |
| | Archiving a project will hide it from the project list and  |   |
| | prevent any downstream services from using its config.      |   |
| | This action can be reversed by a platform admin.            |   |
| |                                                             |   |
| |                                     [Archive Project]       |   |
| +------------------------------------------------------------+   |
+------------------------------------------------------------------+
```

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Page title | `h1` | "Project Settings" |
| General section | `Card` | Editable form |
| Project name | `Input` with `disabled` | Read-only (cannot be changed after creation) |
| Display Name | `Input` | Required |
| Description | `Textarea` | Optional |
| Team, Email | `Input` fields in 2-column grid | Required |
| Status | `Select` | Options: Active, Inactive |
| Save button | `Button` | Disabled until form is dirty |
| Danger Zone section | `Card` with `border-destructive` | Red border styling |
| Archive button | `Button variant="destructive"` | Opens `AlertDialog` |

### Archive Confirmation Dialog

```
+----------------------------------------------+
|  Archive "Payment Gateway Service"?           |
|                                               |
|  This will:                                   |
|  - Hide the project from the project list     |
|  - Prevent downstream services from using it  |
|  - NOT delete any data                        |
|                                               |
|  Type "payment-gateway" to confirm:           |
|  [                                         ]  |
|                                               |
|              [Cancel]  [Archive]              |
+----------------------------------------------+
```

**Component:** `AlertDialog` with text confirmation input. Archive button disabled until input matches project name.

### States

**Loading:** `Skeleton` placeholders in form fields.

**Error (save failed):**
```
[!] Failed to save changes. The project name may conflict with another project.
```
**Component:** `Alert variant="destructive"` above the form.

**Success:** `Toast` notification: "Project settings updated successfully."

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id` | GET |
| Save | `/api/projects/:id` | PATCH |
| Archive | `/api/projects/:id` | DELETE |

---

## 7. Screen 5: Promotion Repo

**Route:** `/projects/[id]/promotion-repo`
**API:** `GET/POST/PATCH /api/projects/:id/promotion-repo`, `POST .../verify`

### Wireframe — Configured State

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Promotion Repo                       |
+------------------------------------------------------------------+
| Promotion Repository                              [Edit] [Verify] |
+------------------------------------------------------------------+
|                                                                   |
| +------------------------------------------------------------+   |
| | Repository Details                                          |   |
| |                                                             |   |
| | URL              https://github.com/org/promo-charts.git    |   |
| | Default Branch   master                                     |   |
| | Helm Path        helm-charts                                |   |
| | Meta Sheet       meta-sheet.xlsx                            |   |
| |                                                             |   |
| | Status           [Verified] Connected successfully          |   |
| | Last Verified    2026-02-16 10:30 AM (2 hours ago)          |   |
| +------------------------------------------------------------+   |
|                                                                   |
| +------------------------------------------------------------+   |
| | Detected Folder Structure                                   |   |
| |                                                             |   |
| | helm-charts/                                                |   |
| |   +-- dev-values/                                           |   |
| |   |   +-- app-values/                                       |   |
| |   |   +-- db-values/                                        |   |
| |   +-- sit-values/                                           |   |
| |   |   +-- app-values/                                       |   |
| |   +-- uat-values/                                           |   |
| |   +-- prod-values/                                          |   |
| +------------------------------------------------------------+   |
+------------------------------------------------------------------+
```

### Wireframe — Not Configured State

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Promotion Repo                       |
+------------------------------------------------------------------+
| Promotion Repository                                              |
+------------------------------------------------------------------+
|                                                                   |
|              [illustration: git repo icon]                         |
|                                                                   |
|          No promotion repository configured yet                   |
|    This is the Helm chart repository that holds environment-      |
|    specific values files for all your services.                   |
|                                                                   |
|                   [Configure Promotion Repo]                      |
|                                                                   |
+------------------------------------------------------------------+
```

### Edit Mode (Dialog)

```
+----------------------------------------------+
|  Edit Promotion Repository                    |
|                                               |
|  Repository URL *                             |
|  [https://github.com/org/promo.git       ]   |
|                                               |
|  Default Branch         Helm Charts Path      |
|  [master            ]   [helm-charts      ]   |
|                                               |
|  Meta Sheet Path (optional)                   |
|  [meta-sheet.xlsx                        ]    |
|                                               |
|              [Cancel]  [Save & Verify]        |
+----------------------------------------------+
```

**Component:** `Dialog` with form fields.

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Detail rows | `div` with label-value pairs | Label: `text-sm font-medium`, Value: `font-mono text-sm` |
| Verified status | `Badge variant="outline"` + `CheckCircle2` icon | Green |
| Unverified status | `Badge variant="destructive"` + `XCircle` icon | Red |
| Verifying status | `Badge variant="secondary"` + `Loader2` spinner | Animated |
| Edit button | `Button variant="outline"` | Opens edit dialog |
| Verify button | `Button variant="secondary"` | Triggers verification, shows spinner |
| Folder tree | `pre` or custom tree component | `font-mono text-sm bg-muted p-4 rounded-md` |
| Configure button (empty) | `Button variant="default"` | Opens same dialog as edit |

### States

**Verifying:**
The Verify button shows a spinner. Status badge changes to "Verifying..." with animated `Loader2` icon.

**Verification Failed:**
```
| Status           [Failed] Authentication failed (HTTP 401)       |
| Last Verified    2026-02-16 10:30 AM                             |
```
`Alert variant="destructive"` shown below details: "Repository verification failed. Check the URL and ensure credentials are configured."

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id/promotion-repo` | GET |
| Save (new) | `/api/projects/:id/promotion-repo` | POST |
| Save (edit) | `/api/projects/:id/promotion-repo` | PATCH |
| Verify | `/api/projects/:id/promotion-repo/verify` | POST |

---

## 8. Screen 6: Source Repos

**Route:** `/projects/[id]/source-repos`
**API:** `GET/POST/PATCH/DELETE /api/projects/:id/source-repos`, `.../verify`

### Wireframe

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Source Repos                         |
+------------------------------------------------------------------+
| Source Repositories                                                |
|                                                                   |
| [+ Add Repo]  [Import Bulk]          Filter: [All Types v]       |
|                                       Search: [Filter repos...]   |
+------------------------------------------------------------------+
|                                                                   |
| Summary:  12 total | 8 app | 2 aql-db | 1 sql-db | 1 infra      |
|           11 verified | 1 failed                                  |
|                                                                   |
| +--+---+---------------+--------------------------+------+------+ |
| |  | # | Name          | URL                      | Type |Status| |
| +--+---+---------------+--------------------------+------+------+ |
| |[]| 1 | service-auth  | github.com/org/svc-auth  | app  | [OK] | |
| |[]| 2 | service-admin | github.com/org/svc-admin | app  | [OK] | |
| |[]| 3 | service-pay   | github.com/org/svc-pay   | app  | [OK] | |
| |[]| 4 | service-notif | github.com/org/svc-notif | app  | [!!] | |
| |[]| 5 | db-migrate    | github.com/org/db-mig    |sql-db| [OK] | |
| |[]| 6 | db-aql-core   | github.com/org/db-aql    |aql-db| [OK] | |
| |[]| 7 | infra-tf      | github.com/org/infra-tf  |infra | [OK] | |
| +--+---+---------------+--------------------------+------+------+ |
|                                                                   |
| Selected: 0  [Verify Selected] [Delete Selected]                  |
|                                                                   |
| Showing 1-7 of 12                   [< Prev] 1 2 [Next >]        |
+------------------------------------------------------------------+
```

### Row Actions (DropdownMenu on each row)

```
+---+---+---+
| [...]     |
+---+---+---+
| Edit      |
| Verify    |
| ----------|
| Delete    |
+---+---+---+
```

**Component:** `DropdownMenu` triggered by ellipsis `Button variant="ghost" size="icon"`.

### Add/Edit Repo Dialog

```
+----------------------------------------------+
|  Add Source Repository                        |
|                                               |
|  Repository Name *                            |
|  [service-auth                           ]    |
|                                               |
|  Repository URL *                             |
|  [https://github.com/org/service-auth.git]    |
|                                               |
|  Type *                   Default Branch      |
|  [App                v]   [main           ]   |
|                                               |
|  Helm Values Path (optional)                  |
|  [helm-charts/dev-values/app-values      ]    |
|                                               |
|              [Cancel]  [Add & Verify]         |
+----------------------------------------------+
```

### Bulk Import Dialog

```
+----------------------------------------------+
|  Bulk Import Repositories                     |
|                                               |
|  Paste repository URLs (one per line):        |
|  +------------------------------------------+|
|  | https://github.com/org/svc-auth.git      ||
|  | https://github.com/org/svc-admin.git     ||
|  | https://github.com/org/svc-pay.git       ||
|  +------------------------------------------+|
|                                               |
|  Repository Type for all:                     |
|  [App                                    v]   |
|                                               |
|  Parsed: 3 URLs detected                     |
|                                               |
|              [Cancel]  [Import All]           |
+----------------------------------------------+
```

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Add Repo button | `Button` | Opens add dialog |
| Import button | `Button variant="secondary"` | Opens bulk import dialog |
| Type filter | `Select` | Options: All Types, app, aql-db, sql-db, infra |
| Search input | `Input` | Filters by name/URL client-side |
| Summary bar | `div` with `Badge` counts | `text-sm text-muted-foreground` |
| Data table | `Table` with sortable columns | `TableHeader`, `TableBody`, `TableRow`, `TableCell` |
| Checkbox | `Checkbox` | Bulk select |
| Status icon | `Badge` | Green check (OK), Red X (failed), gray dash (unverified) |
| Row actions | `DropdownMenu` | Edit, Verify, Delete |
| Bulk actions bar | `div` | Shown when checkboxes selected |
| Pagination | `Pagination` | 20 items per page |

### States

**Empty:**
```
+------------------------------------------------------------------+
|              [illustration: repository icon]                       |
|                                                                   |
|            No source repositories added yet                       |
|      Add the microservice repos that make up this project.        |
|                                                                   |
|             [+ Add Repository]  [Import Bulk]                     |
+------------------------------------------------------------------+
```

**Loading:** `Skeleton` rows in the table (8 rows of skeleton bars).

**Error:** `Alert variant="destructive"` above the table.

### Delete Confirmation

```
+----------------------------------------------+
|  Delete "service-auth"?                       |
|                                               |
|  This will remove the repository from this    |
|  project. The actual Git repository is not    |
|  affected.                                    |
|                                               |
|              [Cancel]  [Delete]               |
+----------------------------------------------+
```

**Component:** `AlertDialog` with `Button variant="destructive"`.

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id/source-repos` | GET |
| Add repo | `/api/projects/:id/source-repos` | POST |
| Edit repo | `/api/projects/:id/source-repos/:repoId` | PATCH |
| Delete repo | `/api/projects/:id/source-repos/:repoId` | DELETE |
| Verify repo | `/api/projects/:id/source-repos/:repoId/verify` | POST |
| Bulk import | `/api/projects/:id/source-repos` | POST (multiple) |

---

## 9. Screen 7: Environments

**Route:** `/projects/[id]/environments`
**API:** `GET/POST/PATCH/DELETE /api/projects/:id/environments`, `.../apply-template`

### Wireframe

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Environments                         |
+------------------------------------------------------------------+
| Environments                       [Apply Template] [+ Add Env]   |
+------------------------------------------------------------------+
|                                                                   |
| PROMOTION PIPELINE VISUALIZATION                                  |
|                                                                   |
| [dev] ----> [sit] ----> [uat] ----> [pre-prod] ----> [prod]      |
|  Dev         SIT         UAT        Pre-Prod          Prod        |
|  dev-ns      sit-ns      uat-ns     preprod-ns        prod-ns     |
|  gke-dev     gke-sit     gke-uat    gke-preprod       gke-prod    |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
| ENVIRONMENT DETAILS TABLE                                         |
|                                                                   |
| +---+--------+-------------------+-----+--------+---------+-----+|
| | # | Name   | Display           | NS  | Cluster| Folder  | Prod||
| +---+--------+-------------------+-----+--------+---------+-----+|
| | 1 | dev    | Development       |dev-n|gke-dev |dev-val  |      ||
| | 2 | sit    | System Integ Test |sit-n|gke-sit |sit-val  |      ||
| | 3 | uat    | User Accept Test  |uat-n|gke-uat |uat-val  |      ||
| | 4 |pre-prod| Pre-Production    |pre-n|gke-pre |pre-val  |      ||
| | 5 | prod   | Production        |prd-n|gke-prd |prod-val | [x]  ||
| +---+--------+-------------------+-----+--------+---------+-----+|
|                                                                   |
| Drag rows to reorder promotion pipeline.                          |
+------------------------------------------------------------------+
```

### Pipeline Visualization Component

```
+--------+      +--------+      +--------+      +---------+      +--------+
|  dev   | ---> |  sit   | ---> |  uat   | ---> |pre-prod | ---> |  prod  |
|        |      |        |      |        |      |         |      |  [*]   |
| dev-ns |      | sit-ns |      | uat-ns |      |preprd-ns|      | prd-ns |
+--------+      +--------+      +--------+      +---------+      +--------+
   #1              #2              #3               #4               #5
```

Each node: `Card` with `p-3`, connected by arrows (`→` dividers styled with CSS). Production env has a star badge. Click a node to open its edit dialog.

### Add/Edit Environment Dialog

```
+----------------------------------------------+
|  Add Environment                              |
|                                               |
|  Name *                 Display Name *        |
|  [staging          ]    [Staging          ]   |
|                                               |
|  Promotion Order *      Values Folder *       |
|  [3               ]     [staging-values   ]   |
|                                               |
|  K8s Namespace          Cluster Name          |
|  [staging-ns       ]    [gke-staging      ]   |
|                                               |
|  Production Environment                       |
|  [ ] This is a production environment         |
|                                               |
|              [Cancel]  [Save]                 |
+----------------------------------------------+
```

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Apply Template button | `Button variant="secondary"` | Disabled if envs already exist |
| Add Env button | `Button` | Opens add dialog |
| Pipeline viz | Custom component | Horizontal card chain with arrows |
| Pipeline node | `Card` variant | `hover:ring-2 cursor-pointer` |
| Production badge | `Badge variant="destructive"` | "PROD" label on production nodes |
| Details table | `Table` | Inline editing or row click to edit |
| Production toggle | `Switch` or `Checkbox` | In edit dialog |
| Drag handle | Custom drag icon | For reorder (updates promotionOrder) |
| Row actions | `DropdownMenu` | Edit, Delete |

### States

**Empty:**
```
+------------------------------------------------------------------+
|              [illustration: pipeline icon]                         |
|                                                                   |
|          No environments configured yet                           |
|    Define your promotion pipeline (dev > sit > uat > prod).       |
|                                                                   |
|        [Apply Default Template]    [+ Add Manually]               |
+------------------------------------------------------------------+
```

**Loading:** Pipeline viz replaced with `Skeleton` bars; table rows as `Skeleton`.

**Error on Apply Template:**
```
[!] Cannot apply template: project already has environments configured.
    Remove existing environments first, or add new ones individually.
```
**Component:** `Alert variant="destructive"`.

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id/environments` | GET |
| Apply template | `/api/projects/:id/environments/apply-template` | POST |
| Add env | `/api/projects/:id/environments` | POST |
| Edit env | `/api/projects/:id/environments/:envId` | PATCH |
| Delete env | `/api/projects/:id/environments/:envId` | DELETE |
| Reorder | `/api/projects/:id/environments/:envId` | PATCH (update promotionOrder) |

---

## 10. Screen 8: Credentials

**Route:** `/projects/[id]/credentials`
**API:** `GET/POST/PATCH/DELETE /api/projects/:id/credentials`

### Wireframe

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Credentials                          |
+------------------------------------------------------------------+
| Credentials                                    [+ Add Credential] |
+------------------------------------------------------------------+
|                                                                   |
| [!] Credential values are encrypted at rest and never displayed.  |
|     To update a credential, you must provide a new value.         |
|                                                                   |
| +--+---+-----------------+-----------------+----------+----------+|
| |  | # | Name            | Type            | Expires  | Actions  ||
| +--+---+-----------------+-----------------+----------+----------+|
| |  | 1 | github-token    | git-token       | 2026-12  | [...]    ||
| |  |   |                 |                 |          |          ||
| |  |   | [Verified]  Last used: 2h ago     |          |          ||
| +--+---+-----------------+-----------------+----------+----------+|
| |  | 2 | jira-api-key    | jira-api-key    | Never    | [...]    ||
| |  |   |                 |                 |          |          ||
| |  |   | [Verified]  Last used: 1d ago     |          |          ||
| +--+---+-----------------+-----------------+----------+----------+|
| |  | 3 | gcp-deploy-sa   | gcp-service-acc | 2026-06  | [...]    ||
| |  |   |                 |                 |          |          ||
| |  |   | [Warning: expires in 4 months]    |          |          ||
| +--+---+-----------------+-----------------+----------+----------+|
|                                                                   |
+------------------------------------------------------------------+
```

### Row Actions (DropdownMenu)

```
+---+---+---+
| [...]     |
+---+---+---+
| Rotate    |   (Update value)
| ----------|
| Delete    |
+---+---+---+
```

### Add Credential Dialog

```
+----------------------------------------------+
|  Add Credential                               |
|                                               |
|  Name *                                       |
|  [github-token                           ]    |
|                                               |
|  Type *                                       |
|  [Git Token                             v]    |
|                                               |
|  Value *                                      |
|  [ghp_xxxxxxxxxxxxxxxxxx      ] [Eye icon]    |
|  Encrypted at rest. Cannot be viewed again.   |
|                                               |
|  Expires At                                   |
|  [2026-12-31                        [cal]]    |
|                                               |
|              [Cancel]  [Save Credential]      |
+----------------------------------------------+
```

### Rotate (Update Value) Dialog

```
+----------------------------------------------+
|  Rotate Credential: github-token              |
|                                               |
|  Enter the new value for this credential.     |
|  The old value will be permanently replaced.  |
|                                               |
|  New Value *                                  |
|  [                                       ]    |
|                                               |
|  New Expiry Date (optional)                   |
|  [                                  [cal]]    |
|                                               |
|              [Cancel]  [Rotate]               |
+----------------------------------------------+
```

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Info alert | `Alert variant="default"` | Info about encryption behavior |
| Add button | `Button` | Opens add dialog |
| Data table | `Table` | Name, Type, Expires, Actions columns |
| Name column | `div` with `font-mono` | Credential name |
| Type column | `Badge variant="outline"` | Color-coded by type |
| Expires column | `span` | Red if expiring within 30 days, amber if within 90 days |
| Expiry warning | `Badge variant="destructive"` or `"warning"` | Inline below the row |
| Verified status | `Badge variant="outline"` | Green check (used successfully in verification) |
| Row actions | `DropdownMenu` | Rotate, Delete |
| Value input | `Input type="password"` | Toggle eye icon to show/hide before saving |
| Date picker | `Popover` + `Calendar` | For expiry date |

### States

**Empty:**
```
+------------------------------------------------------------------+
|              [illustration: lock icon]                             |
|                                                                   |
|             No credentials stored yet                             |
|    Store Git tokens, API keys, and service accounts securely.     |
|    Values are encrypted at rest using AES-256.                    |
|                                                                   |
|                    [+ Add Credential]                             |
+------------------------------------------------------------------+
```

**Loading:** `Skeleton` table rows (3 rows).

**Error:** `Alert variant="destructive"` above the table.

### Delete Confirmation

```
+----------------------------------------------+
|  Delete "github-token"?                       |
|                                               |
|  This will permanently remove this credential.|
|  Any service using this credential will fail. |
|                                               |
|  Type "github-token" to confirm:              |
|  [                                         ]  |
|                                               |
|              [Cancel]  [Delete]               |
+----------------------------------------------+
```

**Component:** `AlertDialog` with typed confirmation. Destructive action requires name match.

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id/credentials` | GET |
| Add | `/api/projects/:id/credentials` | POST |
| Rotate | `/api/projects/:id/credentials/:credId` | PATCH |
| Delete | `/api/projects/:id/credentials/:credId` | DELETE |

**Security note:** The GET response never includes the `value` field. The table only shows `name`, `type`, `expiresAt`, and `createdAt`.

---

## 11. Screen 9: Branch Tracker

**Route:** `/projects/[id]/branches`
**API:** `GET /api/projects/:id/branches`, `GET .../active`, `POST`, `PATCH`

### Wireframe

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Branch Tracker                       |
+------------------------------------------------------------------+
| Branch Tracker                                [+ New Branch Entry] |
+------------------------------------------------------------------+
|                                                                   |
| ACTIVE BRANCHES (per environment)                                 |
|                                                                   |
| +----------+----------+----------+----------+----------+          |
| |   dev    |   sit    |   uat    | pre-prod |   prod   |          |
| +----------+----------+----------+----------+----------+          |
| |release/  |release/  |release/  |          |release/  |          |
| | 2.0.0    | 1.0.0    | 1.0.0    |    X     | 0.9.0    |          |
| +----------+----------+----------+----------+----------+          |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
| BRANCH HISTORY                                                    |
|                                                                   |
| Filter: [Active Only v]    Search: [Search branches...]           |
|                                                                   |
| +---+----------------+-----+-----+-----+-------+-----+-----+---+|
| | # | Branch         | Ver | dev | sit | uat   |pre-p| prod|Act||
| +---+----------------+-----+-----+-----+-------+-----+-----+---+|
| | 1 | release/2.0.0  | 2.0 | 2.0 |  X  |  X    |  X  |  X  |[*]||
| | 2 | release/1.0.0  | 1.0 | 1.0 | 1.0 | 1.0   |  X  |  X  |[*]||
| | 3 | release/0.9.0  | 0.9 | 0.9 | 0.9 | 0.9   | 0.9 | 0.9 |[ ]||
| +---+----------------+-----+-----+-----+-------+-----+-----+---+|
|                                                                   |
| Click an "X" cell to promote a branch to that environment.        |
+------------------------------------------------------------------+
```

### Active Branches Visualization

```
     dev            sit            uat          pre-prod         prod
+------------+ +------------+ +------------+ +------------+ +------------+
| release/   | | release/   | | release/   | |            | | release/   |
| 2.0.0      | | 1.0.0      | | 1.0.0      | |     X      | | 0.9.0      |
|            | |            | |            | |            | |            |
| [current]  | | [current]  | | [current]  | | [pending]  | | [current]  |
+------------+ +------------+ +------------+ +------------+ +------------+
     #1             #2             #3              #4             #5
```

Each card: environment name on top, active branch in the card body. Cards styled with `bg-green-50 border-green-200` for active, `bg-gray-50 border-dashed` for X (not promoted).

### New Branch Entry Dialog

```
+----------------------------------------------+
|  Create New Branch Entry                      |
|                                               |
|  Branch Name *                                |
|  [release/3.0.0                          ]    |
|                                               |
|  Version *                                    |
|  [3.0.0                                  ]    |
|                                               |
|  Note: The branch will be marked active in    |
|  the first environment (dev) and "X" in all   |
|  others.                                      |
|                                               |
|              [Cancel]  [Create]               |
+----------------------------------------------+
```

### Promote Branch Dialog

Triggered by clicking an "X" cell in the history table.

```
+----------------------------------------------+
|  Promote Branch to sit                        |
|                                               |
|  Branch: release/2.0.0                        |
|  Target: sit (System Integration Testing)     |
|                                               |
|  This will mark release/2.0.0 as the active   |
|  branch for the sit environment.              |
|                                               |
|              [Cancel]  [Promote]              |
+----------------------------------------------+
```

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Active branches cards | `Card` | Horizontal row, responsive wrap |
| Active card (has branch) | `Card` with green border | `border-green-500 bg-green-50` |
| Pending card (X) | `Card` with dashed border | `border-dashed bg-muted` |
| Branch name in card | `p font-mono text-sm` | e.g., "release/2.0.0" |
| New Branch button | `Button` | Opens create dialog |
| Filter dropdown | `Select` | Options: All, Active Only, Inactive |
| Search input | `Input` | Filters by branch name |
| History table | `Table` | Columns: Branch, Version, one per environment, Active toggle |
| X cells | `Button variant="ghost"` | Clickable to trigger promotion |
| Active branch cells | `Badge variant="default"` | Shows branch version |
| Active toggle | `Switch` | Mark branch as active/inactive |
| Row actions | `DropdownMenu` | Edit, Deactivate |

### States

**Empty:**
```
+------------------------------------------------------------------+
|              [illustration: git branch icon]                       |
|                                                                   |
|              No branches tracked yet                              |
|    Create a branch entry to start tracking promotions.            |
|    This replaces the legacy meta-sheet.xlsx workflow.             |
|                                                                   |
|                   [+ New Branch Entry]                            |
+------------------------------------------------------------------+
```

**Loading:** `Skeleton` for active branch cards + `Skeleton` table rows.

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id/branches` | GET |
| Active branches | `/api/projects/:id/branches/active` | GET |
| Create branch | `/api/projects/:id/branches` | POST |
| Promote | `/api/projects/:id/branches/:branchId` | PATCH |

---

## 12. Screen 10: Config Export

**Route:** `/projects/[id]/config`
**API:** `GET /api/projects/:id/config`

### Wireframe

```
+------------------------------------------------------------------+
| Projects > Payment Gateway > Config Export                         |
+------------------------------------------------------------------+
| Configuration Export                          [Refresh] [Copy URL] |
+------------------------------------------------------------------+
|                                                                   |
| VALIDATION SUMMARY                                                |
|                                                                   |
| +------------------------------------------------------------+   |
| | [OK] Project metadata complete                              |   |
| | [OK] Promotion repo configured and verified                 |   |
| | [OK] 12 source repos registered (11 verified, 1 failed)    |   |
| | [!!] service-notif: verification failed                     |   |
| | [OK] 5 environments configured                              |   |
| | [OK] 2 credentials stored                                   |   |
| | [OK] Branch tracker has 3 entries (2 active)                |   |
| +------------------------------------------------------------+   |
|                                                                   |
| CONFIGURATION JSON                                                |
|                                                                   |
| +------------------------------------------------------------+   |
| |  API Endpoint:                                              |   |
| |  GET /api/projects/uuid-here/config              [Copy]     |   |
| +------------------------------------------------------------+   |
|                                                                   |
| +------------------------------------------------------------+   |
| | {                                              [Copy JSON]  |   |
| |   "project": {                                              |   |
| |     "id": "uuid-here",                                     |   |
| |     "name": "payment-gateway",                              |   |
| |     "displayName": "Payment Gateway Service",               |   |
| |     "team": "payments-team",                                |   |
| |     "status": "active"                                      |   |
| |   },                                                        |   |
| |   "promotionRepo": {                                        |   |
| |     "repoUrl": "https://github.com/org/promo.git",          |   |
| |     "helmChartsPath": "helm-charts",                        |   |
| |     "defaultBranch": "master"                               |   |
| |   },                                                        |   |
| |   "sourceRepos": [                                          |   |
| |     { "name": "service-auth", ... },                        |   |
| |     ...                                                     |   |
| |   ],                                                        |   |
| |   "environments": [                                         |   |
| |     { "name": "dev", "promotionOrder": 1, ... },            |   |
| |     ...                                                     |   |
| |   ],                                                        |   |
| |   "activeBranches": {                                       |   |
| |     "dev": "release/2.0.0",                                 |   |
| |     "sit": "release/1.0.0",                                 |   |
| |     ...                                                     |   |
| |   },                                                        |   |
| |   "credentials": [                                          |   |
| |     { "name": "github-token", "type": "git-token" },        |   |
| |     ...                                                     |   |
| |   ]                                                         |   |
| | }                                                           |   |
| +------------------------------------------------------------+   |
|                                                                   |
+------------------------------------------------------------------+
```

### Component Breakdown

| Element | Component | Notes |
|---------|-----------|-------|
| Refresh button | `Button variant="outline"` | Re-fetches config |
| Copy URL button | `Button variant="secondary"` | Copies API endpoint URL |
| Validation summary | `Card` with list items | Each item: icon + text |
| OK item | `CheckCircle2` green icon | Passed validation |
| Warning item | `AlertTriangle` amber icon | Partial issue |
| Fail item | `XCircle` red icon | Failed validation |
| API endpoint | `div` with `font-mono bg-muted p-3 rounded` | Copy button copies URL |
| JSON viewer | `ScrollArea` with `pre` | `font-mono text-sm bg-muted p-4 rounded-md`, syntax highlighted |
| Copy JSON button | `Button variant="ghost" size="sm"` | Copies JSON to clipboard |

### Validation Rules

| Check | Pass | Warn | Fail |
|-------|------|------|------|
| Project metadata | All required fields present | — | Missing name/team/email |
| Promotion repo | Configured + verified | Configured but unverified | Not configured |
| Source repos | All verified | Some unverified | None registered |
| Environments | 1+ configured | — | None configured |
| Credentials | 1+ stored | Expiring within 30 days | None stored |
| Branch tracker | Active entries exist | — | Informational only |

### States

**Loading:** `Skeleton` for validation summary + `Skeleton` for JSON block.

**Error:**
```
[!] Failed to generate configuration export.
    Ensure the project exists and all required data is configured.
    [Retry]
```

**Partial Configuration (some sections missing):**
The JSON still renders with `null` values for unconfigured sections. Validation summary highlights what's missing.

### API Calls

| Trigger | Endpoint | Method |
|---------|----------|--------|
| Page load | `/api/projects/:id/config` | GET |
| Refresh | `/api/projects/:id/config` | GET |

---

## 13. Modals & Dialogs

### Complete Modal Inventory

| Dialog | Trigger | Type | Component |
|--------|---------|------|-----------|
| Add Source Repo | "Add Repo" button (Screen 6) | Form | `Dialog` |
| Edit Source Repo | Row action (Screen 6) | Form | `Dialog` |
| Delete Source Repo | Row action (Screen 6) | Confirm | `AlertDialog` |
| Bulk Import Repos | "Import Bulk" button (Screen 6) | Form | `Dialog` |
| Edit Promotion Repo | "Edit" button (Screen 5) | Form | `Dialog` |
| Configure Promotion Repo | "Configure" button (Screen 5, empty) | Form | `Dialog` |
| Add Environment | "Add Env" button (Screen 7) | Form | `Dialog` |
| Edit Environment | Pipeline node click / row action (Screen 7) | Form | `Dialog` |
| Delete Environment | Row action (Screen 7) | Confirm | `AlertDialog` |
| Apply Env Template | "Apply Template" button (Screen 7) | Confirm | `AlertDialog` |
| Add Credential | "Add Credential" button (Screen 8) | Form | `Dialog` |
| Rotate Credential | Row action (Screen 8) | Form | `Dialog` |
| Delete Credential | Row action (Screen 8) | Confirm + typed | `AlertDialog` |
| Create Branch Entry | "New Branch Entry" button (Screen 9) | Form | `Dialog` |
| Promote Branch | Click X cell (Screen 9) | Confirm | `AlertDialog` |
| Archive Project | "Archive" button (Screen 4) | Confirm + typed | `AlertDialog` |
| Discard Wizard | "Cancel" in wizard (Screen 2) | Confirm | `AlertDialog` |
| Unsaved Changes | Navigate away with dirty form | Confirm | `AlertDialog` |

### Dialog Sizing

```
Form Dialogs:     max-w-lg (32rem / 512px)
Confirm Dialogs:  max-w-md (28rem / 448px)
Bulk Import:      max-w-2xl (42rem / 672px)
```

### Toast Notifications

| Event | Type | Message |
|-------|------|---------|
| Project created | Success | "Project created successfully" |
| Settings saved | Success | "Project settings updated" |
| Repo added | Success | "Repository added successfully" |
| Repo verified | Success | "Repository is accessible" |
| Repo verification failed | Error | "Repository verification failed: {message}" |
| Credential stored | Success | "Credential stored securely" |
| Credential rotated | Success | "Credential rotated successfully" |
| Environment added | Success | "Environment added to pipeline" |
| Template applied | Success | "Default environment template applied" |
| Branch created | Success | "Branch entry created" |
| Branch promoted | Success | "Branch promoted to {env}" |
| Project archived | Warning | "Project archived" |
| Delete completed | Info | "{entity} deleted" |
| API error | Error | "An error occurred. Please try again." |
| Network error | Error | "Unable to connect to server" |

**Component:** `Toast` via `useToast()` hook. Position: bottom-right. Auto-dismiss: 5 seconds (errors persist).

---

## 14. Mobile Responsiveness

### Breakpoints

```
sm:   640px    (mobile landscape)
md:   768px    (tablet portrait)
lg:   1024px   (tablet landscape / small desktop)
xl:   1280px   (desktop)
2xl:  1536px   (wide desktop)
```

### Responsive Behavior

| Screen | Desktop (lg+) | Tablet (md) | Mobile (<md) |
|--------|--------------|-------------|--------------|
| Sidebar | Fixed, visible | Collapsible | Hidden, `Sheet` overlay |
| Project List grid | 3 columns | 2 columns | 1 column |
| Project List table | Full columns | Truncated | Card view instead |
| Overview cards | 3x2 grid | 2x3 grid | 1x6 stack |
| Source Repos table | Full | Horizontal scroll | Card view |
| Environments pipeline | Horizontal | Horizontal scroll | Vertical stack |
| Environments table | Full | Horizontal scroll | Card view |
| Branch tracker table | Full | Horizontal scroll | Card view |
| Wizard steps | Horizontal | Horizontal | Vertical stepper |
| Config JSON | Full width | Full width | Full width, smaller font |
| Dialogs | Centered modal | Centered modal | Full-screen sheet |

### Mobile Sidebar (Sheet)

```
+------------------+
| Garuda.One  [X]  |
+------------------+
| Dashboard        |
| Projects         |
+------------------+
| Payment Gateway  |
+------------------+
| Overview         |
| Promotion Repo   |
| Source Repos      |
| Environments     |
| Credentials      |
| Branch Tracker   |
| Config Export     |
+------------------+
| Settings         |
+------------------+
```

**Component:** `Sheet` with `side="left"`, triggered by hamburger menu `Button` in header.

### Mobile Card View (replacing tables)

```
+------------------------------------------+
| service-auth                    [...]    |
| https://github.com/org/svc-auth.git     |
| Type: app   Status: [Verified]          |
| Last checked: 2h ago                    |
+------------------------------------------+
| service-admin                   [...]    |
| https://github.com/org/svc-admin.git    |
| Type: app   Status: [Verified]          |
| Last checked: 1d ago                    |
+------------------------------------------+
```

On screens < `md`, tables switch to stacked card layout using responsive CSS: `hidden md:table` for the table, `md:hidden` for the card list.

---

## 15. Next.js App Router Structure

```
app/
├── layout.tsx                        # Root layout (AppShell, Sidebar, Header)
├── page.tsx                          # Redirect to /projects
├── globals.css                       # Tailwind + shadcn theme
│
├── projects/
│   ├── layout.tsx                    # Projects section layout
│   ├── page.tsx                      # Screen 1: Project List
│   ├── loading.tsx                   # Skeleton for project list
│   ├── error.tsx                     # Error boundary for project list
│   │
│   ├── new/
│   │   └── page.tsx                  # Screen 2: Onboarding Wizard
│   │
│   └── [id]/
│       ├── layout.tsx                # Project context layout (sidebar nav, breadcrumb)
│       ├── page.tsx                  # Screen 3: Project Overview
│       ├── loading.tsx               # Skeleton for overview
│       ├── error.tsx                 # Error boundary
│       │
│       ├── settings/
│       │   └── page.tsx              # Screen 4: Project Settings
│       │
│       ├── promotion-repo/
│       │   └── page.tsx              # Screen 5: Promotion Repo
│       │
│       ├── source-repos/
│       │   └── page.tsx              # Screen 6: Source Repos
│       │
│       ├── environments/
│       │   └── page.tsx              # Screen 7: Environments
│       │
│       ├── credentials/
│       │   └── page.tsx              # Screen 8: Credentials
│       │
│       ├── branches/
│       │   └── page.tsx              # Screen 9: Branch Tracker
│       │
│       └── config/
│           └── page.tsx              # Screen 10: Config Export
│
├── components/
│   ├── ui/                           # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── ... (all shadcn components)
│   │
│   ├── layout/
│   │   ├── app-shell.tsx             # Main app shell (sidebar + content)
│   │   ├── header.tsx                # Top header bar
│   │   ├── sidebar.tsx               # Sidebar navigation
│   │   ├── sidebar-nav.tsx           # Project context nav items
│   │   └── breadcrumb-nav.tsx        # Dynamic breadcrumbs
│   │
│   ├── projects/
│   │   ├── project-card.tsx          # Project card (grid view)
│   │   ├── project-table.tsx         # Project table (table view)
│   │   ├── project-filters.tsx       # Search + status filter bar
│   │   ├── overview-card.tsx         # Summary card (overview page)
│   │   ├── empty-state.tsx           # Reusable empty state illustration
│   │   └── status-badge.tsx          # Project status badge
│   │
│   ├── wizard/
│   │   ├── wizard-shell.tsx          # Wizard layout (steps + content)
│   │   ├── step-indicator.tsx        # Step progress indicator
│   │   ├── step-project-details.tsx  # Step 1 form
│   │   ├── step-promotion-repo.tsx   # Step 2 form
│   │   ├── step-source-repos.tsx     # Step 3 form
│   │   ├── step-environments.tsx     # Step 4 form
│   │   ├── step-credentials.tsx      # Step 5 form
│   │   └── wizard-complete.tsx       # Completion screen
│   │
│   ├── repos/
│   │   ├── repo-table.tsx            # Source repos data table
│   │   ├── repo-form-dialog.tsx      # Add/edit repo dialog
│   │   ├── repo-import-dialog.tsx    # Bulk import dialog
│   │   ├── promotion-repo-view.tsx   # Promotion repo detail view
│   │   ├── promotion-repo-form.tsx   # Promotion repo edit form
│   │   └── verification-badge.tsx    # Repo verification status
│   │
│   ├── environments/
│   │   ├── pipeline-viz.tsx          # Environment pipeline visualization
│   │   ├── env-table.tsx             # Environment details table
│   │   ├── env-form-dialog.tsx       # Add/edit environment dialog
│   │   └── template-confirm.tsx      # Apply template confirmation
│   │
│   ├── credentials/
│   │   ├── credential-table.tsx      # Credentials table
│   │   ├── credential-form.tsx       # Add credential dialog
│   │   ├── rotate-dialog.tsx         # Rotate credential dialog
│   │   └── expiry-badge.tsx          # Expiry warning badge
│   │
│   ├── branches/
│   │   ├── active-branches.tsx       # Active branches card row
│   │   ├── branch-history.tsx        # Branch history table
│   │   ├── branch-form-dialog.tsx    # New branch dialog
│   │   └── promote-dialog.tsx        # Promote branch confirmation
│   │
│   └── config/
│       ├── validation-summary.tsx    # Config validation checklist
│       └── json-viewer.tsx           # JSON display with copy
│
├── hooks/
│   ├── use-project.ts                # Fetch project by ID
│   ├── use-projects.ts               # Fetch project list (paginated)
│   ├── use-project-config.ts         # Fetch full config export
│   ├── use-source-repos.ts           # Source repos CRUD
│   ├── use-environments.ts           # Environments CRUD
│   ├── use-credentials.ts            # Credentials CRUD
│   ├── use-branches.ts               # Branch tracker CRUD
│   └── use-promotion-repo.ts         # Promotion repo CRUD + verify
│
├── lib/
│   ├── api.ts                        # API client (fetch wrapper)
│   ├── utils.ts                      # shadcn cn() utility
│   └── validators.ts                 # Client-side validation schemas (zod)
│
└── types/
    ├── project.ts                    # Project, PromotionRepo, SourceRepo types
    ├── environment.ts                # Environment type
    ├── credential.ts                 # Credential type (no value field)
    ├── branch-tracker.ts             # BranchTracker type
    └── api.ts                        # API response types, pagination
```

---

## 16. State Management

### Approach: React Server Components + Client-Side SWR

```
Server Components (default):
  - Page layouts, initial data fetching
  - Breadcrumb generation from route params
  - Sidebar project context loading

Client Components ("use client"):
  - Forms (wizard steps, edit dialogs)
  - Interactive tables (sorting, filtering, selection)
  - Pipeline visualization (click handlers)
  - JSON viewer (copy to clipboard)
  - Toast notifications
```

### Data Fetching Pattern

```typescript
// hooks/use-projects.ts — SWR-based hook
function useProjects(params: { page: number; limit: number; status?: string }) {
  return useSWR(
    `/api/projects?${new URLSearchParams(params)}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

// hooks/use-project-config.ts
function useProjectConfig(projectId: string) {
  return useSWR(
    `/api/projects/${projectId}/config`,
    fetcher
  );
}
```

### Form State

All forms use `react-hook-form` + `zod` for validation:

```typescript
// Wizard Step 1 example
const schema = z.object({
  name: z.string()
    .min(1, "Required")
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Lowercase alphanumeric with hyphens"),
  displayName: z.string().min(1, "Required"),
  description: z.string().optional(),
  team: z.string().min(1, "Required"),
  teamEmail: z.string().email("Invalid email"),
});

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});
```

### Wizard Context

```typescript
// context/wizard-context.tsx
interface WizardState {
  currentStep: number;
  projectId: string | null;
  stepStatus: Record<number, "complete" | "current" | "upcoming" | "skipped">;
}

const WizardContext = createContext<{
  state: WizardState;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  setProjectId: (id: string) => void;
}>();
```

### Optimistic Updates

For better UX, tables use SWR's `mutate` for optimistic updates:

```typescript
// After adding a source repo
await addSourceRepo(projectId, data);
mutate(`/api/projects/${projectId}/source-repos`);  // Revalidate list
toast({ title: "Repository added successfully" });
```

### URL State

Filters and pagination stored in URL search params for shareability:

```
/projects?page=2&status=active&search=payment
/projects/[id]/source-repos?type=app&page=1
```

---

## 17. API Coverage Matrix

Every API endpoint from the use case document mapped to UI screens.

### Project CRUD

| Endpoint | Method | Screen | UI Trigger |
|----------|--------|--------|------------|
| `/api/projects` | POST | Wizard Step 1 | "Next Step" button |
| `/api/projects` | GET | Project List | Page load, pagination, filters |
| `/api/projects/:id` | GET | Overview, Settings | Page load |
| `/api/projects/by-name/:name` | GET | (Used internally for validation) | Name uniqueness check |
| `/api/projects/:id` | PATCH | Settings | "Save Changes" button |
| `/api/projects/:id` | DELETE | Settings | "Archive Project" button |

### Promotion Repository

| Endpoint | Method | Screen | UI Trigger |
|----------|--------|--------|------------|
| `/api/projects/:id/promotion-repo` | POST | Wizard Step 2, Promotion Repo (empty) | "Next Step" / "Configure" button |
| `/api/projects/:id/promotion-repo` | GET | Promotion Repo, Overview | Page load |
| `/api/projects/:id/promotion-repo` | PATCH | Promotion Repo | "Save & Verify" in edit dialog |
| `/api/projects/:id/promotion-repo/verify` | POST | Promotion Repo, Wizard Step 2 | "Verify" / "Re-verify" button |

### Source Repositories

| Endpoint | Method | Screen | UI Trigger |
|----------|--------|--------|------------|
| `/api/projects/:id/source-repos` | POST | Wizard Step 3, Source Repos | "Add & Verify" / "Import All" |
| `/api/projects/:id/source-repos` | GET | Source Repos, Overview | Page load |
| `/api/projects/:id/source-repos/:repoId` | GET | Source Repos | Row expand / edit |
| `/api/projects/:id/source-repos/:repoId` | PATCH | Source Repos | "Save" in edit dialog |
| `/api/projects/:id/source-repos/:repoId` | DELETE | Source Repos | "Delete" in dropdown |
| `/api/projects/:id/source-repos/:repoId/verify` | POST | Source Repos | "Verify" in dropdown / bulk verify |

### Environments

| Endpoint | Method | Screen | UI Trigger |
|----------|--------|--------|------------|
| `/api/projects/:id/environments` | POST | Wizard Step 4, Environments | "Save" in add dialog |
| `/api/projects/:id/environments` | GET | Environments, Overview | Page load |
| `/api/projects/:id/environments/:envId` | PATCH | Environments | "Save" in edit dialog, reorder |
| `/api/projects/:id/environments/:envId` | DELETE | Environments | "Delete" in dropdown |
| `/api/projects/:id/environments/apply-template` | POST | Wizard Step 4, Environments | "Apply Template" button |

### Credentials

| Endpoint | Method | Screen | UI Trigger |
|----------|--------|--------|------------|
| `/api/projects/:id/credentials` | POST | Wizard Step 5, Credentials | "Save Credential" button |
| `/api/projects/:id/credentials` | GET | Credentials, Overview | Page load |
| `/api/projects/:id/credentials/:credId` | PATCH | Credentials | "Rotate" in dropdown |
| `/api/projects/:id/credentials/:credId` | DELETE | Credentials | "Delete" in dropdown |

### Branch Tracking

| Endpoint | Method | Screen | UI Trigger |
|----------|--------|--------|------------|
| `/api/projects/:id/branches` | GET | Branch Tracker | Page load |
| `/api/projects/:id/branches/active` | GET | Branch Tracker, Overview | Page load (active cards) |
| `/api/projects/:id/branches` | POST | Branch Tracker | "Create" in new branch dialog |
| `/api/projects/:id/branches/:branchId` | PATCH | Branch Tracker | "Promote" in promote dialog |

### Configuration Export

| Endpoint | Method | Screen | UI Trigger |
|----------|--------|--------|------------|
| `/api/projects/:id/config` | GET | Config Export, Overview | Page load, "Refresh" button |

### Coverage Summary

| API Section | Total Endpoints | Covered by UI | Coverage |
|-------------|----------------|---------------|----------|
| Project CRUD | 6 | 6 | 100% |
| Promotion Repo | 4 | 4 | 100% |
| Source Repos | 6 | 6 | 100% |
| Environments | 5 | 5 | 100% |
| Credentials | 4 | 4 | 100% |
| Branch Tracking | 4 | 4 | 100% |
| Config Export | 1 | 1 | 100% |
| **Total** | **30** | **30** | **100%** |

### Entity CRUD Coverage

| Entity | Create | Read | Update | Delete | Special |
|--------|--------|------|--------|--------|---------|
| Project | Wizard Step 1 | List, Overview | Settings | Settings (archive) | by-name lookup |
| PromotionRepo | Wizard Step 2 / Promo page | Promo page | Promo page (edit) | — | verify |
| SourceRepo | Wizard Step 3 / Repos page | Repos page | Repos page (edit) | Repos page | verify, bulk import |
| Environment | Wizard Step 4 / Envs page | Envs page | Envs page (edit) | Envs page | apply-template |
| Credential | Wizard Step 5 / Creds page | Creds page | Creds page (rotate) | Creds page | — |
| BranchTracker | Branch Tracker page | Branch Tracker page | Branch Tracker (promote) | — | active branches |

---

**Document Version:** 1.0
**Last Updated:** February 16, 2026
