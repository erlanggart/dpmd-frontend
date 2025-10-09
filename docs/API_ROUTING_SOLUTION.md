# API Endpoint Routing Solution

## Problem Resolved

Previously, the frontend services were hardcoded to use `/desa/` prefix for all API calls, which caused 403 Forbidden errors when admin users (superadmin, pemberdayaan_masyarakat, pmd) tried to access kelembagaan data from other desa.

## Solution

Created a smart API helper utility that automatically selects the correct endpoint based on:

1. User role (admin vs desa)
2. Current URL context (to detect admin routes with desa_id)
3. Operation type (CRUD operations)

## How It Works

### Automatic Endpoint Selection

```javascript
// Before (hardcoded)
export const getRw = (id) => api.get(`/desa/rw/${id}`);

// After (smart selection)
export const getRw = (id) => makeApiCall(api, "rw", "show", id);
```

### Role-Based Routing

- **Desa Users**: Always use `/desa/*` endpoints
- **Admin Users**: Use `/admin/*` for read operations, `/desa/*` for create operations
- **Parameters**: Automatically adds `desa_id` parameter for admin cross-desa access

### URL Pattern Detection

The helper detects admin context from URL patterns:

- `/kelembagaan/admin/{desaId}`
- `/admin/desa/{desaId}`
- `/dashboard/admin/{desaId}`

## Files Changed

### New Files

- `src/utils/apiHelpers.js` - Core routing utilities

### Updated Files

- `src/services/kelembagaan.js` - All kelembagaan CRUD operations
- `src/services/pengurus.js` - All pengurus CRUD operations

## API Endpoint Mapping

| User Type | Resource | Operation | Endpoint                          |
| --------- | -------- | --------- | --------------------------------- |
| desa      | rw       | list      | `/desa/rw`                        |
| desa      | rw       | show      | `/desa/rw/{id}`                   |
| admin     | rw       | list      | `/admin/rw?desa_id={desaId}`      |
| admin     | rw       | show      | `/admin/rw/{id}?desa_id={desaId}` |
| admin     | rw       | create    | `/desa/rw?desa_id={desaId}`       |

## Benefits

1. **No More 403 Errors**: Admin users can access all desa data
2. **Automatic Routing**: No need to manually specify endpoints
3. **Role Awareness**: System knows user context automatically
4. **URL Context**: Detects admin routes and extracts desa_id
5. **Backward Compatible**: Existing desa user workflows unchanged
6. **Maintainable**: Single source of truth for endpoint logic

## Usage Examples

```javascript
// All these work for both desa and admin users
const rwList = await listRw();
const rwDetail = await getRw(rwId);
const newRw = await createRw(rwData);
const updatedRw = await updateRw(rwId, rwData);

// System automatically:
// - Uses correct endpoint (/desa/ or /admin/)
// - Adds desa_id parameter when needed
// - Handles role-based access control
```

## Testing

Test with different user roles:

1. **Desa User**: Should use `/desa/*` endpoints
2. **Admin User (in desa context)**: Should use `/admin/*` with `desa_id`
3. **Admin User (cross-desa)**: Should work on any desa's data

No code changes needed in components - services handle routing automatically.
