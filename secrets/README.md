# Secrets Directory

This directory is for storing secrets used in production. 
Files in this directory should never be committed to the repository.

## Required secret files for production:

- `postgres_password.txt` - Password for PostgreSQL database
- `jwt_secret.txt` - Secret for JWT token generation
- `s3_access_key.txt` - AWS S3 access key
- `s3_secret_key.txt` - AWS S3 secret key
- `n8n_api_key.txt` - API key for n8n

## Usage

These files are mounted as Docker secrets in the production environment.
