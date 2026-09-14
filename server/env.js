class ConfigurationError extends Error {
  constructor(name) {
    super(`Missing required environment variable: ${name}`);
    this.name = 'ConfigurationError';
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new ConfigurationError(name);
  return value;
}

function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || 'https://relustt.site').replace(/\/$/, '');
}

module.exports = { ConfigurationError, required, siteUrl };
