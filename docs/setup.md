# Setup Guide — Nirjuli Market Online

## Prerequisites

- **Node.js** v18+ (you have v25.9.0 ✓)
- A web browser

## Installation

```bash
# 1. Navigate to the project
cd c:\Users\aayus\Downloads\nnn

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

## Development Mode

For auto-reload on file changes:

```bash
npm run dev
```

## Accessing the App

Open your browser to: **http://localhost:3000**

- Home page: `http://localhost:3000/`
- About page: `http://localhost:3000/about.html`
- API test: `http://localhost:3000/api/shops`

## Project Structure

```
frontend/    → Static files served to browser
backend/     → Express API server
docs/        → This documentation
```

## Adding a New Shop

Edit `backend/data/database.json` and add a new entry:

```json
{
  "id": 6,
  "name": "Your Shop Name",
  "category": "Grocery",
  "phone": "91XXXXXXXXXX",
  "description": "Short description of the shop.",
  "address": "Full address in Nirjuli",
  "rating": 4.5,
  "image": "https://image-url.jpg",
  "products": ["https://product1.jpg", "https://product2.jpg"]
}
```

Restart the server after editing the JSON file.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm` not recognized | Run `npm.cmd` instead, or fix PowerShell execution policy |
| Port 3000 in use | Set `PORT=3001 node backend/server.js` |
| Blank page | Check browser console for errors, ensure server is running |
