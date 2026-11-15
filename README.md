
# Ranked

A personal media-ranking web application for tracking, rating, and reviewing anime, manga, webtoons, and more.

Ranked allows users to curate their own media collections through a weighted rating system, personalized reviews, custom tags, and an intuitive, responsive interface.

**[Explore the Live App](https://sdrabla.github.io/ranked-list-app/)**

## Features

### Personal Media Collection
- Add, edit, and delete titles.
- Rate media across four individual categories.
- Automatically rank titles based on weighted scores.
- Organize entries with custom tags.
- Write and save personalized reviews.

### Search and Organization
- Search collections by title, tag, or review.
- Filter entries by tag.
- Filter rankings by score.
- View collection size and individual ranking details.

### User Accounts and Cloud Storage
- Email and password authentication through Supabase.
- Account registration, login, and logout.
- Password recovery.
- Cloud-based storage for authenticated users.
- Guest rankings saved for the current browser tab session.

### User Experience
- Redesigned interface with improved visual hierarchy.
- Responsive layouts for desktop and mobile.
- Dedicated dialogs for authentication and ranking management.
- Accessible form labels and organized input fields.
- Collection empty states and error feedback.

## Weighted Rating System

Each title receives an overall score based on four rating categories:

| Category | Weight |
|----------|--------|
| Art Style | 30% |
| Story | 30% |
| Characters | 20% |
| Enjoyment | 20% |

Each category is rated on a scale of 1–10.

The final score is calculated using the following formula:

Overall Score = (Art × 0.3) + (Story × 0.3) + (Characters × 0.2) + (Enjoyment × 0.2)

Titles are automatically ranked according to their overall scores.

## Technologies Used

| Technology | Purpose |
|------------|---------|
| HTML5 | Application structure |
| CSS3 | Styling and responsive design |
| Vanilla JavaScript | Application logic and interactivity |
| Supabase | Backend and authentication |
| PostgreSQL | Cloud database |
| Web Storage APIs | Guest rankings in `sessionStorage`; guest-mode preference in `localStorage` |
| GitHub Pages | Website hosting |

## How to Use

1. Visit the live application.
2. Create an account, log in, or continue as a guest.
3. Select **Add Title** to start building your collection.
4. Enter a title and rate each category from 1–10.
5. Add optional tags and a personal review.
6. Save the title to your ranked collection.
7. Search, filter, edit, and manage your rankings.

## Local Development

Clone the repository:

```bash
git clone https://github.com/Sdrabla/ranked-list-app.git
cd ranked-list-app
```

Open the project in Visual Studio Code:

```bash
code .
```

Run the application using the Live Server extension or another local development server.

To enable cloud functionality, configure a Supabase project with the appropriate database schema, authentication settings, and public client credentials.

Never expose Supabase secret or service-role keys in client-side code.

## Project Background

Ranked was originally developed as a college project to explore front-end web development, JavaScript, and browser-based data persistence.

The project has since evolved into a more comprehensive web application, with a redesigned user experience, improved collection management, user authentication, and cloud-based data storage.

The redesign focuses on:

- Creating a cohesive visual identity.
- Improving usability and information hierarchy.
- Designing intuitive user interactions.
- Integrating backend services with an existing front end.
- Developing a more scalable application architecture.

## Future Improvements

- Automatic media cover art and metadata retrieval.
- Dedicated anime, manga, and webtoon categories.
- Personalized collection statistics.
- Custom rating categories and adjustable weights.
- Shareable public rankings.
- Collection import and export.
- Additional theme customization.

## Author

Developed and designed by Sookie Drabla.

- [Portfolio](https://sdrabla.github.io/)
- [GitHub](https://github.com/Sdrabla)

---

Built with an interest in web development, thoughtful design, and media discovery.
