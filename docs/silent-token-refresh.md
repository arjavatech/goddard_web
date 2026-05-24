# Silent Background Token Refresh Implementation

## Overview
This implementation provides seamless token refresh without user interruption or logout. The system automatically refreshes tokens in the background before they expire.

## How It Works

### 1. Background Token Refresh Service (`tokenRefreshService.ts`)
- **Runs every 1 minute** to check token expiration
- **Refreshes proactively** when token has 5 minutes left
- **Silent operation** - no user notification
- **Automatic start** - begins when app loads

```typescript
// Automatically started in App.tsx
startBackgroundTokenRefresh();
```

### 2. API Interceptor (`apiInterceptor.ts`)
- **Intercepts all fetch requests** with `fetchWithTokenRefresh()`
- **Catches 401 errors** (token expired)
- **Automatic retry** with fresh token
- **Request queuing** - queues requests while refreshing
- **Graceful fallback** - only redirects to login if refresh fails

### 3. Custom Hook (`useFetchWithAuth.ts`)
- Wrapper around `fetchWithTokenRefresh()`
- Handles timeouts and error management
- Type-safe API calls

## Usage

### For API Calls
Replace regular `fetch()` with `fetchWithTokenRefresh()`:

```typescript
// Before
const response = await fetch(url, options);

// After
const response = await fetchWithTokenRefresh(url, options);
```

### In Components
Use the custom hook:

```typescript
import { useFetchWithAuth } from '@/hooks/useFetchWithAuth';

function MyComponent() {
  const { fetchData } = useFetchWithAuth();

  const loadData = async () => {
    try {
      const data = await fetchData('/api/data');
      // Use data
    } catch (error) {
      // Handle error
    }
  };
}
```

## Token Refresh Flow

```
1. App starts
   ↓
2. Background refresh service starts
   ↓
3. Every 1 minute: Check token expiration
   ↓
4. If token expires in < 5 minutes
   ↓
5. Silently refresh token in background
   ↓
6. User continues working uninterrupted
```

## 401 Error Handling Flow

```
1. API call made with current token
   ↓
2. Server returns 401 (token expired)
   ↓
3. Interceptor catches 401
   ↓
4. Queue any pending requests
   ↓
5. Force refresh token
   ↓
6. If refresh succeeds:
   - Retry original request
   - Process queued requests
   - User never knows
   ↓
7. If refresh fails:
   - Clear pending requests
   - Redirect to login
```

## Key Features

✅ **No User Interruption**
- Token refreshes silently in background
- No login screen appears
- No logout

✅ **Automatic Retry**
- Failed requests automatically retry with new token
- Transparent to user

✅ **Request Queuing**
- Requests made during refresh are queued
- Processed after token refresh completes
- Prevents race conditions

✅ **Graceful Degradation**
- Only redirects to login if refresh token expires
- Rare scenario (refresh token lasts 7-30 days)

✅ **Multi-Tab Support**
- Each tab manages its own refresh
- Supabase syncs session across tabs

## Configuration

### Refresh Intervals (in `tokenRefreshService.ts`)
```typescript
const REFRESH_CHECK_INTERVAL = 60 * 1000;  // Check every 1 minute
const REFRESH_THRESHOLD = 5 * 60 * 1000;   // Refresh when 5 minutes left
```

Adjust these values based on your token expiration time:
- If token expires in 15 minutes, set threshold to 5 minutes
- If token expires in 1 hour, set threshold to 10 minutes

## Error Handling

### Scenario 1: Token Expires During API Call
```
1. API call made
2. Server returns 401
3. Interceptor refreshes token
4. Request retried automatically
5. User sees no error
```

### Scenario 2: Network Error During Refresh
```
1. Refresh fails due to network error
2. Pending requests are queued
3. Next API call will retry refresh
4. Eventually succeeds or redirects to login
```

### Scenario 3: Refresh Token Expired
```
1. Refresh token itself has expired (rare)
2. Refresh fails
3. User redirected to login
4. User logs in again
```

## Monitoring

Check browser console for:
- `Silent token refresh failed` - Token refresh attempt failed
- `Force token refresh failed` - Manual refresh failed
- `Token refresh failed` - Complete failure, redirecting to login

## Best Practices

1. **Use `fetchWithTokenRefresh()` for all API calls**
   ```typescript
   // Good
   const response = await fetchWithTokenRefresh(url, options);
   
   // Avoid
   const response = await fetch(url, options);
   ```

2. **Handle errors appropriately**
   ```typescript
   try {
     const response = await fetchWithTokenRefresh(url, options);
   } catch (error) {
     // Handle error - user may have been redirected to login
   }
   ```

3. **Don't manually call `forceTokenRefresh()`**
   - Let the system handle it automatically
   - Only use for debugging

## Testing

### Test Silent Refresh
1. Open app
2. Wait 1 minute
3. Check browser console - should see refresh attempt
4. Make API call - should work without interruption

### Test 401 Handling
1. Manually expire token (in browser DevTools)
2. Make API call
3. Should automatically refresh and retry
4. No error shown to user

### Test Failed Refresh
1. Disconnect network
2. Wait for token to expire
3. Make API call
4. Should queue request
5. Reconnect network
6. Request should retry and succeed

## Files Modified/Created

- ✅ `src/services/auth/tokenRefreshService.ts` - Background refresh
- ✅ `src/services/auth/apiInterceptor.ts` - 401 handling
- ✅ `src/hooks/useFetchWithAuth.ts` - Custom hook
- ✅ `src/App.tsx` - Start background service
- ✅ `src/pages/admin/DueForms.tsx` - Use interceptor

## Next Steps

1. Replace all `fetch()` calls with `fetchWithTokenRefresh()`
2. Test with real API calls
3. Monitor console for any errors
4. Adjust refresh intervals if needed
