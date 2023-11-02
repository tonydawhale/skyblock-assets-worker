# Skyblock Assets Worker

A self-sufficient worker that generates Hypixel Skyblock assets.

## API Usage

* `/assets/list` - lists all the supported skyblock assets
* `/assets/item/:skyblock_id` - fetches the item with the specified skyblock item id
* `/assets/essence/list` - lists all the supported skyblock essences
* `/assets/essence/:essence_name` - fetches the skyblock essence with the specified name
* `/assets/head/:texture_id` - fetches the head with the specified minecraft texture id

## Development
Copy the `.env.example` file to `.env.local` and fill in the required values.
```bash
cp .env.example .env.local
```
To start the development server, run:
```bash
bun run dev
```
Open http://localhost:25615/ with your browser to see the server run.

## Production
To start the production server, run:
```bash
bun src/index.ts
```
Open http://localhost:25615/ with your browser to see the server run.

## Development Roadmap
- [x] Item Rendering
- [x] Essence Rendering
- [x] Head Rendering
- [x] Item List
- [ ] Support for texture packs
- [x] Support for specifying whether to render the item with an enchant glint or not

## Technologies used
- [TypeScript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh/)
- [Elysia.js](https://elysiajs.com/)
- [Docker](https://www.docker.com/)

## Acknowledgements
* [SkyCrypt](https://github.com/SkyCryptWebsite/SkyCrypt/) - Skyblock Item Rendering
* [Altpapier](https://github.com/Altpapier/GlintCreator/) - Glint Creator

## License
This project is licensed under the [MIT License](https://opensource.org/licenses/MIT)