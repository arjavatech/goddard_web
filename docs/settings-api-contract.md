# Settings API Contract

Categories மற்றும் Locations-க்கான API endpoints — Admin மற்றும் Super Admin மட்டுமே use பண்ணலாம்.

---

## Role Access

| API | Super Admin | Admin | Employee |
|-----|:-----------:|:-----:|:--------:|
| GET categories | ✅ | ✅ | ❌ |
| POST category | ✅ | ✅ | ❌ |
| DELETE category | ✅ | ✅ | ❌ |
| GET locations | ✅ | ✅ | ❌ |
| POST location | ✅ | ✅ | ❌ |
| DELETE location | ✅ | ✅ | ❌ |

---

## Categories

### GET `/settings/categories`

List all categories for a school.

**Query Params**

| Param | Type | Required |
|-------|------|----------|
| `school_id` | string | ✅ Yes |

**Response `200`**
```json
[
  {
    "id": "uuid-string",
    "name": "Classroom Supplies",
    "school_id": "uuid-string"
  }
]
```

---

### POST `/settings/categories`

Add a new category.

**Request Body**
```json
{
  "school_id": "uuid-string",
  "name": "Art Supplies"
}
```

**Response `201`**
```json
{
  "id": "uuid-string",
  "name": "Art Supplies",
  "school_id": "uuid-string"
}
```

---

### DELETE `/settings/categories/:id`

Remove a category by ID.

**Path Param**

| Param | Type | Required |
|-------|------|----------|
| `id` | string | ✅ Yes |

> `school_id` தேவையில்லை — `id` மட்டும் போதும்.

**Response `200`**
```json
{}
```

---

## Locations

### GET `/settings/locations`

List all campus locations for a school.

**Query Params**

| Param | Type | Required |
|-------|------|----------|
| `school_id` | string | ✅ Yes |

**Response `200`**
```json
[
  {
    "id": "uuid-string",
    "name": "Kitchen",
    "school_id": "uuid-string"
  }
]
```

---

### POST `/settings/locations`

Add a new location.

**Request Body**
```json
{
  "school_id": "uuid-string",
  "name": "Library"
}
```

**Response `201`**
```json
{
  "id": "uuid-string",
  "name": "Library",
  "school_id": "uuid-string"
}
```

---

### DELETE `/settings/locations/:id`

Remove a location by ID.

**Path Param**

| Param | Type | Required |
|-------|------|----------|
| `id` | string | ✅ Yes |

> `school_id` தேவையில்லை — `id` மட்டும் போதும்.

**Response `200`**
```json
{}
```

---

## Notes

- எல்லா requests-லயும் `Authorization: Bearer <token>` header கட்டாயம்.
- GET மற்றும் POST calls-ல் `school_id` கட்டாயம் pass பண்ண வேண்டும்.
- DELETE calls-ல் path-ல் உள்ள `id` மட்டும் போதும்.
- Frontend service file: `src/services/api/settings.ts`
- Settings page: `src/pages/admin/Settings.tsx`
