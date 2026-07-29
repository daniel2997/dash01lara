17:22:22.765 Running build in Washington, D.C., USA (East) – iad1
17:22:22.765 Build machine configuration: 2 cores, 8 GB
17:22:22.921 Cloning github.com/daniel2997/dash01lara (Branch: master, Commit: f01af98)
17:22:22.922 Previous build caches not available.
17:22:23.102 Cloning completed: 180.000ms
17:22:23.446 Running "vercel build"
17:22:24.173 Vercel CLI 50.35.0
17:22:24.386 Installing dependencies...
17:22:53.504 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
17:22:54.265 npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
17:22:54.987 npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
17:22:55.212 npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
17:22:55.491 npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
17:22:56.213 npm warn deprecated glob@10.3.10: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
17:22:57.618 npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.
17:23:01.808 npm warn deprecated next@14.2.5: This version has a security vulnerability. Please upgrade to a patched version. See https://nextjs.org/blog/security-update-2025-12-11 for more details.
17:23:02.046 
17:23:02.046 added 432 packages in 37s
17:23:02.047 
17:23:02.047 151 packages are looking for funding
17:23:02.047   run `npm fund` for details
17:23:02.117 Detected Next.js version: 14.2.5
17:23:02.124 Running "npm run build"
17:23:02.218 
17:23:02.218 > dashlara@0.1.0 build
17:23:02.218 > next build
17:23:02.218 
17:23:02.724 Attention: Next.js now collects completely anonymous telemetry regarding usage.
17:23:02.725 This information is used to shape Next.js' roadmap and prioritize features.
17:23:02.725 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
17:23:02.725 https://nextjs.org/telemetry
17:23:02.725 
17:23:02.773   ▲ Next.js 14.2.5
17:23:02.774 
17:23:02.790    Creating an optimized production build ...
17:23:18.054  ✓ Compiled successfully
17:23:18.055    Linting and checking validity of types ...
17:23:22.490    Collecting page data ...
17:23:23.840    Generating static pages (0/6) ...
17:23:24.052    Generating static pages (1/6) 
17:23:24.053    Generating static pages (2/6) 
17:23:24.114    Generating static pages (4/6) 
17:23:24.146 Error: supabaseUrl is required.
17:23:24.146     at /vercel/path0/.next/server/chunks/995.js:55:48130
17:23:24.146     at new rM (/vercel/path0/.next/server/chunks/995.js:55:48381)
17:23:24.147     at rR (/vercel/path0/.next/server/chunks/995.js:55:52121)
17:23:24.147     at 5442 (/vercel/path0/.next/server/chunks/754.js:1:7089)
17:23:24.147     at t (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.147     at 2269 (/vercel/path0/.next/server/app/funil/page.js:1:1919)
17:23:24.147     at Object.t [as require] (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.147     at require (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:16:18490)
17:23:24.147     at I (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:94362)
17:23:24.148     at /vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:96668 {
17:23:24.148   digest: '1554594158'
17:23:24.148 }
17:23:24.173 
17:23:24.173 Error occurred prerendering page "/funil". Read more: https://nextjs.org/docs/messages/prerender-error
17:23:24.174 
17:23:24.174 Error: supabaseUrl is required.
17:23:24.174     at /vercel/path0/.next/server/chunks/995.js:55:48130
17:23:24.174     at new rM (/vercel/path0/.next/server/chunks/995.js:55:48381)
17:23:24.174     at rR (/vercel/path0/.next/server/chunks/995.js:55:52121)
17:23:24.174     at 5442 (/vercel/path0/.next/server/chunks/754.js:1:7089)
17:23:24.174     at t (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.175     at 2269 (/vercel/path0/.next/server/app/funil/page.js:1:1919)
17:23:24.175     at Object.t [as require] (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.175     at require (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:16:18490)
17:23:24.176     at I (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:94362)
17:23:24.176     at /vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:96668
17:23:24.193 Error: supabaseUrl is required.
17:23:24.193     at /vercel/path0/.next/server/chunks/995.js:55:48130
17:23:24.193     at new rM (/vercel/path0/.next/server/chunks/995.js:55:48381)
17:23:24.193     at rR (/vercel/path0/.next/server/chunks/995.js:55:52121)
17:23:24.194     at 5442 (/vercel/path0/.next/server/chunks/754.js:1:7089)
17:23:24.194     at t (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.194     at 6950 (/vercel/path0/.next/server/app/midia/page.js:1:1918)
17:23:24.194     at Object.t [as require] (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.194     at require (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:16:18490)
17:23:24.194     at I (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:94362)
17:23:24.194     at /vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:96668 {
17:23:24.194   digest: '1310712250'
17:23:24.194 }
17:23:24.198 
17:23:24.198 Error occurred prerendering page "/midia". Read more: https://nextjs.org/docs/messages/prerender-error
17:23:24.199 
17:23:24.199 Error: supabaseUrl is required.
17:23:24.199     at /vercel/path0/.next/server/chunks/995.js:55:48130
17:23:24.199     at new rM (/vercel/path0/.next/server/chunks/995.js:55:48381)
17:23:24.199     at rR (/vercel/path0/.next/server/chunks/995.js:55:52121)
17:23:24.199     at 5442 (/vercel/path0/.next/server/chunks/754.js:1:7089)
17:23:24.199     at t (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.199     at 6950 (/vercel/path0/.next/server/app/midia/page.js:1:1918)
17:23:24.200     at Object.t [as require] (/vercel/path0/.next/server/webpack-runtime.js:1:142)
17:23:24.200     at require (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:16:18490)
17:23:24.200     at I (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:94362)
17:23:24.200     at /vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:12:96668
17:23:24.201  ✓ Generating static pages (6/6)
17:23:24.214 
17:23:24.214 > Export encountered errors on following paths:
17:23:24.214 	/funil/page: /funil
17:23:24.214 	/midia/page: /midia
17:23:24.245 Error: Command "npm run build" exited with 1