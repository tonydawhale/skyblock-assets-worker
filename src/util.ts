/*
Skyblock item rendering utility functions provided by https://github.com/SkyCryptWebsite/SkyCrypt/
Item glint rendering provided by https://github.com/Altpapier/GlintCreator/
 */
import type { Canvas, Image } from '@napi-rs/canvas';
import { createCanvas, DOMMatrix, loadImage } from '@napi-rs/canvas';
import type { Declaration, Rule } from 'css';
import { parse } from 'css';
const GIFEncoder = require('gif-encoder-2');
import Jimp from 'jimp';
const { rgb2lab } = require('rgb-lab');

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';

import type {
    SkyblockAsset,
    SkyblockHeadAsset,
    SkyblockItemAsset,
} from './types';

export default class ImageUtils {
    private readonly ACCESSORIES: string[] = [
        '5c577e7d31e5e04c2ce71e13e3962192d80bd54b55efaacaaea12966fe27bf9',
        'eaa44b170d749ce4099aa78d98945d193651484089efb87ba88892c6fed2af31',
        '651eb16f22dd7505be5dae06671803633a5abf8b2beeb5c60548670df0e59214',
        '317b51e086f201448a4b45b0b91e97faf4d1739071480be6d5cab0a054512164',
    ];
    private readonly SKEW_A: number = 26 / 45;
    private readonly SKEW_B: number = this.SKEW_A * 2;
    private readonly HAT_FACTOR: number = 0.94;
    private readonly ITEMS_SHEET = loadImage('./public/items.png');
    private readonly ITEMS_CSS = parse(
        readFileSync('./public/items.css', 'utf-8'),
    );

    public async getSkyblockItem(
        data: SkyblockAsset,
        id: string,
    ): Promise<Buffer> {
        if (!existsSync(`./store/${id}.png`)) {
            const item =
                data.type === 'item'
                    ? await this.getImage(
                          (data as SkyblockItemAsset).item_id,
                          (data as SkyblockItemAsset).damage,
                      )
                    : await this.getHead((data as SkyblockHeadAsset).texture);

            const img = data.glowing
                ? await this.addGlint(item)
                : item.toBuffer('image/png');

            writeFileSync(`./store/${id}.png`, img);

            return img;
        } else return readFileSync(`./store/${id}.png`);
    }
    public async getHead(textureId: string, scale = 6.4) {
        return this.renderHead(textureId, scale);
    }
    public async getImage(id: number, damage: number = 0) {
        let coords: number[] = [0, 0];
        for (const rule of this.ITEMS_CSS.stylesheet?.rules as Rule[]) {
            if (!rule.selectors?.includes(`.icon-${id}_${damage}`)) {
                continue;
            }

            coords = (rule.declarations as Declaration[])[0].value
                ?.split(' ')
                .map((a: string) => Math.abs(parseInt(a))) || [0, 0];
        }
        return this.getPart(
            await this.ITEMS_SHEET,
            coords[0],
            coords[1],
            128,
            128,
            1,
        );
    }
    private hasTransparency(canvas: Canvas): boolean {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
        ).data;
        for (let i = 3; i < imageData.length; i += 4) {
            if (imageData[i] < 255) return true;
        }
        return false;
    }
    private resize(src: Canvas | Image, scale: number): Canvas {
        const dst = createCanvas(src.width * scale, src.height * scale);
        const ctx = dst.getContext('2d');

        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(src, 0, 0, src.width * scale, src.height * scale);

        return dst;
    }
    private getPart(
        src: Canvas | Image,
        x: number,
        y: number,
        width: number,
        height: number,
        scale: number,
    ): Canvas {
        const dst = createCanvas(width * scale, height * scale);
        const ctx = dst.getContext('2d');

        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
            src,
            x,
            y,
            width,
            height,
            0,
            0,
            width * scale,
            height * scale,
        );

        return dst;
    }
    private flipX(src: Canvas): Canvas {
        const dst = createCanvas(src.width, src.height);
        const ctx = dst.getContext('2d');

        ctx.translate(src.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(src, 0, 0);

        return dst;
    }
    private darken(src: Canvas, factor: number): Canvas {
        const dst = createCanvas(src.width, src.height);
        const ctx = dst.getContext('2d');

        ctx.drawImage(src, 0, 0);

        ctx.globalCompositeOperation = 'source-atop';

        ctx.fillStyle = `rgba(0, 0, 0, ${factor})`;
        ctx.fillRect(0, 0, src.width, src.height);

        return dst;
    }
    private async renderColoredItem(
        color: string | CanvasGradient | CanvasPattern,
        baseImage: Canvas,
        overlayImage: Canvas,
    ): Promise<Buffer> {
        const canvas = createCanvas(16, 16);
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'multiply';

        ctx.drawImage(baseImage, 0, 0);

        ctx.globalCompositeOperation = 'destination-in';

        ctx.drawImage(baseImage, 0, 0);

        ctx.globalCompositeOperation = 'source-over';

        ctx.drawImage(overlayImage, 0, 0);

        return canvas.toBuffer('image/png');
    }
    private async renderHead(
        textureId: string,
        scale: number,
    ): Promise<Canvas> {
        const canvas = createCanvas(scale * 20, scale * 18.5);
        const hatCanvas = createCanvas(scale * 20, scale * 18.5);
        const hatBgCanvas = createCanvas(scale * 20, scale * 18.5);
        const headCanvas = createCanvas(
            scale * 20 * this.HAT_FACTOR,
            scale * 18.5,
        );

        const ctx = canvas.getContext('2d');
        const hat = hatCanvas.getContext('2d');
        const hatBg = hatBgCanvas.getContext('2d');
        const head = headCanvas.getContext('2d');

        const skin = await loadImage(
            `https://textures.minecraft.net/texture/${textureId}`,
        );

        const headBottom = this.darken(
            this.resize(
                this.getPart(skin, 16, 0, 8, 8, 1),
                scale * (this.HAT_FACTOR + 0.01),
            ),
            0.3,
        );
        const headTop = this.resize(
            this.getPart(skin, 8, 0, 8, 8, 1),
            scale * (this.HAT_FACTOR + 0.01),
        );
        let headBack = this.darken(
            this.flipX(
                this.resize(
                    this.getPart(skin, 24, 8, 8, 8, 1),
                    scale * (this.HAT_FACTOR + 0.01),
                ),
            ),
            0.3,
        );
        let headFront = this.darken(
            this.resize(
                this.getPart(skin, 8, 8, 8, 8, 1),
                scale * (this.HAT_FACTOR + 0.01),
            ),
            0.25,
        );
        const headLeft = this.flipX(
            this.resize(
                this.getPart(skin, 16, 8, 8, 8, 1),
                scale * (this.HAT_FACTOR + 0.01),
            ),
        );
        const headRight = this.darken(
            this.resize(
                this.getPart(skin, 0, 8, 8, 8, 1),
                scale * (this.HAT_FACTOR + 0.01),
            ),
            0.15,
        );

        let headTopOverlay: Canvas | undefined,
            headFrontOverlay: Canvas | undefined,
            headRightOverlay: Canvas | undefined,
            headBackOverlay: Canvas | undefined,
            headBottomOverlay: Canvas | undefined,
            headLeftOverlay: Canvas | undefined;

        if (this.hasTransparency(this.getPart(skin, 32, 0, 32, 32, 1))) {
            headTopOverlay = this.resize(
                this.getPart(skin, 40, 0, 8, 8, 1),
                scale,
            );
            headFrontOverlay = this.darken(
                this.resize(this.getPart(skin, 40, 8, 8, 8, 1), scale),
                0.25,
            );
            headRightOverlay = this.darken(
                this.resize(this.getPart(skin, 32, 8, 8, 8, 1), scale),
                0.15,
            );
            headBackOverlay = this.darken(
                this.flipX(
                    this.resize(this.getPart(skin, 56, 8, 8, 8, 1), scale),
                ),
                0.3,
            );
            headBottomOverlay = this.darken(
                this.resize(this.getPart(skin, 48, 0, 8, 8, 1), scale),
                0.3,
            );
            headLeftOverlay = this.resize(
                this.flipX(this.getPart(skin, 48, 8, 8, 8, 1)),
                scale,
            );
        }

        let x = 0;
        let y = 0;
        let z = 0;

        const zOffset = scale * 3;
        const xOffset = scale * 2;

        if (headTopOverlay) {
            x = xOffset + 8 * scale;
            y = 0;
            z = zOffset - 8 * scale;
            hatBg.setTransform(
                new DOMMatrix([1, this.SKEW_A, 0, this.SKEW_B, 0, 0]),
            );
            hatBg.drawImage(
                headLeftOverlay as Canvas,
                x + y,
                z - y,
                (headLeftOverlay as Canvas).width,
                (headLeftOverlay as Canvas).height,
            );

            if (!this.ACCESSORIES.includes(textureId)) {
                // hat back
                x = xOffset;
                y = 0;
                z = zOffset - 0.5;
                hatBg.setTransform(
                    new DOMMatrix([
                        1,
                        -this.SKEW_A,
                        0,
                        this.SKEW_B,
                        0,
                        this.SKEW_A,
                    ]),
                );
                hatBg.drawImage(
                    headBackOverlay as Canvas,
                    y + x,
                    x + z,
                    (headBackOverlay as Canvas).width,
                    (headBackOverlay as Canvas).height,
                );
            }

            // hat bottom
            x = xOffset;
            y = 0;
            z = zOffset + 8 * scale;
            hatBg.setTransform(
                new DOMMatrix([1, -this.SKEW_A, 1, this.SKEW_A, 0, 0]),
            );
            hatBg.drawImage(
                headBottomOverlay as Canvas,
                y - z,
                x + z,
                (headBottomOverlay as Canvas).width,
                (headBottomOverlay as Canvas).height,
            );

            // hat top
            x = xOffset;
            y = 0;
            z = zOffset;
            hat.setTransform(
                new DOMMatrix([1, -this.SKEW_A, 1, this.SKEW_A, 0, 0]),
            );
            hat.drawImage(
                headTopOverlay as Canvas,
                y - z,
                x + z,
                (headTopOverlay as Canvas).width,
                (headTopOverlay as Canvas).height,
            );

            // hat front
            x = xOffset + 8 * scale;
            y = 0;
            z = zOffset - 0.5;
            hat.setTransform(
                new DOMMatrix([
                    1,
                    -this.SKEW_A,
                    0,
                    this.SKEW_B,
                    0,
                    this.SKEW_A,
                ]),
            );
            hat.drawImage(
                headFrontOverlay as Canvas,
                y + x,
                x + z,
                (headFrontOverlay as Canvas).width,
                (headFrontOverlay as Canvas).height,
            );

            // hat right
            x = xOffset;
            y = 0;
            z = zOffset;
            hat.setTransform(
                new DOMMatrix([1, this.SKEW_A, 0, this.SKEW_B, 0, 0]),
            );
            hat.drawImage(
                headRightOverlay as Canvas,
                x + y,
                z - y,
                (headRightOverlay as Canvas).width,
                (headRightOverlay as Canvas).height,
            );
        }

        scale *= this.HAT_FACTOR;

        // head bottom
        x = xOffset;
        y = 0;
        z = zOffset + 8 * scale;
        head.setTransform(
            new DOMMatrix([1, -this.SKEW_A, 1, this.SKEW_A, 0, 0]),
        );
        head.drawImage(
            headBottom,
            y - z,
            x + z,
            headBottom.width,
            headBottom.height,
        );

        // head left
        x = xOffset + 8 * scale;
        y = 0;
        z = zOffset - 8 * scale;
        head.setTransform(
            new DOMMatrix([1, this.SKEW_A, 0, this.SKEW_B, 0, 0]),
        );
        head.drawImage(headLeft, x + y, z - y, headLeft.width, headLeft.height);

        // head back
        x = xOffset;
        y = 0;
        z = zOffset;
        head.setTransform(
            new DOMMatrix([1, -this.SKEW_A, 0, this.SKEW_B, 0, this.SKEW_A]),
        );
        head.drawImage(headBack, y + x, x + z, headBack.width, headBack.height);

        // head top
        x = xOffset;
        y = 0;
        z = zOffset;
        head.setTransform(
            new DOMMatrix([1, -this.SKEW_A, 1, this.SKEW_A, 0, 0]),
        );
        head.drawImage(headTop, y - z, x + z, headTop.width, headTop.height);

        // head front
        x = xOffset + 8 * scale;
        y = 0;
        z = zOffset;
        head.setTransform(
            new DOMMatrix([1, -this.SKEW_A, 0, this.SKEW_B, 0, this.SKEW_A]),
        );
        head.drawImage(
            headFront,
            y + x,
            x + z,
            headFront.width,
            headFront.height,
        );

        // head right
        x = xOffset;
        y = 0;
        z = zOffset;
        head.setTransform(
            new DOMMatrix([1, this.SKEW_A, 0, this.SKEW_B, 0, 0]),
        );
        head.drawImage(
            headRight,
            x + y,
            z - y,
            headRight.width,
            headRight.height,
        );

        ctx.drawImage(hatBgCanvas, 0, 0);
        ctx.drawImage(
            headCanvas,
            (scale * 20 - scale * 20 * this.HAT_FACTOR) / 2,
            (scale * 18.5 - scale * 18.5 * this.HAT_FACTOR) / 2,
        );
        ctx.drawImage(hatCanvas, 0, 0);

        return canvas;
    }
    private async addGlint(src: Canvas) {
        const encoder = new GIFEncoder(src.width, src.height, 'octree', true);

        encoder.setDelay(50);
        encoder.setQuality(30);
        encoder.setThreshold(100);
        encoder.setRepeat(0);
        encoder.setTransparent(0xff000000);
        encoder.start();

        const files = readdirSync('./public/glint');

        for (const file of files) {
            const dst = createCanvas(src.width, src.height);
            const ctx = dst.getContext('2d');

            ctx.globalCompositeOperation = 'screen';
            ctx.imageSmoothingEnabled = false;

            ctx.drawImage(src, 0, 0, src.width, src.height);
            const buffer = dst.toBuffer('image/png');

            const TRANSPARENT = [0, 0, 0, 0];
            const TRANSPARENT_PIXELS: number[] = [];

            const jimpObject = await Jimp.read(buffer);
            jimpObject.scan(
                0,
                0,
                jimpObject.bitmap.width,
                jimpObject.bitmap.height,
                function (x, y, idx) {
                    const currentLABColor = rgb2lab([
                        jimpObject.bitmap.data[idx],
                        jimpObject.bitmap.data[idx + 1],
                        jimpObject.bitmap.data[idx + 2],
                    ]);

                    if (
                        currentLABColor[0] === TRANSPARENT[0] &&
                        currentLABColor[1] === TRANSPARENT[1] &&
                        currentLABColor[2] === TRANSPARENT[2]
                    ) {
                        TRANSPARENT_PIXELS.push(idx);
                    }
                },
            );

            const img = await loadImage(`./public/glint/${file}`);

            ctx.drawImage(img, 0, 0, src.width, src.height);
            const buffer2 = dst.toBuffer('image/png');
            const jimpObject2 = await Jimp.read(buffer2);

            for (const PIXEL of TRANSPARENT_PIXELS) {
                jimpObject2.bitmap.data[PIXEL] = TRANSPARENT[0];
                jimpObject2.bitmap.data[PIXEL + 1] = TRANSPARENT[1];
                jimpObject2.bitmap.data[PIXEL + 2] = TRANSPARENT[2];
                jimpObject2.bitmap.data[PIXEL + 3] = TRANSPARENT[3];
            }
            const jimpBuffer = await jimpObject2.getBufferAsync('image/png');

            const dst2 = createCanvas(src.width, src.height);
            const ctx2 = dst2.getContext('2d');

            const out = await loadImage(jimpBuffer);
            ctx2.drawImage(out, 0, 0, src.width, src.height);

            encoder.addFrame(ctx2);
        }

        encoder.finish();

        return encoder.out.getData() as Buffer;
    }
}
