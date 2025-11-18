# Firebase Test Project

A simple Firebase Functions project that returns "hello world".

## Setup

1. Install Firebase CLI globally (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in this directory (if not already initialized):
   ```bash
   firebase init functions
   ```

4. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

## Running Locally

To run the functions emulator locally:
```bash
npm run serve
```

Or from the functions directory:
```bash
cd functions
npm run serve
```

The function will be available at:
- `http://localhost:5001/<project-id>/us-central1/helloWorld`

## Deploying

To deploy the function to Firebase:
```bash
npm run deploy
```

Or:
```bash
firebase deploy --only functions
```

## Function

- **helloWorld**: An HTTP Cloud Function that returns `{ message: 'hello world' }`

# kp-test
