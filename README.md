# AppKit Playwright Insights

A Next.js application to display Playwright test flakiness data from S3.

## Prerequisites

- Node.js (v18 or later recommended)
- pnpm

## Environment Variables

Create a `.env.local` file in the root of the project with the following variables:

```
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET=your-s3-bucket-name
S3_PREFIX=your-s3-prefix # e.g., "reports/playwright" (no leading/trailing slashes)
```

## Running Locally

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Run the development server:**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Linting and Formatting

- To lint the code:
  ```bash
  pnpm lint
  ```
- To format the code:
  ```bash
  pnpm format
  ```

## Deployment

This project is ready for deployment on platforms like Vercel, Netlify, or any other Node.js hosting provider that supports Next.js.

1. **Connect your Git repository to your chosen deployment platform.**
2. **Configure Environment Variables on the platform:**
   - Add the same variables as defined in `.env.local`:
     - `AWS_REGION`
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `S3_BUCKET`
     - `S3_PREFIX`
3. **Deploy.** The platform will typically build and deploy your Next.js application automatically upon commits to your main branch.
