# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bouldering route marking and matching POC - validates the technical feasibility of identifying routes by marking hold positions on photos.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint check
npm test          # Run unit tests (vitest run)
npm run test:watch # Watch mode testing
```

## Architecture

### Core Modules

**Storage Layer** (`src/lib/storage.ts`)
- OPFS (Origin Private File System) wrapper
- `routes.json` stores route index, `images/` directory stores photos

**Matching Algorithm** (`src/lib/matching.ts`)
- `normalizePoints()`: Normalize point sets (translate to centroid + RMS scaling)
- `modifiedHausdorffDistance()`: Calculate MHD between two point sets
- `searchRoutes()`: Search matching routes, returns results sorted by similarity

**Data Management** (`src/hooks/useRoutes.ts`)
- React hook providing route CRUD operations
- Manages Blob URL cache

### Data Flow

```
User marked points (Point[])
    ↓
normalizePoints() → normalized coordinates
    ↓
modifiedHausdorffDistance() → calculate distance to each route
    ↓
distanceToSimilarity() → convert to 0-100% similarity
    ↓
SearchResult[] sorted by similarity
```

### Key Types (`src/types/route.ts`)

- `Point { x, y }` - normalized coordinates (0-1)
- `RouteImage { id, filename, points, normalizedPoints }` - route image
- `Route { id, name, images[], createdAt }` - route data

## Technical Decisions

1. **MHD algorithm characteristics**: High tolerance for position offset, but sensitive to missing points
2. **Multi-image search**: Uses highest similarity among all images as the match score
3. **OPFS storage**: Data stored locally in browser only, no cloud sync
