import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import path from "path"
import fs from "fs"

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
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
    path: "/",
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
  modules: [
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
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: (() => {
              const debug = (msg: string) => console.log(`[DEBUG] ${msg}`);
              debug(`NODE_ENV: ${process.env.NODE_ENV}`);
              debug(`CWD: ${process.cwd()}`);
              debug(`__dirname: ${__dirname}`);

              // Check potential paths
              const localPath = path.resolve(__dirname, "src/modules/sumup-payment");
              const buildPath = path.resolve(process.cwd(), ".medusa/server/src/modules/sumup-payment");

              debug(`Checking localPath: ${localPath} (Exists: ${fs.existsSync(localPath)})`);
              debug(`Checking buildPath: ${buildPath} (Exists: ${fs.existsSync(buildPath)})`);

              if (process.env.NODE_ENV === "production") {
                if (fs.existsSync(buildPath)) {
                  debug(`Using buildPath`);
                  return buildPath;
                }
                if (fs.existsSync(localPath)) {
                  debug(`Using localPath (fallback)`);
                  return localPath;
                }
              }

              // Default to local for dev or fallback
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
  ],
})