# harrypotterquiz

A Harry Potter quiz you play in the browser. All the questions come from the seven **books**, not the films.

## Features

- **Four difficulty levels:** Easy, Medium, Hard and Extreme (Hard gives you 30 seconds per question and Extreme gives you 15).
- **Spoiler protection:** pick the last book you've read and you'll only get questions answered in the books up to that point.
- 10 random questions per round, with the answer order shuffled each time. The quiz remembers which questions you have already seen and gives you new ones first.
- After each answer you see a short explanation, and at the end you get a list of the questions you missed.
- Your best score for each difficulty is saved in the browser.
- Works on phones, and you can answer with the keyboard (keys `1`–`4`).

## Publishing on GitHub Pages

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
3. Choose your branch (e.g. `main`) and the `/ (root)` folder, then click **Save**.
4. After a minute or so the site will be live at `https://<your-username>.github.io/harrypotterquiz/`.

The version number shown at the bottom of the page is in the `<footer>` of `index.html`. Change it there when you release an update.

There's no build step: the site is just `index.html`, `style.css`, `app.js` and `questions.js`.

To try it on your own computer, open `index.html` in a browser.

## Adding questions

Questions are in `questions.js`, grouped by difficulty:

```js
{ q: "Question text?", a: "Correct answer", w: ["Wrong 1", "Wrong 2", "Wrong 3"], book: 3, explain: "Shown after answering." }
```

`book` is the book (1–7) where the answer is revealed. The spoiler filter uses it.

## Disclaimer

This is an unofficial, non-commercial fan project. It isn't affiliated with J.K. Rowling, Bloomsbury, Scholastic or Warner Bros. The questions are written in our own words and don't reproduce text from the books.
