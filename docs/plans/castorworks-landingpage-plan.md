## Plan: CastorWorks Landing Page Integration (Hostinger)

TL;DR: Deploy the Next.js landing page from CastorWorks-LandingPage to https://devng.castorworks.cloud/ using Hostinger, update the 'Entrar'/'Sign In' button to redirect to CastorWorks-NG sign-in, and ensure proper routing and deployment. No Vercel; manual build and nginx config on Hostinger.

**Steps**
1. Update 'Entrar'/'Sign In' button in CastorWorks-LandingPage/components/landing/navigation.tsx to redirect to https://devng.castorworks.cloud/login
2. Build Next.js app locally: `pnpm build` or `npm run build`
3. Deploy build output (`.next`, `public`, etc.) to Hostinger web root for devng.castorworks.cloud
4. Update nginx config on Hostinger:
   - Serve landing page at `/`
   - Route `/login` to CastorWorks-NG sign-in
   - Ensure static assets and i18n bundles are properly served
5. Test landing page at https://devng.castorworks.cloud/
6. Verify 'Entrar'/'Sign In' button redirects to CastorWorks-NG sign-in

**Relevant files**
- CastorWorks-LandingPage/components/landing/navigation.tsx — update button redirect
- CastorWorks-LandingPage/README.md — deployment instructions
- CastorWorks-LandingPage/next.config.mjs — Next.js config
- deploy/nginx/ — add/update nginx config for devng.castorworks.cloud

**Verification**
1. Open https://devng.castorworks.cloud/ and confirm landing page loads
2. Click 'Entrar'/'Sign In' and confirm redirect to CastorWorks-NG sign-in
3. Run E2E test for landing page and login redirect

**Decisions**
- Use Next.js landing page as main entry for devng.castorworks.cloud
- Redirect login to CastorWorks-NG
- Manual deployment to Hostinger (no Vercel)

**Further Considerations**
1. Ensure Hostinger supports Node.js/Next.js (or use static export if needed)
2. Add Dockerfile/nginx config for future maintainability
3. Confirm i18n and all assets are properly served
