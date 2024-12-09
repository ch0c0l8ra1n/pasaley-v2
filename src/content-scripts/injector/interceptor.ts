import API from "@/lib/api";

const api = new API();

// This needs to be set because the extension is injected via a script tag.
// isExtension will return false.
api.setProd(true); 

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
            const data = JSON.parse(responseBody);

            const items = findItems(data);

            const processedItems = processItems(items);

            if (items.length > 0)
                await api.sendListItems(processedItems);

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
            await api.sendListItems(processedItems);
        }
        catch (err){
            console.error(err);
        }
    }
});