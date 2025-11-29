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
- `dtwDistance()`: Dynamic Time Warping for sequence comparison
- `relativeOrderSimilarity()`: Order-aware matching tolerant to perspective distortion
- `combinedSimilarity()`: Weighted combination of MHD and order similarity
- `searchRoutes()`: Search matching routes using combined algorithm

**Data Management** (`src/hooks/useRoutes.ts`)
- React hook providing route CRUD operations
- Manages Blob URL cache

### Data Flow

```
User marked points (Point[])
    ↓
┌─────────────────────────────────────────┐
│         Combined Algorithm              │
├─────────────────────────────────────────┤
│  MHD Branch (weight: 0.6)               │
│  normalizePoints() → MHD → similarity   │
├─────────────────────────────────────────┤
│  Order Branch (weight: 0.4)             │
│  sort by Y → normalize X → DTW          │
└─────────────────────────────────────────┘
    ↓
combinedSimilarity() → 0-100%
    ↓
SearchResult[] sorted by similarity
```

### Key Types (`src/types/route.ts`)

- `Point { x, y }` - normalized coordinates (0-1)
- `RouteImage { id, filename, points, normalizedPoints }` - route image
- `Route { id, name, images[], createdAt }` - route data

## Technical Decisions

1. **Combined matching algorithm**: MHD (0.6) + order-aware matching (0.4) for better tolerance to perspective distortion
2. **Algorithm parameters**: `maxDistance=0.6`, `mhdWeight=0.6`, `orderWeight=0.4`
3. **Multi-image search**: Uses highest similarity among all images as the match score
4. **OPFS storage**: Data stored locally in browser only, no cloud sync

## Research Reference

See `docs/research/2025-11-29-angle-invariant-matching.md` for algorithm research and experiment results.
