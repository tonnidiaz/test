/**
* Generated by Tu
* Author: Tonni Diaz
*/
import express from 'express';

const router = express.Router();

router.get('/', async function (req, res, next) {
  try {
    res.json({hello: 'World from Tu!!'})
  } catch (e) {
    console.log(e);
    res.status(500).json({ msg: 'Something went wrong!' });
  }
});

export default router;

