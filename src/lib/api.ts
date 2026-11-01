import { getHostCountry } from "@/lib/utils";
import { version } from "../../public/manifest.json";

// What the page script hands to the signer content script (src/content-scripts/signer).
export interface SignedPost {
    type: "pasaley:post";
    path: "/ingest/products" | "/ingest/clicks";
    body: object;
}

class API{
    // Set at build time from the .env file for the build (see README).
    BASE_URL = import.meta.env.VITE_API_URL;

    getBaseUrl(){
        return this.BASE_URL;
    }

    setBaseUrl(url: string){
        this.BASE_URL = url;
    }

    async fetchJSON(input: string| Request| URL, initOptions: RequestInit  = {}){
        let resp;

        try{
            resp = await fetch(input,{
                credentials: 'omit',
                ...initOptions,
                headers: {
                    "X-Pasaley-Version": version,
                    ...initOptions.headers
                }
            });
        }
        catch (err){
            throw new Error(`Failed to fetch.`);
        }

        if (!resp.ok){
            throw new Error(`HTTP error! status: ${resp.status}`);
        }

        return await resp.json();
    }

    async getPriceHistory(id: string, hostCountry: string): Promise<{price:number,time:string}[]>{
        const url = new URL(`${this.BASE_URL}/pricehistory`);
        url.searchParams.append('id', id);
        url.searchParams.append('hostCountry', hostCountry);

        const resp = await this.fetchJSON(url);
        return resp?.data?.prices;
    }

    // Ingest requests are signed with this install's key, which the page
    // script can't reach: it runs in the page, so it posts them to the signer
    // content script, which signs and sends them.
    post(path: SignedPost["path"], body: object){
        const message: SignedPost = { type: "pasaley:post", path, body };
        window.postMessage(message, window.location.origin);
    }

    // responseURL: the URL of the response the items were found in.
    sendListItems(items: any[], responseURL: string){
        const hostCountry = getHostCountry();
        for (const item of items){
            item.hostCountry = hostCountry;
        }
        this.post("/ingest/products", { href: window.location.href, responseUrl: responseURL, items });
    }

    ingestClick(click: { type: "addtocart" | "buynow"; id: string; hostCountry: string; quantity: number }){
        this.post("/ingest/clicks", click);
    }

}

export default API;
