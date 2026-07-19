Should I Buy This?

## The idea

I built **Should I Buy This?** for OpenAI Build Week, in the Apps for Your Life track.

It is for the very normal moment when you are about to buy something and think: *Do I actually want this, or am I just excited right now?*

You enter the item, price, montly income, how much you want it, and when you last bought something similar. The app gives you one of three answers:

- **Buy it**
- **Wait a week**
- **Skip it**

It also explains the answer in plain language. The goal is not to make people feel bad about spending. It is to help them make a choice they will feel good about later.

## What it does

- Checks that the price and income make sense before giving an answer.
- Gives a useful answer even without an internet connection or API key.
- Optionally uses GPT-5.6 as a second opinion. GPT sees the actual answers and helps choose the verdict; it is not only writing an explanation after the fact.
- Saves decisions in the browser, so users can look back on them later.
- Lets users mark whether they ended up buying the item.
- Adds a revisit date to “Wait a week” decisions. This is the cooling-off tracker: if you still want it a week later, you can reconsider with a clearer head.

## Why I made it this way

There are two ways the app can decide:

1. A simple local calculation looks at the price as a share of monthly income, the user’s desire rating, and how recently they bought something similar.
2. If the user chooses to add an API key, GPT-5.6 looks at the same raw information and makes a more nuanced recommendation.

I kept the local calculation because it means the app always works. It also gives the AI some sensible boundaries. For example, the app will not recommend “Buy it” for something that costs a whole month of take-home income.

The AI option makes the answer feel less like a rigid calculator. The offline option keeps it fast, private, free to try, and reliable if the AI request fails.

## Privacy

Purchase history is saved with `localStorage`, which means it stays in the user’s own browser. There is no account and no database.

The optional API key is only kept in the current browser tab by the app. For a real public version, I would move the OpenAI request to a small server-side endpoint so no API key is ever exposed in the browser.

## Run it

There is no installation needed. Download or clone the project, then open `index.html` in a browser.

The files are:

- `index.html` — the page structure
- `styles.css` — the design and responsive layout
- `app.js` — the decision logic, history, validation, and optional AI call

## What I would add next

The next version could let someone set a savings goal or a monthly “fun money” budget. Then the recommendation could consider what the purchase would mean for a goal they actually care about, not only their income.

