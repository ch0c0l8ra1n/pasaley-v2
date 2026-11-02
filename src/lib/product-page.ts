// Reads a Daraz product page's own data (window.__moduleData__) into what the
// extension reports: every variant (SKU) with its price, and the product's
// details. Reviews themselves are left out; only the rating and count go.
export interface ProductPageSku {
    skuId: string;
    name?: string;
    price?: number;
    originalPrice?: number;
    image?: string;
}

// Shares are 0..1; time on Daraz is as the page shows it, like 5 years.
export interface ProductPageSeller {
    id: string;
    name?: string;
    positiveRating?: number;
    shipOnTime?: number;
    chatResponseRate?: number;
    timeOnDaraz?: { value: number; unit: string };
    rateLevel?: number;
    newSeller?: boolean;
    type?: string;
    size?: number;
}

export interface ProductPage {
    href: string;
    itemId: string;
    selectedSkuId?: string;
    title?: string;
    brand?: string;
    categoryId?: string;
    breadcrumb?: string[];
    seller?: ProductPageSeller;
    rating?: { average: number; count: number };
    flashSaleSkuIds?: string[];
    skus: ProductPageSku[];
}

const pick = <T>(read: () => T): T | undefined => {
    try {
        const value = read();
        return value === null || value === "" ? undefined : value;
    } catch {
        return undefined;
    }
};

// "75%" as 0.75. Daraz leaves out the value when it hasn't enough data.
const share = (metric: any): number | undefined => {
    const match = /^(\d+(?:\.\d+)?)%$/.exec(String(metric?.value ?? "").trim());
    return match ? Number(match[1]) / 100 : undefined;
};

const ofType = <T>(value: unknown, type: string): T | undefined => (typeof value === type ? value as T : undefined);

const readSeller = (seller: any): ProductPageSeller | undefined => {
    if (!seller?.sellerId) return undefined;
    const stats: Omit<ProductPageSeller, "id" | "name"> = {
        positiveRating: pick(() => seller.rate),
        shipOnTime: share(seller.shipOnTime),
        chatResponseRate: share(seller.chatResponsiveRate),
        timeOnDaraz: typeof seller.time === "number" && seller.unit ? { value: seller.time, unit: String(seller.unit) } : undefined,
        rateLevel: ofType<number>(seller.rateLevel, "number"),
        newSeller: ofType<boolean>(seller.newSeller, "boolean"),
        type: pick(() => ofType<string>(seller.type, "string")),
        size: ofType<number>(seller.size, "number"),
    };
    const given = Object.fromEntries(Object.entries(stats).filter(([, value]) => value !== undefined));
    return { id: String(seller.sellerId), name: seller.name || undefined, ...given };
};

// Options can be grouped, like sizes under "Int" or "EU".
const options = (values: any[]): { vid: string; name: string }[] =>
    (values ?? []).flatMap((v) => [...(v?.vid ? [v] : []), ...options(v?.value)]);

export const readProductPage = (fields: any, href: string): ProductPage | null => {
    const itemId = pick(() => String(fields.primaryKey.itemId));
    const skuBase = pick(() => fields.productOption.skuBase);
    if (!itemId || !Array.isArray(skuBase?.skus) || skuBase.skus.length === 0) return null;

    const names = new Map<string, string>();
    for (const property of skuBase.properties ?? []) {
        for (const option of options(property.values)) names.set(`${property.pid}:${option.vid}`, option.name);
    }

    const skus = skuBase.skus.map((sku: any): ProductPageSku => {
        const info = fields.skuInfos?.[sku.skuId] ?? {};
        const name = String(sku.propPath ?? "").split(";").map((path) => names.get(path)).filter(Boolean).join(", ");
        return {
            skuId: String(sku.skuId),
            name: name || undefined,
            price: pick(() => info.price.salePrice.value),
            originalPrice: pick(() => info.price.originalPrice.value),
            image: pick(() => info.image),
        };
    });

    const selectedSkuId = pick(() => String(fields.primaryKey.skuId));
    const seller = pick(() => fields.seller);
    const ratings = pick(() => fields.review.ratings);
    return {
        href,
        itemId,
        selectedSkuId,
        title: pick(() => fields.product.title),
        brand: pick(() => fields.product.brand.name),
        categoryId: pick(() => String(fields.skuInfos[selectedSkuId!].categoryId)),
        breadcrumb: pick(() => fields.Breadcrumb.slice(0, -1).map((b: any) => b.title).filter(Boolean)),
        seller: readSeller(seller),
        rating: typeof ratings?.average === "number" ? { average: ratings.average, count: ratings.rateCount ?? 0 } : undefined,
        flashSaleSkuIds: pick(() => Object.keys(fields.flashSale)),
        skus,
    };
};
