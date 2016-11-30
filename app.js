const express = require('express');
const mustacheExpress = require('mustache-express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const mongoose = require('mongoose');

const Movie = require('./models/Movie');

const app = express();
app.engine('mst', mustacheExpress());
app.set('view engine', 'mst');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cookieSession({ secret: "qwerty" }));

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/movies');

// Cookie based auth on all requests.
app.use((req, res, next) => {
    if (req.cookies['allowed'] && req.cookies['allowed'] === 'yes') {
        next();
    } else {
        res.sendStatus(404);
    }
});

app.get('/', (req, res) => {
    const ctx = { 'title': 'Home' };
    ctx.formSuccessMsg = req.session.formSuccessMsg;
    req.session = null;
    Movie.find({}, (err, movies) => {
        ctx.movies = movies;
        res.render('list', ctx);
    });
});

app.get('/view/:movieId', (req, res) => {
    Movie.findById(req.params['movieId'], (err, movie) => {
        if (err) {
            res.sendStatus(404);
        } else {
            const ctx = {
                title: movie.title,
                movie: movie
            };
            res.render('view', ctx);
        }
    });
});

app.route('/new')
    .get((req, res) => {
        const ctx = createContextForFormGet(req, req.session.movie || null, 'Create Movie',
            'Create Movie', 'Your Movie was created successfully!');
        req.session = null;
        res.render('new', ctx);
    })
    .post((req, res) => {
        const newMovie = new Movie({
            title: req.body['title'],
            yearReleased: req.body['yearReleased']
        });

        saveMovieThenRedirect(req, res, newMovie);
    });

app.route('/edit/:movieId')
    .get((req, res) => {
        Movie.findById(req.params['movieId'], (err, movie) => {
            if (err) {
                res.sendStatus(404);
            } else {
                const ctx = createContextForFormGet(req, req.session.movie || movie, 'Edit Movie',
                    'Edit Movie', 'Your Movie was edited successfully!');
                req.session = null;
                res.render('edit', ctx);
            }
        });
    })
    .post((req, res) => {
        Movie.findById(req.params['movieId'])
            .then(originalMovie => {
                originalMovie.title = req.body['title'];
                originalMovie.yearReleased = req.body['yearReleased'];

                saveMovieThenRedirect(req, res, originalMovie);
            }, err => {
                res.sendStatus(404);
            });
    });

// HTML forms only support GET and POST, so re-write request method to DELETE.
app.post('/delete/:movieId', (req, res, next) => {
    req.method = 'DELETE';
    next();
});

app.route('/delete/:movieId')
    .get((req, res) => {
        Movie.findById(req.params['movieId'], (err, movie) => {
            if (err) {
                res.sendStatus(404);
            } else {
                const ctx = createContextForFormGet(req, movie, 'Delete Movie',
                    '', 'Your Movie was deleted successfully!');
                req.session = null;
                res.render('delete', ctx);
            }
        });
    })
    .delete((req, res) => {
        Movie.findById(req.params['movieId'])
            .then(movie => {
                movie.remove((err, movie) => {
                    if (err) {
                        res.sendStatus(500);
                    } else {
                        req.session.formSuccessMsg = 'Movie deletion successful!';
                        res.redirect('/');
                    }
                });
            }, err => {
                res.sendStatus(404);
            });
    });

function createContextForFormGet(req, movie, title, submitBtnText, formSuccessMsg) {
    const ctx = {
        title: title,
        movie: movie,
        submitBtnText: submitBtnText
    };

    if (req.session.afterRedirect) {
        if (req.session.formSuccessful) {
            ctx.formSuccessMsg = formSuccessMsg;
        } else if (req.session.validationErrors) {
            ctx.validationErrors = req.session.validationErrors;
        }
    }

    return ctx;
}

function saveMovieThenRedirect(req, res, originalMovie) {
    originalMovie.save((err, updatedMovie) => {
        if (err) {
            req.session.movie = originalMovie;
            req.session.validationErrors = Object.keys(err.errors).map(k => err.errors[k]);
        } else {
            req.session.movie = updatedMovie;
            req.session.formSuccessful = true;
        }
        req.session.afterRedirect = true;
        res.redirect(req.originalUrl);
    });
}

app.listen(process.env.PORT || 3000, () => {
    console.log('Listening...');
});