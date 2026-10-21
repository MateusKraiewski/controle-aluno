import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import type { AttachmentStore } from "./store";

type Sender = Pick<S3Client, "send">;
const keyPattern = /^[0-9a-f-]{36}$/;

/** S3-compatible store (AWS S3, Cloudflare R2, MinIO…). Objects are private; the app streams them after its own checks. */
export function s3Store(client: Sender, bucket: string, prefix = "attachments/"): AttachmentStore {
  const objectKey = (key: string) => {
    if (!keyPattern.test(key)) throw new Error("invalid_attachment_key");
    return `${prefix}${key}`;
  };
  return {
    async put(key, bytes) {
      // IfNoneMatch keeps keys write-once, like the disk store's "wx" flag.
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey(key), Body: bytes, IfNoneMatch: "*", ContentType: "application/octet-stream" }));
    },
    async get(key) {
      const target = objectKey(key);
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: target }));
        return result.Body ? new Uint8Array(await result.Body.transformToByteArray()) : null;
      } catch (error) {
        if ((error as { name?: string }).name === "NoSuchKey") return null;
        throw error;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey(key) }));
    },
  };
}

const s3EnvSchema = z.object({
  S3_BUCKET: z.string().min(3),
  S3_REGION: z.string().min(1).default("auto"),
  S3_ENDPOINT: z.url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
});

/** Builds the store from S3_* variables; fails without echoing values (they include secrets). */
export function s3StoreFromEnv(env: Record<string, string | undefined> = process.env) {
  const parsed = s3EnvSchema.safeParse({ ...env, S3_ENDPOINT: env.S3_ENDPOINT || undefined });
  if (!parsed.success) throw new Error(`Invalid or missing S3 configuration: ${[...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].join(", ")}`);
  const config = parsed.data;
  const client = new S3Client({
    region: config.S3_REGION, endpoint: config.S3_ENDPOINT, forcePathStyle: config.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY },
  });
  return s3Store(client, config.S3_BUCKET);
}
