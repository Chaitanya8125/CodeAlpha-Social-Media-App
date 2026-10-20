# CodeAlpha Task 2 — Social Media Platform (Express + React + MySQL)

## Requirements
- Node.js LTS installed
- XAMPP with MySQL running
- VS Code
- Postman (optional, for API testing)

## 1. Create the database
1. Start **MySQL** in XAMPP. Apache is only needed if you want to open phpMyAdmin.
2. Open http://localhost/phpmyadmin
3. Click **SQL**, paste the contents of `database/schema.sql`, and click **Go**.

The SQL creates the `codealpha_social` database and tables.

## 2. Configure and run the backend
Open a terminal in VS Code, change directory to `backend`, then run:
```bash
npm install
```
Copy `.env.example` to `.env` and check the database settings. The default XAMPP setup often uses user `root` with an empty password. If you set a MySQL password, update `DB_PASSWORD`.

Then run:
```bash
npm run dev
```
Expected message: `API running at http://localhost:5000`
Keep this terminal running.

## 3. Run the frontend
Open a **second** VS Code terminal, change directory to `frontend`, then run:
```bash
npm install
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## 4. Try the app
Register two accounts in separate browser sessions if you want to test following. Log in, create posts, like posts, comment, and follow users.

## 5. Test the backend in Postman
- GET `http://localhost:5000/api/health`
- POST `http://localhost:5000/api/auth/register`
  Body > raw > JSON:
  `{ "name": "Chaitanya", "email": "chaitanya@example.com", "password": "Pass1234" }`
- POST `http://localhost:5000/api/auth/login`
  Body > raw > JSON:
  `{ "email": "chaitanya@example.com", "password": "Pass1234" }`

Login returns a token. For protected routes, choose Authorization > Bearer Token and paste the token. See `POSTMAN_TESTS.md`.

## Notes
- This is a learning starter project, not production-ready.
- Use a unique password for this demo. Do not commit `.env` or share real passwords.
- If the database connection fails, confirm XAMPP MySQL is green/running and the database credentials in `.env` are correct.
