# Auth email templates

Branded HTML for the emails Supabase Auth sends. Supabase does not read these
files; paste each one into the dashboard.

Supabase dashboard → Authentication → Emails → Templates

| Template      | File                  | Subject                              |
|---------------|-----------------------|--------------------------------------|
| Confirm signup| `confirm-signup.html` | Confirm your Resunova account        |
| Magic Link    | `magic-link.html`     | Your Resunova sign-in link           |

The logo loads from `https://www.resunova.io/icon-192.png`, so it must stay
deployed at that path.

For the sender to read "Resunova <hello@resunova.io>" instead of Supabase's
default address (which is also limited to a few emails an hour), set up custom
SMTP under Authentication → Emails → SMTP Settings.
