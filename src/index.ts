import { CronJob } from 'cron';
import { Elysia } from 'elysia';
import * as fs from 'fs';
import * as path from 'path';

import Logger from './logger';
import type {
    HypixelItemData,
    SkyblockAsset,
    SkyblockHeadAsset,
    SkyblockItemAsset,
} from './types';
import ImageUtils from './util';

class AssetsHost {
    app!: Elysia<any, any>;
    logger = new Logger();
    imageUtils = new ImageUtils();
    constructor() {
        this.validateEnv();
        this.app = new Elysia()
            .get(
                '/assets/list',
                async () =>
                    new Response(JSON.stringify(Object.keys(this.assets)), {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }),
            )
            .get(
                '/assets/head/:id',
                async ({ params: { id } }) =>
                    new Response(
                        await this.imageUtils
                            .getHead(id)
                            .then((img) => img.toBuffer('image/png')),
                        {
                            headers: {
                                'Content-Type': 'image/png',
                            },
                        },
                    ),
            )
            .get(
                '/assets/item/:id',
                async ({ params: { id }, query: { glow } }) => {
                    id = id.toUpperCase();
                    const item = this.assets[id];
                    if (!item) {
                        return new Response(null, {
                            status: 404,
                        });
                    }
                    return new Response(
                        await this.imageUtils.getSkyblockItem(
                            item,
                            id,
                            Boolean(glow),
                        ),
                        {
                            headers: {
                                'Content-Type': 'image/png',
                            },
                        },
                    );
                },
            )
            .get('/assets/essence/list', async () => {
                return new Response(
                    JSON.stringify(Object.keys(this.essences)),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                );
            })
            .get('/assets/essence/list', async () => {
                return new Response(JSON.stringify(Object.keys(this.essences)), {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
            })
            .get('/assets/essence/:id', async ({ params: { id } }) => {
                id = id.toUpperCase();
                const essence = this.essences[id];
                if (!essence) {
                    return new Response(null, {
                        status: 404,
                    });
                }
                return new Response(
                    await this.imageUtils
                        .getHead(essence)
                        .then((img) => img.toBuffer('image/png')),
                    {
                        headers: {
                            'Content-Type': 'image/png',
                        },
                    },
                );
            })
            .listen(Bun.env.PORT as string, ({ port }) =>
                this.logger.info(`Assets Server listening on port ${port}`),
            );

        // Refresh saved assets json
        new CronJob(
            '*/2 * * * *',
            this.refreshDataCache.bind(this),
            null,
            true,
            'America/Los_Angeles',
        );

        // Clear file store cache to make sure textures are somewhat up-to-date
        new CronJob(
            '0 0 */2 * *',
            this.clearFileStore.bind(this),
            null,
            true,
            'America/Los_Angeles',
        );
    }
    private validateEnv() {
        if (!Bun.env.PORT) {
            console.error('PORT is not defined');
            process.exit(1);
        }
    }
    get assets(): Record<string, SkyblockAsset> {
        return JSON.parse(
            fs.readFileSync('./src/data/items.json', 'utf-8'),
        ) as Record<string, SkyblockAsset>;
    }
    set assets(assets: Record<string, SkyblockAsset>) {
        fs.writeFileSync(
            './src/data/items.json',
            JSON.stringify(assets, null, 2),
        );
    }
    get essences(): Record<string, string> {
        return JSON.parse(
            fs.readFileSync('./src/data/essence.json', 'utf-8'),
        ) as Record<string, string>;
    }
    private async refreshDataCache() {
        let data: Record<string, SkyblockAsset> = {};
        this.logger.info('Refreshing data cache');

        this.logger.info('Fetching Hypixel item data');
        const hypixelItemsDataResponse = await fetch(
            'https://api.slothpixel.me/api/skyblock/items',
        );
        const hypixelItemsData = Object.values(
            await hypixelItemsDataResponse.json(),
        ) as HypixelItemData[];

        for (const itemData of hypixelItemsData) {
            const { id, item_id, material, damage, texture, glowing } =
                itemData;

            const type = material === 'SKULL_ITEM' ? 'head' : 'item';

            if (type === 'item') {
                data[id] = {
                    type,
                    damage: damage ?? 0,
                    item_id,
                } as SkyblockItemAsset;
            } else {
                data[id] = {
                    type,
                    texture: texture ?? '',
                } as SkyblockHeadAsset;
            }
            if (glowing || id === 'ENCHANTED_BOOK') data[id].glowing = true;
        }

        this.assets = data;

        this.logger.info('Finished refreshing data cache');
    }
    private clearFileStore() {
        this.logger.info('Clearing file store');

        for (const file of fs.readdirSync('./store')) {
            if (file.endsWith('.png')) {
                this.logger.info(`Clearing ${file}`);
                fs.unlinkSync(path.join('./store', file));
            }
        }
    }
}

(() => {
    new AssetsHost();
})();

process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error(err);
    process.exit(1);
});
