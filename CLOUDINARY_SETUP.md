# Cloudinary Setup for Image Storage

## Why Cloudinary?
Heroku has an ephemeral filesystem - uploaded files get deleted when the app restarts. Cloudinary provides persistent cloud storage for images.

## Setup Steps

### 1. Create Free Cloudinary Account
1. Go to https://cloudinary.com/users/register/free
2. Sign up with your email
3. Verify your email and log in

### 2. Get Your Credentials
After logging in to Cloudinary:
1. Go to your **Dashboard**
2. Copy these 3 values from the "Account Details" section:
   - **Cloud Name** (e.g., `dxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Set Heroku Environment Variables
Run these commands with your actual Cloudinary credentials:

```bash
heroku config:set CLOUDINARY_CLOUD_NAME="your-cloud-name" --app price-tracker-mern-app
heroku config:set CLOUDINARY_API_KEY="your-api-key" --app price-tracker-mern-app  
heroku config:set CLOUDINARY_API_SECRET="your-api-secret" --app price-tracker-mern-app
```

### 4. Restart Your Heroku App
```bash
heroku restart --app price-tracker-mern-app
```

## Features
- **Automatic image optimization** (500x500 max, quality auto)
- **Multiple formats supported** (JPG, PNG, GIF, WebP)
- **Organized folders** (images in `price-tracker/images/`, logos in `price-tracker/logos/`)
- **Free tier**: 25 GB storage, 25 GB bandwidth per month
- **Fallback**: App works without Cloudinary (local storage for development)

## After Setup
Once configured, all new image uploads will be stored on Cloudinary and will persist across Heroku deployments!
