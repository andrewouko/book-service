const fetch = require('node-fetch');
const config = require('./../../config/config');
const xml2js = require('xml2js');

module.exports = class SearchService {

  constructor(configs) {
    this.configs = configs || config;
  }

  search(query) {
    return new Promise((resolve, reject) => {

        fetch(config.goodreads.base_url + config.goodreads.search_resource + query + '&key=bZFY4Rc5TZpBEc89fv7XKA', 
            { 
              method: 'GET', 
              headers: { 'Content-Type': 'application/json' }
            }
        ).then(res => res.text()
        ).then(async xml => { 
          const parser = new xml2js.Parser();
          let json = await parser.parseStringPromise(xml);
          //let json = JSON.parse(parser.toJson(xml));
          return resolve(json.GoodreadsResponse.search)
        }).catch(e => {
          return reject(e)
        });

    });
  }

}