const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRouter');
const userRouter = require('./routes/userRouter');
const reviewRouter = require('./routes/reviewRouter');

const app = express();

// 1) GLOBAL MIDDLEWARES

//For http security headers
app.use(helmet()); //We need to run the helmet() function, not just point to it

//Development login
if (process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

// Rate limit to limit request from a single IP ADDRESS
const limiter = rateLimit({
    max: 100, // 100 req
    windowMs: 60 * 60 * 1000, //request per/hr
    message: 'Too many request from this IP, Please try again in an hour'
});
app.use('/api', limiter); //Affects routes starting with /api

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

//Prevents parameter pollution
app.use(hpp({
    whitelist: [
        'duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'
    ]
}));

// Serving static files
app.use(express.static(`${__dirname}/public`));

//ROUTE HANDLERS
// Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next();
});

//MOUNTING ROUTERS
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

//This should always be at the end of al the route handler middleware.
app.all('*', (req, res, next) => { //For routes not found on the server
    //Parameters in middleware make express see it as an error
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//Global error handling middleware
app.use(globalErrorHandler);

//EXPORT APP TO SERVER
module.exports = app;
