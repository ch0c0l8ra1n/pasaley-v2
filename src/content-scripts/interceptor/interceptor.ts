import API from "@/lib/api";
import { getProductId, getHostCountry, getItemQuantity } from "@/lib/utils";
import { readProductPage } from "@/lib/product-page";
import { publishSkus, selectedSkuFromUrl } from "@/lib/skus";

const api = new API();

document.addEventListener("click", (event: MouseEvent) => {
    // console.log("Pasaley click tracking.");
    const productId = getProductId();
    const hostCountry = getHostCountry();

    if (!productId || !hostCountry) return;

    console.log("Product ID:", productId);


    // Find the closest button element (or a specific container if buttons have a class)
    const button = (event.target as HTMLElement).closest("button");


    if (button) {
        // console.log("Button clicked:", button);
        // Handle the button logic here

        // check if button has text "Add to Cart" lowercase and account for whitespace
        if (button.textContent?.toLowerCase().replace(/\s/g, "") === "addtocart"){
            // console.log("Add to cart clicked!");
            const quantity = getItemQuantity();
            // console.log("Quantity:", quantity);

            // Send the data to the API
            api.ingestClick({
                type: "addtocart",
                id: productId,
                hostCountry,
                quantity: Number(quantity),
            });
        }
        // now do buy now
        else if (button.textContent?.toLowerCase().replace(/\s/g, "") === "buynow"){
            // console.log("Buy now clicked!");
            const quantity = getItemQuantity();
            // console.log("Quantity:", quantity);

            api.ingestClick({
                type: "buynow",
                id: productId,
                hostCountry,
                quantity: Number(quantity),
            });
        }
    } else {
        console.log("Click wasn't on a button.");
    }
});


// A product listing: anything with an itemId and a price. Arrays also hold nulls
// and plain values, which aren't items.
const isItem = (item: unknown): item is Record<string, any> =>
    item !== null && typeof item === "object" && "itemId" in item && ("price" in item || "itemDiscountPrice" in item);

const findItems = (data: any | any[],parent="ROOT") : any[] => {
    const items = [];

    for (const key of Object.getOwnPropertyNames(data)){
        // console.log(`Exploring ${parent} -> ${key}`);
        if (!data[key]) continue;

        if (Array.isArray(data[key]) && data[key].length > 0){
            // Check if all items in array contain keys itemId and itemPrice
            if (data[key].some(isItem)){
                //console.log("Found some items");
                    if (data[key].filter(isItem).length > data[key].filter((item: unknown) => !isItem(item)).length){
                        const valid_items = data[key].filter(isItem);
                        console.log(key,"Found items: ",valid_items);
                        items.push(...valid_items);
                    }
                }
            else {
                // Explore array
                items.push(...findItems(data[key],`${parent} -> ${key}`));
            }
        }
        else if (typeof data[key] === "object"){
            items.push(...findItems(data[key],`${parent} -> ${key}`));
        }
    }
    return items;
}

const processItems = (items:any[]) => {
    console.log("Processing items: ",items);
    // remove duplicates by merging items with same itemId
    const uniqueItems = items.reduce((acc, item) => {
        const existingItem = acc.find((i:any) => i.itemId === item.itemId);
        if (existingItem){
            Object.keys(item).forEach(key => {
                if (existingItem[key] === undefined){
                    existingItem[key] = item[key];
                }
            });
        }
        else {
            acc.push(item);
        }
        return acc;
    }, []);

    if (uniqueItems.length !== items.length){
        console.log(`Duplicate items found | ${items.length} -> ${uniqueItems.length}`)
    }


    // const hostCountry = getHostCountry();
    // for (const item of uniqueItems){
    //     item.hostCountry = hostCountry;
    // }

    return uniqueItems;
}

// Sends the products listed in `data`, which came from `url` (a response, or
// the page itself).
const reportItems = (data: unknown, url: string) => {
    try {
        const items = findItems(data);
        if (items.length > 0) api.sendListItems(processItems(items), url);
    } catch (err) {
        console.warn("Pasaley: could not read the products in", url, err);
    }
};

// Responses read in the last few seconds, so one seen by both the XHR and the
// fetch hook (a fetch polyfill built on XHR) is reported once.
const seen = new Map<string, number>();
const reportResponse = (text: string, url: string) => {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return; // not JSON
    }
    const now = Date.now();
    for (const [key, at] of seen) if (now - at > 5000) seen.delete(key);
    const key = `${url}\n${text.length}`;
    if (seen.has(key)) return;
    seen.set(key, now);
    reportItems(data, url);
};

const oldXHROpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function(this: XMLHttpRequest, ...args: unknown[]) {
    this.addEventListener("load", function() {
        // responseText is only readable for text responses.
        if (this.responseType !== "" && this.responseType !== "text") return;
        reportResponse(this.responseText, this.responseURL);
    });
    return oldXHROpen.apply(this, args as Parameters<XMLHttpRequest["open"]>);
};

const oldFetch = window.fetch;
window.fetch = async function(this: unknown, ...args: Parameters<typeof fetch>) {
    const response = await oldFetch.apply(this, args);
    if (response.headers.get("content-type")?.includes("json")) {
        // A copy, so the page still gets to read the body.
        response.clone().text().then((text) => reportResponse(text, response.url)).catch(() => {});
    }
    return response;
};

function callWhenBodyIsReady(callback: Function) {
    if (document.body) {
        callback();  // If document.body is already available
    } else {
        // Otherwise, observe mutations on the document
        const observer = new MutationObserver((_, observerInstance) => {
            if (document.body) {
                callback();  // Call the function once body is available
                observerInstance.disconnect();  // Stop observing
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
}


const asleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
callWhenBodyIsReady(async () => {
    const win = window as typeof window & { __FIRST_SCREEN_DATA?: any };


    await asleep(2000);
    console.log(win.__FIRST_SCREEN_DATA);

    if (!win.__FIRST_SCREEN_DATA) return;

    // This data is embedded in the page itself, so the page is the response
    // (without its #fragment, which a response URL never has).
    reportItems(win.__FIRST_SCREEN_DATA, window.location.href.split('#')[0]);
});

// On a product page, report every variant's price from the page's own data, and
// tell the chart (which can't read page scripts' variables) about the variants.
const PRODUCT_PAGE = /-i\d+(-s\d+)?\.html$/;
callWhenBodyIsReady(async () => {
    if (!PRODUCT_PAGE.test(window.location.pathname)) return;
    const win = window as typeof window & { __moduleData__?: any };
    // The page arrives without variant prices and fills them in shortly after.
    const priced = () => Object.values(win.__moduleData__?.data?.root?.fields?.skuInfos ?? {})
        .some((info: any) => typeof info?.price?.salePrice?.value === "number");
    for (let i = 0; i < 80 && !priced(); i++) await asleep(250);
    const fields = win.__moduleData__?.data?.root?.fields;
    if (!fields) return;

    const page = readProductPage(fields, window.location.href.split(/[?#]/)[0]);
    if (!page) return;
    api.post("/ingest/product-page", page);

    const skus = page.skus.map(({ skuId, name }) => ({ skuId, name }));
    const update = () => publishSkus({ selected: selectedSkuFromUrl(window.location.pathname) ?? page.selectedSkuId, skus });
    update();
    // Choosing a variant changes the URL to ...-s<skuId>.html without loading a page.
    for (const method of ["pushState", "replaceState"] as const) {
        const original = history[method];
        history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
            const result = original.apply(this, args);
            update();
            return result;
        };
    }
    window.addEventListener("popstate", update);
});
