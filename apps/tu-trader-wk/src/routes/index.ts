import { DEV } from '@cmn/utils/constants';
import { binanceInstrus, bitgetInstrus, bybitInstrus, kucoinInstrus, mexcInstrus, okxInstrus } from '@cmn/utils/data/instrus';
import { fetchAllInstrus } from '@cmn/utils/fetch-instrus';
import { clearTerminal } from '@cmn/utils/functions';
import express from 'express';

const router = express.Router();

router.get('/', async function (req, res, next) {
  try {
    res.render("index", {title: "Tu Express app "})
  } catch (e) {
    console.log(e);
    res.status(500).render("error")
  }
});

router.get('/clear-terminal', (req, res)=>{
    clearTerminal()
    res.send("Terminal cleared")
})
router.get('/fetch-instrus', async (req, res)=>{
    if (!DEV)
    await fetchAllInstrus()
    res.json({binanceInstrus: binanceInstrus.length, bitgetInstrus: bitgetInstrus.length, bybitInstrus: bybitInstrus.length, kucoinInstrus: kucoinInstrus.length, mexcInstrus: mexcInstrus.length, okxInstrus: okxInstrus.length})
})
export default router;