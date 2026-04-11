# ShieldWrite Frontend

## Run

1. Install dependencies:
```bash
npm install
```

2. Configure API base URL:
Create a `.env` file in this folder and set:
```env
VITE_API_BASE_URL=http://localhost:3000
```

3. Start the app:
```bash
npm run dev
```

## Build

```bash
npm run build
```

## Backend Integration

The frontend talks to these backend endpoints:
- `/api/auth/signup`
- `/api/auth/login`
- `/api/auth/verify-otp`
- `/api/auth/refresh-token`
- `/api/auth/logout`
- `/api/auth/logout-all`
- `/api/auth/me`
- `/api/blogs`
- `/api/comments`

## MFA Flow

1. User logs in with email and password.
2. Backend returns `mfaToken`.
3. User enters OTP on the verification page.
4. Backend returns `token` and `refreshToken`.
5. Frontend stores them in localStorage for the prototype.
