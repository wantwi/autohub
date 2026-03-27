# Admin Operations Runbook

## 1) Prepare database

From `apps/api`, apply migrations:

- `node scripts/apply-schema.js`

This applies onboarding/provenance columns required for admin workflows:

- `dealers.onboarding_status`, `onboarding_note`, `onboarded_by_user_id`, `onboarded_at`
- `parts.created_by_user_id`, `created_by_role`

## 2) Create the first admin

Use SQL (Supabase SQL editor or `psql`) to promote a known user:

```sql
UPDATE users
SET role = 'admin'
WHERE id = '<user-uuid>';
```

## 3) Admin onboarding flow

1. Login as admin in web app.
2. Go to `/admin/onboarding`.
3. Search user, select account, and submit dealer profile.
4. Choose onboarding status:
   - `approved` to activate dealer workspace immediately
   - `pending` to hold until review
   - `rejected` to block dealer workspace

## 4) Admin upload-on-behalf flow

1. Go to `/admin/dealer-parts`.
2. Select an approved dealer.
3. Fill listing form and upload images.
4. Submit. Listing is saved with provenance fields:
   - `created_by_user_id` = admin user id
   - `created_by_role` = `admin`

## 5) Regression checks (dealer control)

After admin uploads a listing:

1. Login as that dealer.
2. Open `/dealer/parts`.
3. Verify dealer can:
   - toggle visibility
   - edit listing details
   - delete listing

All actions should continue to use existing `/dealers/me/parts*` endpoints.

