# Postman quick tests

Start XAMPP MySQL and `npm run dev` in the backend first.

## 1. Health check
- Method: GET
- URL: `http://localhost:5000/api/health`
- Expected: JSON status `ok`

## 2. Register
- Method: POST
- URL: `http://localhost:5000/api/auth/register`
- Body > raw > JSON:
```json
{ "name": "Chaitanya", "email": "chaitanya@example.com", "password": "Pass1234" }
```

## 3. Log in
- Method: POST
- URL: `http://localhost:5000/api/auth/login`
- Body > raw > JSON:
```json
{ "email": "chaitanya@example.com", "password": "Pass1234" }
```
Copy the `token` from the response.

## 4. Create a post
- Method: POST
- URL: `http://localhost:5000/api/posts`
- Authorization tab > Bearer Token > paste token
- Body > raw > JSON:
```json
{ "content": "Hello! This is my first post on Connect." }
```

## 5. View feed
- Method: GET
- URL: `http://localhost:5000/api/posts`
- Authorization > Bearer Token > paste token

For comments use POST `/api/posts/1/comments` with `{ "content": "Nice post!" }`.
For likes use POST `/api/posts/1/like` with an empty JSON body `{}`.
For users use GET `/api/users`. To follow a user use POST `/api/users/2/follow` with `{}`.
The IDs (1, 2) must exist in your database.
