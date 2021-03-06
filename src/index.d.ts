import Puppeteer from 'puppeteer'

export interface IOptions {
    maxPages?: number;
    maxBrowsers?: number;
    freeResourcesTimer?: number;
    pageTimeout: number,
    dataSave?: IDataSave,
    onStart?: () => Promise<void>;
    onStop?: () => Promise<void>;
    puppeteerOptions?: Puppeteer.LaunchOptions & Puppeteer.BrowserLaunchArgumentOptions & Puppeteer.BrowserConnectOptions & { product?: Puppeteer.Product; extraPrefsFirefox?: Record<string, unknown> };
    pageOptions: Puppeteer.WaitForOptions & { referer?: string; };
    pageHandler: (page: Puppeteer.Page, url: string) => Promise<void>;
}

export interface IData {
    url: string;
    data: string;
    date: Date,
    host?: string,
    pathName?: string,
    search?: string,
    parameters?: any
}

export interface URI {
    url: string,
    // this is only a temp data that will be returned in getData.
    // You may for example add IsRefreshable for the url. 
    parameters: any
}

export interface IDataSave {
    getData: (url: string) => Promise<IData | undefined>;
    saveData: (data: IData) => Promise<void>;
    onFreeResources: (clearAll: boolean) => Promise<void>;
    delete: (url: string) => Promise<void>;
}

export class Browser {
    constructor(options?: IOptions);
    start: () => Promise<void>;
    stop: () => Promise<void>;
    addSync: (url: string | URI, onload: (html: string) => void | Promise<void>) => void;
    addAsync: (url: string | URI) => Promise<string>;
}
export default Browser;
