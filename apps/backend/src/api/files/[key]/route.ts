import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { Readable } from "stream"

let s3: S3Client | null = null

function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT || "http://localhost:9100",
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "medusa",
        secretAccessKey: process.env.S3_SECRET_KEY || "medusa_dev_password",
      },
      forcePathStyle: true,
    })
  }
  return s3
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { key } = req.params

  try {
    const cmd = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET || "medusa",
      Key: key,
    })
    const { Body, ContentType, ContentLength } = await getClient().send(cmd)

    res.setHeader("Cache-Control", "public, max-age=86400, immutable")
    if (ContentType) res.setHeader("Content-Type", ContentType)
    if (ContentLength) res.setHeader("Content-Length", String(ContentLength))
    ;(Body as Readable).pipe(res)
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode
    if (status === 404 || err?.name === "NoSuchKey") {
      return res.status(404).json({ message: "Not found" })
    }
    return res.status(502).json({ message: "File unavailable" })
  }
}
