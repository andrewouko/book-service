const BaseController = require('./BaseController');
const SearchService = require('../services/SearchService');
const { check, oneOf, validationResult, query } = require('express-validator');

module.exports = class SearchController extends BaseController {

    /**
     * @param {Express} server
     * @param {SearchService} SearchService 
     */
    constructor(server, searchService) {
        super(server);
        this.SearchService = searchService || new SearchService();
    }


    /**
     * Register Controller
     */
    init() {
        this.server.get('/api/v1/search', this.validate(), (req, res, next) => {
            const errors = validationResult(req)
            if (!errors.isEmpty()) return res.status(400).json(super.sendResponse('CLIENT_REQUEST_ERROR', { errors: errors.array() }));
            this.searchAction(req, res, next)
        });
        this.server.get('/search', function (req, res) {
            var path = require('path');
            res.sendFile(path.join(__dirname , '../view' ,'/search.html'));
        });
    }

    /**
     * Validate the request params
     * @param {string} filter 
     * @param {string} sort 
     * @returns 
     */
    validate() {
        return [
            query('q').optional().notEmpty(),
            check('title').optional().notEmpty(),
            check('author').optional().isString().notEmpty(),
            query('sort').optional().custom((val, { req }) => {
                return ['title', 'author', 'q'].some(key => req.query[key])
            })
        ]
    }

    /**
     * Sort the feteched results according to alphabetical order
     * @param {string} req 
     * @param {array} result 
     * @returns {array} result 
     */
    sortResults(req, result) {
        // create the sorting key & value pairs
        const sort_pairs = req.query.sort.split(',').map(pair => pair.split(':')).map(pair => {
            let sort_obj = {}
            sort_obj[pair[0]] = pair[1]
            return sort_obj
        })
        // console.log(sort_pairs)

        // VALIDATE THE SORT PAIRS
        if (!sort_pairs.length) throw new Error('Invalid sort parameter: unable to create sort key value pairs')
        sort_pairs.forEach(pair => {
            const pair_keys = Object.keys(pair)
            const key = pair_keys[0], value = pair[key]

            // check if the parameter name is valid
            const valid_sort_fields = ['title', 'author']
            if (!valid_sort_fields.includes(key)) throw new Error(`Invalid sort parameter: Invalid sort field '${key}' provided`)

            // check the sort order is valid
            if (!['asc', 'desc'].includes(value.toLowerCase())) throw new Error(`Invalid sort parameter: Invalid sort order '${value}' provided`)
        })


        // SORT THE RESULTS
        sort_pairs.forEach(pair => {
            result[0].results[0].work.sort((item1, item2) => {
                let key = Object.keys(pair)[0]
                let sort_order = pair[key]
                if (key == 'title') {
                    item1 = item1.best_book[0].title[0]
                    item2 = item2.best_book[0].title[0]
                }
                if (key == 'author') {
                    item1 = item1.best_book[0].author[0].name[0]
                    item2 = item2.best_book[0].author[0].name[0]
                }

                console.log(item1, item2)

                // sort alphabetically
                if (sort_order.toLowerCase == 'asc') return item1.localeCompare(item2)

                // sort in desceding alphabetical order
                else return item2.localeCompare(item1)

            })
        })

        return result

    }
    /**
     * 
     * @param {array} result 
     * @param {object} req 
     * @returns {array}
     */
    filterResult(result, req) {
        if (!result[0].results[0].work) return []
        result = [result[0].results[0].work.filter(item => {
            if (req.query.author) {
                return item.best_book[0].author[0].name[0].toLowerCase().includes(req.query.author)
            }
            if (req.query.title) {
                return item.best_book[0].title[0].toLowerCase().includes(req.query.title)
            }
        })]
        return result
    }

    /**
     * @api {get} /api/v1/search Search for books
     * @apiVersion 1.0.0
     * @apiName Search V1
     * @apiGroup Search
     * @ApiDescription V1 Search for books in goodreads API
     * @apiUse Response100
     */
    /**
     * Search Action
     * @param {Object} req 
     * @param {Object} res 
     * @param {function} next 
     */
    async searchAction(req, res, next) {
        try {
            let result = await this.SearchService.search(req.query['q'] || req.query.title || req.query.author || '');

            if (req.query.sort) {
                result  = this.sortResults(req, result)
            }
            if (req.query.author) {
                result = this.filterResult(result, req)
            }

            res.status(200).json(super.sendResponse('SUCCESS', result));
        } catch (e) {
            res.status(500).json(super.sendResponse('BACKEND_ERROR', e.message));
        }
    }
}