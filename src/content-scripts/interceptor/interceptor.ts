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


var findItems = (data: any | any[],parent="ROOT") : any[] => {
    const items = [];

    for (const key of Object.getOwnPropertyNames(data)){
        // console.log(`Exploring ${parent} -> ${key}`);
        if (!data[key]) continue;

        if (Array.isArray(data[key]) && data[key].length > 0){
            const condition = (item: Object) => item.hasOwnProperty("itemId") && 
                                        (item.hasOwnProperty("price") || item.hasOwnProperty("itemDiscountPrice"));
            
            
            // Check if all items in array contain keys itemId and itemPrice
            if (data[key].some(condition)){
                //console.log("Found some items");
                    if (data[key].filter(condition).length > data[key].filter(item => !condition(item)).length){
                        const valid_items = data[key].filter(condition);
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

let oldXHROpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function() {
    this.addEventListener("load", async function() {
        const responseBody = this.responseText;

        try{
            const url = this.responseURL;
            // test if url contains ajax=true in it
            if (url.includes("ajax=true")){
                console.log(url);
            }

            const data = JSON.parse(responseBody);

            const items = findItems(data);

            const processedItems = processItems(items);

            if (items.length > 0)
                api.sendListItems(processedItems, url);

        }
        catch (err){

        }

    });
    return oldXHROpen.apply(this, arguments as any);
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

    const items = findItems(win.__FIRST_SCREEN_DATA);
    if (items.length > 0){
        try{
            const processedItems = processItems(items);
            // This data is embedded in the page itself, so the page is the response
            // (without its #fragment, which a response URL never has).
            api.sendListItems(processedItems, window.location.href.split('#')[0]);
        }
        catch (err){
            console.error(err);
        }
    }
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
