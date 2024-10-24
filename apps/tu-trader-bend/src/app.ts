/**
* Generated by Tu
* Author: Tonni Diaz
*/

import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import indexRouter from './routes';


/* Routes */
import usersRouter from "./routes/users";
import convertRouter from "./routes/convert";
import authRouter from "./routes/auth";
import botsRouter from "./routes/bots";
import rfRouter from "./routes/rf";
import appRouter from "./routes/app";
import ordersRouter from "./routes/orders";
import booksRouter from "./routes/books";
import tasksRouter from "./routes/tasks";
/* End routes */

import { botJobSpecs, DEV } from '@cmn/utils/constants';
import { timedLog, parseDate } from '@cmn/utils/functions';
import { connectMongo } from '@cmn/utils/funcs4';

const app = express(); 

dotenv.config();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
console.log(`\nPID: ${process.pid}\n`);
app.use(cors());
app.use(
  cors({
    origin: '*',
  })
);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/bots", botsRouter);
app.use("/rf", rfRouter);
app.use("/app", appRouter);
app.use("/orders", ordersRouter);
app.use("/books", booksRouter);
app.use("/convert", convertRouter);
app.use("/tasks", tasksRouter);


(async function(){await connectMongo(DEV)})()
app.get('/tasks/task1', (req, res)=>{
    timedLog("Hello From task 1")
    res.json({time: parseDate(new Date()), msg: "Task 1"})
})
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



const main = async ()=>{
    // Schedule a task that runs every minute
    console.log(botJobSpecs(1));
}

main()
export default app;
 