// The product page's variants, shared between the page script (which can read
// the page's data) and the chart (which can't) through an attribute on <html>.
export interface PageSkus {
    selected?: string;
    skus: { skuId: string; name?: string }[];
}

const ATTRIBUTE = "data-pasaley-skus";

export const selectedSkuFromUrl = (pathname: string) => pathname.match(/-s(\d+)\.html$/)?.[1];

export const publishSkus = (skus: PageSkus) => {
    document.documentElement.setAttribute(ATTRIBUTE, JSON.stringify(skus));
};

export const watchSkus = (onChange: (skus: PageSkus) => void) => {
    const read = () => {
        try {
            const value = document.documentElement.getAttribute(ATTRIBUTE);
            if (value) onChange(JSON.parse(value));
        } catch {
            // Not ours, or half written: wait for the next change.
        }
    };
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [ATTRIBUTE] });
    read();
    return () => observer.disconnect();
};
