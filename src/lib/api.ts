import { getHostCountry, isProd } from "@/lib/utils";

class API{
    static BASE_URL = isProd() ? 'https://shakenep.com/api/v2' : 'https://127.0.0.1/api/v2';
    // static BASE_URL = 'https://www.shakenep.com/api/v2'
    // static BASE_URL = 'https://127.0.0.1';

    static getBaseUrl(){
        return API.BASE_URL;
    }

    /**
     * 
     * @param {string | Request | URL} input
     * @param {RequestInit} initOptions
     * @returns {Promise<any>}
     * @throws {Error}
     *
     * @async
    **/
    static async fetchJSON(input: string| Request| URL, initOptions: RequestInit  = {}){
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

    static async getPriceHistory(id: string, hostCountry: string): Promise<{price:number,time:string}[]>{
        const url = new URL(`${API.BASE_URL}/pricehistory`);
        const params: Record<string, string> = {
            id,
            hostCountry
        }
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const resp = await API.fetchJSON(url);
        return resp?.data?.prices;
    }

    static async sendListItems(items: any[]){
        console.log("Sending Items!");
        const hostCountry = getHostCountry();
        for (const item of items){
            item.hostCountry = hostCountry;
        }

        const url = new URL(`${API.BASE_URL}/listitemsapi`);
        try{
            await API.fetchJSON(url,{
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