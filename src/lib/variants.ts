// Turns per-variant price histories into the few lines worth drawing.

type Point = [number, number];

export interface VariantPrices {
    skuId: string | null;
    name?: string; // from the product page; unknown for variants no longer listed
    prices: Point[];
}

export interface PriceLine {
    name: string;
    data: Point[];
    selected: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

const parts = (name: string) => name.split(", ");

// Drops the parts every named variant shares: "Orange, 12GB, 512GB" becomes "Orange, 512GB"
// when every variant has 12GB.
const shortNames = (variants: VariantPrices[]) => {
    const names = variants.flatMap((v) => (v.name ? [v.name] : []));
    const common = names.length > 1 ? parts(names[0]).filter((part) => names.every((name) => parts(name).includes(part))) : [];
    return variants.map((v) => !v.name ? (v.skuId ? "Variant no longer listed" : "Variant not known")
        : parts(v.name).filter((part) => !common.includes(part)).join(", ") || v.name);
};

// "512GB (Orange / blue / Silver)" for variants that differ only in colour.
const groupName = (names: string[]) => {
    if (names.length === 1) return names[0];
    const shared = parts(names[0]).filter((part) => names.every((name) => parts(name).includes(part)));
    if (shared.length === 0) return names.join(" / ");
    return `${shared.join(", ")} (${names.map((name) => parts(name).filter((part) => !shared.includes(part)).join(", ")).join(" / ")})`;
};

// The prices a variant went through, in order, ignoring when it was seen at each.
const priceSteps = (prices: Point[]) => prices.map(([, price]) => price).filter((price, i, all) => price !== all[i - 1]).join();

// One line per price history: variants that have always cost the same (often every colour of
// one size) share a line. Variants not seen for 60 days (most likely no longer sold) are left
// out, unless that's all of them.
export const priceLines = (variants: VariantPrices[], selected?: string): PriceLine[] => {
    const named = shortNames(variants).map((name, i) => ({ ...variants[i], name }));
    const recent = named.filter((v) => v.prices.length > 0 && v.prices[v.prices.length - 1][0] > Date.now() - 60 * DAY);
    const groups = new Map<string, typeof named>();
    for (const variant of recent.length > 0 ? recent : named) {
        const key = priceSteps(variant.prices);
        groups.set(key, [...(groups.get(key) ?? []), variant]);
    }
    return [...groups.values()]
        .map((group) => ({
            name: groupName(group.map((v) => v.name)),
            data: group.flatMap((v) => v.prices).sort((a, b) => a[0] - b[0]),
            selected: group.some((v) => v.skuId === selected),
        }))
        // Most expensive first, so the tooltip lists them in the order the lines are drawn.
        .sort((a, b) => b.data[b.data.length - 1][1] - a.data[a.data.length - 1][1]);
};
