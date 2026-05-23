const c = require("ansi-colors");

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    // TODO: we need a good doc to point this to
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
];

function checkEnvVariables() {
  // Skip the gate during CI lint/typecheck/build steps and during Storybook
  // — those flows don't need real publishable keys. CI sets CI=true; the
  // gate still fires for `pnpm dev` / `pnpm start` locally and in
  // production runtime.
  if (process.env.CI === "true" || process.env.SKIP_ENV_VALIDATION === "true") {
    return;
  }

  const missingEnvs = requiredEnvs.filter(function (env) {
    c;
    return !process.env[env.key];
  });

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    );

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`));
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`));
      }
    });

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    );

    process.exit(1);
  }
}

module.exports = checkEnvVariables;
