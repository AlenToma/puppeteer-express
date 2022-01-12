import nbrowser from 'puppeteer'
import uri from 'url';

export class Browser {
  constructor(options) {
    this.assignValue = (option, item) => {
      Object.keys(option).forEach(x => {
        item[x] = option[x]
      });

      return item;
    }
    this.browsers = [];
    this.maxPages = 10;
    this.maxBrowsers = 2;
    this.totalPages = 0;
    this.timer = undefined;
    this.working = false;
    this.selectingBrowser = false;
    this.started = false;
    this.processing = new Map();
    this.pageTimeout = 8000;
    this.data = new Map();
    this.que = new Map();
    this.queEvents = undefined;
    this.dataSave = undefined;
    this.freeResourcesTimer = 90000;
    this.puppeteerOptions = undefined;
    this.pageOptions = undefined;
    this.pageHandler = undefined;
    this.tempData = new Map();
    if (options)
        this.assignValue(options, this);
  }

  __dataLoaded(url, data) {
    var event = this.que.get(url);
    if (data && data.data != undefined && event && event !== null && Array.isArray(event)) {
      event.forEach(x => x(data.data));
    }
    this.que.delete(url);
    return data.data;
  }

  wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve.bind(this), ms);
    });
  }

  async startTimer() {
    if (this.working)
      return;
    this.working = true;
    const maxLoop = this.maxPages * this.maxBrowsers;
    var tLoop = 0;
    var ques = new Map();
    const getValue = () => {
      var queries = this.que.keys();
      while (true) {
        var k = queries.next().value;
        if (k === undefined || !ques.has(k))
          return k;
      }
    }
    while (this.working) {
      const size = this.que.size;
      tLoop += Math.min(maxLoop, size) - tLoop;

      if (size > 0 && tLoop > 0) {
        for (var i = 0; i < tLoop; i++) {
          let url = getValue();
          if (url) {
            ques.set(url, true);
            this.getPageContent(url).then(x => {
              tLoop--;
              ques.delete(url);
            }).catch(x => {
              ques.delete(url);
              tLoop--;
            });
          }
        }
      }
      while (tLoop >= maxLoop) {
        await this.wait(100)
      }
      await this.wait(10);
    }
  }

  addSync(url, onload) {
    this.__add(url, onload);
  }

  async addAsync(url) {
    return await this.__add(url);
  }

  async __add(url, onload, __rec) {
    this.startTimer();
    const data = await this.getData(url);
    if (data != undefined && data.data != undefined) {
      var d = this.__dataLoaded(url, data);
      return d;
    }
    if (__rec !== true) {
      if (this.que.has(url) !== true) {
        this.que.set(url, onload ? [onload] : []);
      } else if (onload) {
        this.que.get(url).push(onload)
      }
    }
    await this.wait(30);
    return await this.__add(url, onload, true);
  }

  async freeResources(clearAll) {
    try {
      if (!this.started)
        return;
      if (this.dataSave)
        this.dataSave.onFreeResources();
      this.browsers.forEach(browser => {
        if (!browser.isConnected() || clearAll == true) {
          browser.closed = true;
          browser.close();
        }
      });


      this.browsers = this.browsers.filter(x => x.closed != true).sort((a, b) => {
        a.totalPages - b.totalPages;
      });
      if (this.browsers === undefined)
        this.browsers = [];


    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async newBrowser() {

    var options = {
      headless: true,
      args: ["--disable-setuid-sandbox",
        "--disable-extensions"],
      ignoreHTTPSErrors: true,
      devtools: false
    };

    if (this.puppeteerOptions)
        options = this.assignValue(this.puppeteerOptions, options);

    var item = await nbrowser.launch(options);
    this.browsers.push(item);
    item.process().setMaxListeners(this.maxPages);
    item.totalPages = 0;
    return item;
  }

  async checkBrowser() {
    try {
      const brs = this.browsers.filter(x => x.isConnected());
      for (var x of brs) {
        if (x.totalPages < this.maxPages) {
          return x;
        }
      }

      if (brs.length >= this.maxBrowsers) {
        await this.wait(100);
        return await this.checkBrowser();
      } else {
        return await this.newBrowser();
      }

    } catch (e) {
      console.log(e);
    }
  }

  async stop(internal) {
    clearInterval(this.timer);
    await this.freeResources();
    this.que.clear();
    this.started = false;
    this.working = false;
    if (this.onClose && !internal)
      await this.onClose();
  }

  async start() {
    await this.stop(true); // clear
    this.timer = setInterval(this.freeResources.bind(this), this.freeResourcesTimer);
    await this.newBrowser();
    this.started = true;
    if (this.onStart)
      await this.onStart();
    console.log("started")
  }

  async saveData(url, content) {
    const uurl = new uri.URL(url);
    if (content !== "") {
      if (this.dataSave)
        this.dataSave.saveData({
          data: content, date: new Date(), url: url, host: uurl.host, pathName: uurl.pathname, search: uurl.search
        });
      else
        this.data.set(url, {
          data: content, date: new Date(), url: url, host: uurl.host, pathName: uurl.pathname, search: uurl.search
        });

    } else this.tempData.set(url, {
      data: content, date: new Date(), url: url, host: uurl.host, pathName: uurl.pathname, search: uurl.search
    });
  }

  async getData(url) {

    if (this.tempData.has(url))
      return this.tempData.get(url);

    const dt = this.dataSave ? await this.dataSave.getData(url) : this.data.get(url);
    return dt && dt.data ? dt : undefined;
  }

  async deleteData(url) {
    console.log("delete data for", url);
    if (this.data.has(url))
      this.data.delete(url);
    if (this.dataSave)
      this.dataSave.delete(url);
  }

  async getPageContent(url) {
    if (!url)
      return "";
    while (this.started === false || this.processing.has(url) || this.selectingBrowser)
      await this.wait(100);
    this.processing.set(url, true);
    let page = undefined;
    let browser = undefined;
    let pageTimeout = false;
    let cachedData = undefined;
    try {
      if ((cachedData = await this.getData(url)) !== undefined) {
        return cachedData.data;
      }
      while (this.selectingBrowser) {
        await this.wait(100);
      }
      this.selectingBrowser = true;
      browser = await this.checkBrowser();


      if ((cachedData = await this.getData(url)) !== undefined) {
        return cachedData.data;
      }

      browser.totalPages++;
      this.totalPages++;
      this.selectingBrowser = false;
      var options = {
        referer: url,
        timeout: this.pageTimeout
      }
      if (this.pageOptions)
         this.assignValue(this.pageOptions, options);
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
      await page.setJavaScriptEnabled(true);
      page.lastCall = new Date();

      var response = await page.goto(url, options);
      if (response.status() !== 200) {
        await this.saveData(url, "");
        throw "Https failed to get data. response status:" + response.status();
      }
      if (this.pageHandler)
        await this.pageHandler(page, url);

      const content = await page.content();
      this.saveData(url, content);
      return content;
    } catch (e) {
      console.log("puppeteer Error", e);
      if (e != undefined && (e.toString().indexOf("Https failed to get data") === -1 && (e.toString().indexOf("Navigation failed because browser has disconnected") === -1 || pageTimeout === true))) {
        console.log("URL:", url);
        await this.saveData(url, "");
      }
      return "";
    } finally {
      if (page != undefined) {
        if (!pageTimeout)
          await page.close();
        browser.totalPages--;
        this.totalPages--;
      }
      this.processing.delete(url);
    }
  }
}

export default Browser;