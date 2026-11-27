# Illustration PNGs

Square PNGs named after their illustration slot (for example `welcome.png`, `badge-streak-7.png`). They are the soft 3D
pictures from the first version of the design. The app no longer shows them: every slot is now drawn in code by
`src/components/illustrations/Illustration.tsx`.

`npm run illustrations` still regenerates the asset map (`src/content/illustrationSources.ts`) from the files in this
folder. Slots, sizes and art notes are listed in `src/content/illustrations.ts`, and the project README lists the
slots under "Illustrations".
