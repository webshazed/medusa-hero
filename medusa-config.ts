import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import path from "path"
import fs from "fs"

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: {
      connection: { ssl: { rejectUnauthorized: false } },
    },
    workerMode: process.env.WORKER_MODE as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    path: "/",
    backendUrl: process.env.BACKEND_URL || "https://medusa-backend-xw2f.onrender.com",
    logo: "/Logo.png",
  },
  modules: [
    {
      resolve: "./src/modules/category-bundle-config",
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: "auto",
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              additional_data: {
                cache_control: "public, max-age=31536000, immutable",
              },
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: (() => {
              const localPath = path.resolve(__dirname, "src/modules/sumup-payment");
              const buildPath = path.resolve(process.cwd(), ".medusa/server/src/modules/sumup-payment");

              if (process.env.NODE_ENV === "production" && fs.existsSync(buildPath)) {
                return buildPath;
              }

              return localPath;
            })(),
            id: "sumup",
            options: {
              api_key: process.env.SUMUP_API_KEY,
              merchant_code: process.env.SUMUP_MERCHANT_CODE,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@perseidesjs/notification-nodemailer/providers/nodemailer",
            id: "nodemailer",
            options: {
              from: process.env.SMTP_FROM,
              channels: ["email"],
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT) || 587,
              secure: false,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            },
          },
        ],
      },
    },
  ],
})
