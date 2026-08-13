# Free leaked-password control

Supabase native leaked-password protection remains disabled on the Free plan. Foremention uses the free Have I Been Pwned Pwned Passwords range API as an application-side mitigation. The application must never send a plaintext password or full password hash to that service; only the first five characters of a locally computed SHA-1 hash are sent, and the returned suffix set is compared locally. This mitigation does not claim that the Supabase native advisor control is enabled.
