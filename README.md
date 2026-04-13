# 🏪 Nirjuli Market Online

A hyperlocal web directory for shops in **Nirjuli, Arunachal Pradesh**.

Customers can browse local shops, search by category, and connect directly via WhatsApp — no app download needed.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or with auto-reload during development
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Project Structure

```
nnn/
├── frontend/          ← Client-side (HTML/CSS/JS)
│   ├── index.html     ← Home page
│   ├── about.html     ← About page
│   ├── css/style.css  ← Design system
│   ├── js/app.js      ← Frontend logic
│   └── assets/        ← Favicon, images
│
├── backend/           ← Server-side (Node.js/Express)
│   ├── server.js      ← Express server
│   ├── routes/shops.js← API route handlers
│   └── data/database.json ← Shop data
│
├── docs/              ← Documentation
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops` | List all shops (optional `?category=` `?search=`) |
| GET | `/api/shops/:id` | Get single shop details |
| GET | `/api/categories` | List all category names |

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend:** Node.js + Express 5
- **Database:** JSON file (upgradeable to SQLite/MongoDB)
- **Fonts:** Inter (Google Fonts)
- **Icons:** Font Awesome 6

## License

ISC
