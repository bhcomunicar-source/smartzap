import { NextResponse } from "next/server";
import { deleteApiKey } from "@/lib/builder/mock-api-keys";

type RouteParams = {
  params: Promise<{ keyId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { keyId } = await params;
  deleteApiKey(keyId);
  return NextResponse.json({ success: true });
}
