# Frontend Application - ESSENU

This directory contains the frontend application for the ESSENU legal platform.

## Structure

```
front_office/
├── pug/                    # Pug templates
│   ├── mixins/            # Reusable Pug mixins
│   │   └── article.pug    # Article rendering mixin (+article-featured)
│   └── pages/             # Page templates
│       └── news_item.pug  # News article page
├── assets/                # Static assets
│   └── js/               # JavaScript files
│       └── editorjs-renderer.js  # EditorJS content enhancement
├── controllers/           # Route controllers (placeholder)
├── routes/               # Route definitions (placeholder)
└── README.md            # This file

## Key Files

### EditorJS Renderer Integration

See [EDITORJS_RENDERER_FIX.md](./EDITORJS_RENDERER_FIX.md) for detailed documentation on the EditorJS renderer fix.

**Quick Summary:**
- `pug/mixins/article.pug` - Contains the `+article-featured` mixin
- `assets/js/editorjs-renderer.js` - Client-side script that enhances EditorJS content
- The fix ensures the JavaScript properly targets content rendered by the Pug mixin

## Backend Integration

This frontend connects to the backend API at:
- **Development**: `http://localhost:5000`
- **Configured via**: `/api/front_office/.env` (FRONT_URL setting)

The backend (`/api/front_office/`) provides:
- REST API endpoints (`/api/news`, `/api/comments`, etc.)
- EditorJS to HTML conversion on the server-side
- Authentication and authorization

## Setup (To Be Implemented)

The full frontend setup would include:

1. **Package Manager**: npm or yarn
2. **Build Tool**: Webpack, Vite, or similar
3. **Server**: Express.js to serve Pug templates
4. **Static Assets**: Public directory for CSS, JS, images

### Expected package.json structure:

```json
{
  "name": "essenu-frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "webpack --mode production"
  },
  "dependencies": {
    "express": "^5.x",
    "pug": "^3.x",
    "axios": "^1.x"
  }
}
```

## Current Status

✅ **Implemented:**
- EditorJS renderer script with proper DOM targeting
- `+article-featured` Pug mixin for article rendering
- Documentation for the EditorJS integration fix

⏳ **To Be Implemented:**
- Full Express.js server setup
- Routing configuration
- Controllers for pages
- Asset pipeline
- CSS/LESS compilation
- API proxy configuration (as described in problem statement)
- User authentication flow
- Notification system
- Request management UI

## EditorJS Content Flow

1. **Content Creation** (Admin/CMS):
   - Author creates content using EditorJS interface
   - Content saved as JSON blocks in database

2. **Server-Side Rendering** (Backend API):
   - Backend converts EditorJS JSON to HTML using `renderEditorJsToHtml()`
   - Located in `/api/front_office/src/controllers/new.controller.js`

3. **Template Rendering** (Frontend):
   - Pug mixin `+article-featured` receives article with HTML description
   - Outputs HTML with `.editorjs-output` class for JavaScript targeting

4. **Client-Side Enhancement** (Browser):
   - `editorjs-renderer.js` finds all `.editorjs-output` elements
   - Applies responsive styling, interactivity, and visual enhancements

## Development Notes

### Running the Backend

```bash
cd api/front_office
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### Running the Frontend (When Implemented)

```bash
cd front_office
npm install
npm run dev
```

Frontend should run on `http://localhost:4000`

## Problem Statement Context

This implementation addresses the issue:
> "editorjs-renderer.js n'agit pas sur +article-featured"

**Resolution**: The renderer now correctly targets the `.editorjs-output` class used by the `+article-featured` mixin, ensuring proper enhancement of EditorJS content.

See [EDITORJS_RENDERER_FIX.md](./EDITORJS_RENDERER_FIX.md) for complete technical details.
