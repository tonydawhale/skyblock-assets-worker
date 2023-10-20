type SBAssetType = 'item' | 'head';

export type SkyblockAsset = SkyblockItemAsset | SkyblockHeadAsset;

export interface BaseSkyblockAsset {
    type: SBAssetType;
    glowing?: boolean;
}

export interface SkyblockItemAsset extends BaseSkyblockAsset {
    item_id: number;
    damage: number;
}

export interface SkyblockHeadAsset extends BaseSkyblockAsset {
    texture: string;
}

export interface HypixelItemData {
    id: string;
    item_id: number;
    material: string;
    damage?: number;
    texture?: string;
    glowing?: boolean;
}
