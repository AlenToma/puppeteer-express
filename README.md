# puppeteer-express
puppeteer-express is library created to crawl html from websites.
Depending on the settings you will be able to ajust the library to how much CPU and memory you have on the server.
The library can handle infinit calls, it will create a que and execute those.
The library is also able to cache and refresh those those calls depending on the settings.

# Getting started
```sh
npm install puppeteer-express
```
# Basic
```js
import Browser from 'puppeteer-express'
// this will generate 2*10 calls at the sametimes
const browser = new Browser({ maxPages:10, maxBrowsers: 10}); 

var html = await browser.addAsync("https://www.xxx.com");
// OR
browser.addSync("https://www.xxx.com", (html) => console.log(html));
```

# Advanced setting + Caching
```js
class DataSave {
    constructor() {
        this.data = new Map();
    }

    async saveData(data) {
        this.data.set(data.url, data);
    }

    async delete(url) {
        this.data.delete(url);
    }

    async onFreeResources(clearAll) {
        // Free your resources here
    }

    async getData(url) {
        return this.data.get(url)
    }
}


import Browser from 'puppeteer-express'
import { PendingXHR } from 'pending-xhr-puppeteer'
const browser = new Browser(
    {
        dataSave: new DataSave(),
        puppeteerOptions: { headless: false },
        maxPages = 10,
        maxBrowsers = 2,
        pageTimeout: 8000,
        pageOptions: { waitUntil: 'networkidle2' },
        pageHandler: async (page, url) => {
            const u = URL.parse(url, true);
            var cssSelector = u.query["cssSelector"];
            var ajaxWait = u.query["ajax"];

            if (cssSelector && cssSelector.length > 1) {
                console.log("selector Found", cssSelector)
                // await for css class
                await page.waitForSelector(cssSelector);
            }

            if (ajaxWait && ajaxWait.length > 0) {
                // wait for all ajax calls
                // note you need to install pending-xhr-puppeteer for this to work
                const pendingXHR = new PendingXHR(page);
                await pendingXHR.waitForAllXhrFinished();
            }

        }
    });

var html = await browser.addAsync("https://www.xxx.com");
// OR
browser.addSync("https://www.xxx.com", (html) => console.log(html));
```
