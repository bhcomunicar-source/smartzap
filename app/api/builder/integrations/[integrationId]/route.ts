import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ integrationId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { integrationId } = await params;
  return NextResponse.json({
    id: integrationId,
    name: "Integration",
    type: "custom",
    config: {},
  });
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { integrationId } = await params;
  return NextResponse.json({
    id: integrationId,
    name: "Integration",
    type: "custom",
    config: {},
  });
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}
