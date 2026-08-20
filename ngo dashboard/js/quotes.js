/* ============================================================
   js/quotes.js — Motivational Quotes Engine
   ============================================================ */

const QUOTES = [
  { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
  { text: "No act of kindness, no matter how small, is ever wasted.", author: "Aesop" },
  { text: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill" },
  { text: "The meaning of life is to find your gift. The purpose of life is to give it away.", author: "Pablo Picasso" },
  { text: "Service to others is the rent you pay for your room here on earth.", author: "Muhammad Ali" },
  { text: "Volunteers don't get paid, not because they're worthless, but because they're priceless.", author: "Sherry Anderson" },
  { text: "One person can make a difference, and everyone should try.", author: "John F. Kennedy" },
  { text: "The smallest act of kindness is worth more than the grandest intention.", author: "Oscar Wilde" },
  { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
  { text: "The purpose of human life is to serve, and to show compassion and the will to help others.", author: "Albert Schweitzer" },
  { text: "Too often we underestimate the power of a touch, a smile, a kind word, a listening ear.", author: "Leo Buscaglia" },
  { text: "Real generosity toward the future lies in giving all to the present.", author: "Albert Camus" },
  { text: "What you do makes a difference, and you have to decide what kind of difference you want to make.", author: "Jane Goodall" },
];

const Quotes = {
  _last: -1,

  getRandom() {
    let idx;
    do { idx = Math.floor(Math.random() * QUOTES.length); }
    while (idx === this._last && QUOTES.length > 1);
    this._last = idx;
    return QUOTES[idx];
  },

  render(textId, authorId) {
    const q = this.getRandom();
    const te = document.getElementById(textId);
    const ae = document.getElementById(authorId);
    if (te) te.textContent = `"${q.text}"`;
    if (ae) ae.textContent = `— ${q.author}`;
  },
};
