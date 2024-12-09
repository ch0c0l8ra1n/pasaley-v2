import { getHostCountry, isProd } from "@/lib/utils";

class API{
    DEV_BASE_URL = 'https://127.0.0.1/api/v2';
    PROD_BASE_URL = 'https://www.shakenep.com/api/v2';


    BASE_URL = isProd() ? 'https://shakenep.com/api/v2' : 'https://127.0.0.1/api/v2';

    getBaseUrl(){
        return this.BASE_URL;
    }

    setBaseUrl(url: string){
        this.BASE_URL = url;
    }

    setProd(enabled: boolean){
        this.BASE_URL = enabled ? this.PROD_BASE_URL : this.DEV_BASE_URL;
    }

    async fetchJSON(input: string| Request| URL, initOptions: RequestInit  = {}){
        let resp;

        try{
            resp = await fetch(input,{
                credentials: 'include',
                ...initOptions
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
        const params: Record<string, string> = {
            id,
            hostCountry
        }
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const resp = await this.fetchJSON(url);

        if (resp.prices) return resp.prices; // for backwards compatibility will change soon

        return resp?.data?.prices;
    }

    async sendListItems(items: any[]){
        console.log("Sending Items!");
        const hostCountry = getHostCountry();
        for (const item of items){
            item.hostCountry = hostCountry;
        }

        const url = new URL(`${this.BASE_URL}/listitemsapi`);
        try{
            await this.fetchJSON(url,{
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    listItems: items,
                    href: window.location.href
                }),
                credentials: "include"
            });
        } catch(err){
            console.error(err);
        }
    }

}

export default API;