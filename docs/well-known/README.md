# Universal link files

Templates for the domain in `LINK_DOMAIN` (default `whynotreactnative.example.com`).
Host both at `https://<domain>/.well-known/<file>` — over HTTPS, no redirects,
`Content-Type: application/json` (the AASA file has **no** `.json` extension).

| File | Replace | Where to get it |
| --- | --- | --- |
| `apple-app-site-association` | `TEAMID` | Apple Developer → Membership |
| `assetlinks.json` | `sha256_cert_fingerprints` | `eas credentials -p android`, or Play Console → App signing |

The app side is already configured in `app.config.ts`: `ios.associatedDomains`
and Android `intentFilters` with `autoVerify` for `/p/`, `/order/` and `/post/`.
`src/app/+native-intent.tsx` rewrites those paths onto the namespaced routes
(`/p/42` → `/projects/store/product/42`).

Verify:

```bash
curl -sI https://<domain>/.well-known/apple-app-site-association   # 200, application/json
adb shell pm get-app-links org.imaginativeworld.whynotreactnative   # "verified"
```
