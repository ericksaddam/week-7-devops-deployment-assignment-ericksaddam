[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=19944751&assignment_repo_type=AssignmentRepo)
# Deployment and DevOps for MERN Applications

This assignment focuses on deploying a full MERN stack application to production, implementing CI/CD pipelines, and setting up monitoring for your application.

## Assignment Overview

You will:
1. Prepare your MERN application for production deployment
2. Deploy the backend to a cloud platform
3. Deploy the frontend to a static hosting service
4. Set up CI/CD pipelines with GitHub Actions
5. Implement monitoring and maintenance strategies

## Getting Started

1. Accept the GitHub Classroom assignment invitation
2. Clone your personal repository that was created by GitHub Classroom
3. Follow the setup instructions in the `Week7-Assignment.md` file
4. Use the provided templates and configuration files as a starting point

## Files Included

- `Week7-Assignment.md`: Detailed assignment instructions
- `.github/workflows/`: GitHub Actions workflow templates
- `deployment/`: Deployment configuration files and scripts
- `.env.example`: Example environment variable templates
- `monitoring/`: Monitoring configuration examples

## Requirements

- A completed MERN stack application from previous weeks
- Accounts on the following services:
  - GitHub
  - MongoDB Atlas
  - Render, Railway, or Heroku (for backend)
  - Vercel, Netlify, or GitHub Pages (for frontend)
- Basic understanding of CI/CD concepts

## Deployment Platforms

### Backend Deployment Options
- **Render**: Easy to use, free tier available
- **Railway**: Developer-friendly, generous free tier
- **Heroku**: Well-established, extensive documentation

### Frontend Deployment Options
- **Vercel**: Optimized for React apps, easy integration
- **Netlify**: Great for static sites, good CI/CD
- **GitHub Pages**: Free, integrated with GitHub

## CI/CD Pipeline

The assignment includes templates for setting up GitHub Actions workflows:
- `frontend-ci.yml`: Tests and builds the React application
- `backend-ci.yml`: Tests the Express.js backend
- `frontend-cd.yml`: Deploys the frontend to your chosen platform
- `backend-cd.yml`: Deploys the backend to your chosen platform

## Deployment Instructions

### Backend Deployment: Render
1. Create a new Web Service on [Render](https://dashboard.render.com/).
2. Connect your GitHub repository and select the `server/` directory as the root.
3. Set the build and start commands:
   - **Build Command:** (leave blank or use `npm install`)
   - **Start Command:** `npm start`
4. Add the following environment variables in the Render dashboard:
   - `MONGODB_URI` (from MongoDB Atlas)
   - `JWT_SECRET`
   - Any other secrets used in your backend
5. Deploy the service. After deployment, note your backend URL.

### Frontend Deployment: Vercel
1. Go to [Vercel](https://vercel.com/) and import your GitHub repository.
2. Set the project root to the `client/` directory.
3. Vercel will auto-detect Vite and set the build/output:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add any required environment variables (e.g., `VITE_BACKEND_URL`) in the Vercel dashboard.
5. Deploy the project. After deployment, note your frontend URL.

### CI/CD with GitHub Actions
- The workflow `.github/workflows/mern-ci-cd.yml` handles:
  - Linting, testing, and building both backend and frontend
  - Deploying backend to Render and frontend to Vercel on push to `main`
  - Health checks for both services after deployment
- Required GitHub secrets (set in your repo settings > Secrets and variables > Actions):
  - For Render:
    - `RENDER_SERVICE_ID` (from Render dashboard)
    - `RENDER_API_KEY` (from Render dashboard)
  - For Vercel:
    - `VERCEL_TOKEN` (from Vercel account)
    - `VERCEL_ORG_ID` (from Vercel project settings)
    - `VERCEL_PROJECT_ID` (from Vercel project settings)
  - For Health Checks:
    - `BACKEND_URL` (your Render backend URL)
    - `FRONTEND_URL` (your Vercel frontend URL)

### Environment Variables
- **Backend (Render):**
  - `MONGODB_URI`
  - `JWT_SECRET`
  - (Any other backend secrets)
- **Frontend (Vercel):**
  - `VITE_BACKEND_URL` (should point to your Render backend URL)
  - (Any other frontend env vars)

### Adding URLs and Screenshots
- **Backend URL:** [Add your Render backend URL here]
- **Frontend URL:** [Add your Vercel frontend URL here]
- **CI/CD Screenshots:**
  - ![CI/CD Screenshot 1](./Screenshot-from-2025-07-14-10-21-11.png)
  - ![CI/CD Screenshot 2](./Screenshot-from-2025-07-14-10-23-13.png)

### Maintenance & Monitoring
- Set up health check endpoints in your backend (e.g., `/api/health`).
- Use Render and Vercel dashboards for monitoring and logs.
- For advanced monitoring, consider integrating Sentry, UptimeRobot, or similar tools.

### Rollback & Updates
- To rollback, redeploy a previous commit from the Render or Vercel dashboard.
- For updates, push changes to `main`—CI/CD will redeploy automatically.

---

## Submission

Your work will be automatically submitted when you push to your GitHub Classroom repository. Make sure to:

1. Complete all deployment tasks
2. Set up CI/CD pipelines with GitHub Actions
3. Deploy both frontend and backend to production
4. Document your deployment process in the README.md
5. Include screenshots of your CI/CD pipeline in action
6. Add URLs to your deployed applications

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/) 