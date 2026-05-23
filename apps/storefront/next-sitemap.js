const excludedPaths = ["/checkout", "/account/*", "/cart"]

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://example.com",
  generateRobotsTxt: true,
  exclude: excludedPaths + ["/[sitemap]"],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: excludedPaths,
      },
    ],
  },
}
