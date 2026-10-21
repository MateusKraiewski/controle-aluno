import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { s3Store, s3StoreFromEnv } from "../s3-store";

/** In-memory stand-in for an S3 bucket that records the commands it receives. */
function mockClient() {
  const objects = new Map<string, Uint8Array>();
  const sent: unknown[] = [];
  return {
    objects, sent,
    async send(command: unknown) {
      sent.push(command);
      if (command instanceof PutObjectCommand) {
        const key = command.input.Key!;
        if (command.input.IfNoneMatch === "*" && objects.has(key)) throw Object.assign(new Error("exists"), { name: "PreconditionFailed" });
        objects.set(key, command.input.Body as Uint8Array);
        return {};
      }
      if (command instanceof GetObjectCommand) {
        const body = objects.get(command.input.Key!);
        if (!body) throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
        return { Body: { transformToByteArray: async () => body } };
      }
      if (command instanceof DeleteObjectCommand) { objects.delete(command.input.Key!); return {}; }
      throw new Error("unexpected command");
    },
  };
}

describe("S3-compatible attachment store", () => {
  const key = "0f8fad5b-d9cb-469f-a165-70867728950e";

  it("writes once under the prefix, reads back and deletes", async () => {
    const client = mockClient();
    const store = s3Store(client as never, "bucket");
    await store.put(key, new TextEncoder().encode("olá"));
    expect([...client.objects.keys()]).toEqual([`attachments/${key}`]);
    expect((client.sent[0] as PutObjectCommand).input).toMatchObject({ Bucket: "bucket", IfNoneMatch: "*" });
    expect(new TextDecoder().decode((await store.get(key))!)).toBe("olá");
    await expect(store.put(key, new Uint8Array([1]))).rejects.toThrow();
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });

  it("rejects keys that are not server UUIDs", async () => {
    const store = s3Store(mockClient() as never, "bucket");
    await expect(store.get("../other-bucket/secret")).rejects.toThrow("invalid_attachment_key");
    await expect(store.put("a/b", new Uint8Array([1]))).rejects.toThrow("invalid_attachment_key");
  });

  it("names missing variables without echoing secrets", () => {
    expect(() => s3StoreFromEnv({ S3_SECRET_ACCESS_KEY: "super-secret" })).toThrow(/S3_BUCKET, S3_ACCESS_KEY_ID/);
    expect(() => s3StoreFromEnv({ S3_SECRET_ACCESS_KEY: "super-secret" })).not.toThrow(/super-secret/);
    expect(() => s3StoreFromEnv({ S3_BUCKET: "aulas", S3_ACCESS_KEY_ID: "id", S3_SECRET_ACCESS_KEY: "s", S3_ENDPOINT: "https://example.r2.cloudflarestorage.com" })).not.toThrow();
  });
});
