import Puppeteer from 'puppeteer'

export interface IOptions {
    maxPages?: number;
    maxBrowsers?: number;
    refreshData?: number;
    freeResourcesTimer?: number;
    pageTimeout: number,
    dataSave?: IDataSave,
    onStart?: () => Promise<void>;
    onStop?: () => Promise<void>;
    puppeteerOptions?: Puppeteer.LaunchOptions & Puppeteer.BrowserLaunchArgumentOptions & Puppeteer.BrowserConnectOptions & { product?: Puppeteer.Product; extraPrefsFirefox?: Record<string, unknown> };
    pageOptions: Puppeteer.WaitForOptions & { referer?: string; };
    pageHandler: (page: Puppeteer.Page, url: string) => Promise<void>;
}


export interface IDate {
    url: string;
    data: string;
    date: Date,
    host: string,
    pathName: string,
    search: string
}

export interface IDataSave {
    getData: (url: string) => Promise<IDate | undefined>;
    saveData: (data: IDate) => Promise<void>;
    onFreeResources: (clearAll: boolean) => Promise<void>;
    delete: (url: string) => Promise<void>;
}

export class Browser {
    constructor(options?: IOptions);
    start: () => Promise<void>;
    stop: () => Promise<void>;
    addSync: (url: string, onload: (html: string) => void | Promise<void>) => void;
    addAsync: (url: string) => Promise<string>;
}
export default Browser;
