# Y-AID website

All the words and photos live in `content/*.json`. You edit them in a browser with **Pages CMS**, and GitHub rebuilds and republishes the site about a minute after each save.

## One-time setup (about 15 minutes)

1. **Make a GitHub account** at github.com, if you don't have one (a club account works well, so it can be handed down).
2. **Put this folder on GitHub.** Install **GitHub Desktop** (desktop.github.com) and sign in. Then:
   - File → Add Local Repository → choose this `y-aid-website` folder.
   - Write a summary such as "First version" and click **Commit to main**.
   - Click **Publish repository**. Name it `y-aid-website` and untick "Keep this code private" (GitHub Pages is free for public repositories).
3. **Turn on GitHub Pages.** On github.com, open the repository → **Settings** → **Pages** → under "Build and deployment", set **Source** to **GitHub Actions**.
4. **Wait for the first publish.** The **Actions** tab shows "Publish site" running. When it turns green, the site is live at
   `https://<your-github-name>.github.io/y-aid-website/`.
   (If it ran before step 3 and failed, open the failed run and click **Re-run all jobs**.)
5. **Connect the editor.** Go to **pagescms.org**, sign in with GitHub, allow access to the `y-aid-website` repository and open it.

## Editing

In Pages CMS, the left menu has **Home page, About page, Projects, Team, Contact page, Site settings**.

- **Text:** type into the fields and click **Save**. In text you can write `**bold**`, `*italic*` and `[link text](contact.html)`. In the large closing words, `*word*` turns light blue.
- **Photos:** click a photo field, then upload or pick one. Any size or shape works, because the site crops to fit (headshots keep the top of the frame, where faces are). Photos around 1600px wide or smaller keep the site fast.
- **People:** add, remove or reorder under **Team**. Leave a photo empty and the person's initials show instead.
- **Projects:** each has a filter category; tick **Featured** on up to three to show them on the home page.
- **Add editors:** invite club members as collaborators on the GitHub repository (Settings → Collaborators). They then sign in to Pages CMS with their own GitHub accounts.

Every save goes live in about a minute. Every change is kept in the repository's history, so a mistake can always be undone.

## Your own address (optional)

A domain such as `yaid.org` can point at the site: GitHub repository → Settings → Pages → **Custom domain**, plus the DNS records GitHub lists there. Ask Yale ITS for a `yale.edu` address.

## On your computer (optional)

With Node 22 installed, `node tools/build.mjs` builds the site into `_site/`. Open `_site/index.html` to view it. The design lives in `styles.css` and `script.js`, and the page layouts are in `tools/build.mjs`.
