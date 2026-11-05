# Welcome to the Geometry Dash Shitty List template!

# FAQ

---

### Website FAQ

Can I use the Shitty List template?

- Sure. Credits to the shitty list are embedded onto this template so keep that in.

The website isn't loading! What can I do?

- Since no webhost is perfect, downtime is expected. You can either wait till the
  website is back online or you can do some behind the scene stuff and run it
  locally.

---

### Usage FAQ

How do I add levels to the list?

- Use one of the provided template json files and modify the details to fill in the details
  accordingly. If there are any errors, the site will not load, or you will get a pop up
  saying which level isn't loading.

How do I add records to the list?

- Again, use one of the given templates, and modify the details accordingly. For mobile
  records, you can add the code `mobile: true` within the braces. Make sure there are no
  excess or missing commas, or the website might not load properly.

What are some common reasons for the website not loading?

- The most common cause is missing commas and inverted commas, or extra commas at the end of
  the last lines within list entries. A good way to find the error-causing lines can be found
  by using `Inspect Element` and going to the `Console` tab.

### Records editor setup

The Records tab uses a Cloudflare Worker to authenticate editors and commit level
JSON files to this repository. The username, password, session signing key, and
GitHub token must be Cloudflare Worker secrets; do not put them in the website
JavaScript or commit them to the repository. The provided password is weak; set
a unique, randomly generated password before making the editor available.

1. Create a fine-grained GitHub token restricted to `ESIList/ESIList` with
   **Contents: Read and write** permission.
2. In `worker/wrangler.toml`, set `ADMIN_ALLOWED_ORIGIN` to the exact HTTPS
   origin serving the website. Do not include a path or trailing slash. Change
   the rate limiter `namespace_id` to an integer unique to your Cloudflare account.
3. From the repository root, authenticate Wrangler and set the service secrets:

   ```powershell
   npx wrangler@latest login
   npx wrangler@latest secret put ADMIN_USERNAME --config worker/wrangler.toml
   npx wrangler@latest secret put ADMIN_PASSWORD --config worker/wrangler.toml
   npx wrangler@latest secret put SESSION_SECRET --config worker/wrangler.toml
   npx wrangler@latest secret put GITHUB_TOKEN --config worker/wrangler.toml
   ```

   Set `ADMIN_USERNAME` to `ESILIST`, choose a strong `ADMIN_PASSWORD`, and use
   at least 32 random characters for `SESSION_SECRET`. Provide the token from
   step 1 as `GITHUB_TOKEN`.
4. Deploy the Worker:

   ```powershell
   npx wrangler@latest deploy --config worker/wrangler.toml
   ```

5. Copy the deployed `workers.dev` URL into `recordsApiUrl` in
   `js/admin/config.js`, then publish the website.

The login has an approximate limit of five attempts per IP per minute per
Cloudflare location; it is not a substitute for a strong password. The editor
has two sections: **Verifications** manages runs and progress for levels not
yet on the list, while **Records** shows every listed level, including levels
without records, and manages its completions and progress.

Creating, moving, or deleting a listed level updates `data/_list.json` and
adds position-history entries for every level whose rank changes. Deleting a
level removes its JSON file from the repository after confirmation. The
editor checks that the list has not changed elsewhere before applying these
operations; reload and retry if another update has landed. Each save is
committed directly to the configured GitHub branch.

After changing `worker/index.mjs`, redeploy the Worker with
`npx wrangler@latest deploy --config worker/wrangler.toml`. Publish the website
changes through the configured Cloudflare Pages deployment.

---

## More Coming Soon!

## Repo Maintainers:

- Prometheus
- Emonadeo
