# API Reference — Nirjuli Market Online

Base URL: `http://localhost:3000/api`

---

## GET `/api/shops`

Returns all shops, optionally filtered.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category name (case-insensitive) |
| `search` | string | Search in shop name and description (case-insensitive) |

### Example

```bash
GET /api/shops
GET /api/shops?category=Grocery
GET /api/shops?search=book
GET /api/shops?category=Grocery&search=fresh
```

### Response

```json
[
  {
    "id": 1,
    "name": "Nirjuli Super Mart",
    "category": "Grocery",
    "phone": "919876543210",
    "description": "Your one-stop shop for daily groceries...",
    "address": "Main Market Road, Near SBI ATM, Nirjuli",
    "rating": 4.8,
    "image": "https://...",
    "products": ["https://...", "https://..."]
  }
]
```

---

## GET `/api/shops/:id`

Returns a single shop by ID.

### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric shop ID |

### Response (200)

```json
{
  "id": 1,
  "name": "Nirjuli Super Mart",
  ...
}
```

### Response (404)

```json
{ "error": "Shop not found." }
```

### Response (400)

```json
{ "error": "Invalid shop ID. Must be a number." }
```

---

## GET `/api/categories`

Returns an array of distinct category names.

### Response

```json
["Books", "Clothing", "Electronics", "Grocery"]
```
