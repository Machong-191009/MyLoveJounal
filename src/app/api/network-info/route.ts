import { NextResponse } from "next/server";
import os from "node:os";

export async function GET() {
  const interfaces = os.networkInterfaces();
  const results: { address: string; family: string; internal: boolean }[] = [];

  for (const [, entries] of Object.entries(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === "IPv4") {
        results.push({
          address: entry.address,
          family: entry.family,
          internal: entry.internal,
        });
      }
    }
  }

  const lanIps = results.filter((r) => !r.internal);
  const localIps = results.filter((r) => r.internal);

  return NextResponse.json({ lanIps, localIps, port: process.env.PORT || 3000 });
}
