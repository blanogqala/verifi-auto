# Included visual assets

| Local file | Used for | Original image URL |
| --- | --- | --- |
| `frontend/public/images/engine-detail.jpg` | Landing hero engine photograph | https://images.unsplash.com/photo-1486262715619-67b85e0b08d3 |
| `frontend/public/images/workshop-tools.jpg` | Workshop tools / verification feature image | https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f |

These are the two photographic assets used in the preview. Both are included in the ZIP. Neither is evidence of an actual verified professional.

To replace an image, overwrite the corresponding local file or edit `frontend/src/config/assets.ts`. Public-folder URLs start with `/images/`. Update alt text if the subject changes. Hero brightness and the protective text gradient are in `frontend/src/styles/workspace.css` under `.hero-photo` and `.hero-shade`.

The logo is text plus a Lucide shield icon; there is no missing external logo file. Other UI icons come from the `lucide-react` package installed by `npm ci`.

Manrope and DM Sans are referenced through Google Fonts in `frontend/index.html`; font files are not bundled. With no network connection the app uses its sans-serif fallback. Self-hosting those fonts can be added later without changing the page components.
