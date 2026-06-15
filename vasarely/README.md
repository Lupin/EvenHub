# G2 UI Study — Police bitmap avec Public Pixel

## Le principe

Le G2 a une police LVGL unique (~16px). Pour du texte dynamique en grand,
on utilise une **spritesheet bitmap** : chaque caractère est un glyphe dans
une image, et on les assemble sur un canvas HTML avant de pousser vers le G2.

## La police

**Public Pixel** par GGBotNet — domaine public (CC0), 1163 glyphes,
look "écran LED de stade" parfait pour un scoreboard.

La spritesheet est générée par `scripts/generate-bitmap-font.py` :
- Rend chaque caractère via PIL + Public Pixel TrueType
- Dithering Floyd-Steinberg 4-bit (16 nuances de vert G2)
- Export bitmap-font.png + bitmap-font.json (positions)

## Fichiers

```
scripts/generate-bitmap-font.py   ← génère la spritesheet
src/bitmap-font.ts                ← assemble le texte sur canvas
src/main.ts                       ← app G2 (scoreboard)
QRSideload.sh                     ← lancement dev + QR
```

## Usage

```
./QRSideload.sh
```
