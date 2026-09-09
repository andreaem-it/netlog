import { createServer } from "node:net";
import { afterEach, expect, it, vi } from "vitest";
import { sendEmail } from "@/server/email/send";

afterEach(() => vi.unstubAllEnvs());

it("delivers a password email to an actual local SMTP socket", async () => {
  let message = "";
  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 local.test ESMTP\r\n");
    let buffer = "";
    let inData = false;
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const boundary = buffer.indexOf("\r\n");
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (inData) {
          if (line === ".") { inData = false; socket.write("250 Accepted\r\n"); }
          else message += `${line}\n`;
        } else if (line.startsWith("EHLO") || line.startsWith("HELO")) socket.write("250 local.test\r\n");
        else if (line === "DATA") { inData = true; socket.write("354 End with a dot\r\n"); }
        else if (line === "QUIT") socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No SMTP port.");
  vi.stubEnv("MAIL_TRANSPORT", "smtp");
  vi.stubEnv("SMTP_URL", `smtp://127.0.0.1:${address.port}`);
  try {
    await sendEmail({ to: "test@example.test", subject: "Password reset", text: "Use the one-time link from this message." });
    expect(message).toContain("To: test@example.test");
    expect(message).toContain("Subject: Password reset");
    expect(message).toContain("Use the one-time link");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
