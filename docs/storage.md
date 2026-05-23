# Storage

The backend uses **`@medusajs/file-s3`** with any S3-compatible
provider. Six environment variables select the backend; nothing else
in the codebase changes when you swap providers.

## Variables

| Variable        | Notes                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| `S3_ENDPOINT`   | https URL of the API endpoint (regional)                               |
| `S3_FILE_URL`   | https URL prefix the storefront fetches images from (CDN or bucket)    |
| `S3_REGION`     | provider-specific (`us-east-1`, `auto`, …)                             |
| `S3_BUCKET`     | bucket name                                                            |
| `S3_ACCESS_KEY` | access key id                                                          |
| `S3_SECRET_KEY` | secret access key                                                      |

`STOREFRONT_IMAGE_HOSTS` (storefront env) must include the hostname of
`S3_FILE_URL` or `next/image` will refuse to load it.

## Provider recipes

### MinIO (default for local dev)

The bundled `docker-compose.yml` runs MinIO on `localhost:9100`.

```env
S3_ENDPOINT=http://localhost:9100
S3_FILE_URL=http://localhost:9100/medusa
S3_REGION=us-east-1
S3_BUCKET=medusa
S3_ACCESS_KEY=medusa
S3_SECRET_KEY=medusa_dev_password
```

### AWS S3

```env
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_FILE_URL=https://my-bucket.s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=my-bucket
```

CDN: front the bucket with CloudFront and point `S3_FILE_URL` at the
distribution domain.

### Cloudflare R2

```env
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_FILE_URL=https://images.example.com   # custom domain bound to the bucket
S3_REGION=auto
S3_BUCKET=retail-assets
```

R2 has no egress fees and is a strong default if you don't already have
an AWS footprint.

### Backblaze B2

```env
S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
S3_FILE_URL=https://f002.backblazeb2.com/file/retail-assets
S3_REGION=us-west-002
S3_BUCKET=retail-assets
```

### OCI Object Storage

```env
S3_ENDPOINT=https://<namespace>.compat.objectstorage.<region>.oraclecloud.com
S3_FILE_URL=https://<namespace>.objectstorage.<region>.oraclecloud.com/n/<namespace>/b/retail-assets/o
S3_REGION=<region>            # e.g. ap-sydney-1
S3_BUCKET=retail-assets
```

OCI's compat endpoint requires a Customer Secret Key (not a normal API
key) — generate from User Settings → Customer Secret Keys.

## CDN guidance

Putting any S3-compatible bucket behind a CDN is strongly recommended
for non-trivial traffic. The storefront generates many `next/image`
requests per page; serving them directly from the bucket is wasteful.

When you put a CDN in front:

1. Set `S3_FILE_URL` to the **CDN** hostname
2. Add the CDN hostname to `STOREFRONT_IMAGE_HOSTS`
3. Configure the CDN to forward `Accept-Encoding` and respect
   `Cache-Control` headers Medusa sets

## Bucket policy

Set the bucket to **private** and let signed URLs / presigned PUTs
handle access. The default `mc anonymous set none` in
`docker-compose.yml` already does this for MinIO.
