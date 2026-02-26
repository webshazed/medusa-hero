require('dotenv').config({ path: './.env' });

module.exports = {
    apps: [
        {
            name: "weareturncoat-backend",
            cwd: "/home/virtual/vps-4fa5b2/1/155c2c5c38/public_html/api",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
                // Force Next.js to use the current directory as root
                NEXT_PRIVATE_STANDALONE: "true",
            }
        }
    ]
}
