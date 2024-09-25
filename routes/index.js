var express = require('express');
var router = express.Router();
const {sleep, timedLog} = require('../utils/funcs')
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/sting', async (req, res)=>{
    try {
        const { name, interval } = req.body
        timedLog(`${name} | begin sting...`)
        res.send("Stinging")
        await sleep(interval * 1000)
        timedLog(`${name} | Stung`)

    } catch (error) {
        
    }
})

module.exports = router;
