# Deployment Guide (VM Installation)

This document provides instructions on how to deploy the Kompaun Dashboard onto a Virtual Machine. Since this is a client-side React application, it needs to be built and served statically.

We have prepared two primary methods for deploying the app: **Docker** and **PM2 with Node.js**.

---

## Method 1: Docker + Nginx (Recommended)
This is the most robust method and ensures the environment is identical regardless of the host OS.

### Prerequisites
- Docker installed on the VM (`sudo apt install docker.io` for Ubuntu).

### Steps
1. Clone the repository onto the VM.
2. Navigate to the `dashboard` folder:
   ```bash
   cd dashboard
   ```
3. Build the Docker image:
   ```bash
   docker build -t kompaun-dashboard .
   ```
4. Run the container, mapping port 80 to port 80 on the VM:
   ```bash
   docker run -d -p 80:80 --name dashboard kompaun-dashboard
   ```
The app will now be accessible via your VM's IP address.

---

## Method 2: PM2 + Node Server
This method is perfect if you already use Node.js on your VM and don't want to deal with Docker. It uses a lightweight Express server to serve the React files.

### Prerequisites
- Node.js (v16+) installed.
- PM2 installed globally (`npm install -g pm2`).

### Steps
1. Clone the repository onto the VM.
2. Navigate to the `dashboard` folder:
   ```bash
   cd dashboard
   ```
3. Install production dependencies and build the app:
   ```bash
   npm install --omit=dev
   npm run build
   ```
4. Start the server using PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```
5. Ensure PM2 restarts on server reboot:
   ```bash
   pm2 save
   pm2 startup
   ```
The app will now be running continuously on `http://localhost:3000` (or whichever port you proxy it to).

---

## Updating the App
When you pull new changes from GitHub, simply repeat the build step for your chosen method:
- **Docker**: Stop the container, rebuild the image, and run it again.
- **PM2**: Run `npm run build` and then `pm2 restart kompaun-dashboard`.
