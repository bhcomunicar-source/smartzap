import { NextResponse } from "next/server";
import {
  deleteWorkflow,
  ensureWorkflow,
  updateWorkflow,
} from "@/lib/builder/mock-workflow-store";
import {
  validateWorkflowSchema,
  WorkflowNodeTypeSchema,
} from "@/lib/shared/workflow-schema";
import type {
  WorkflowEdge,
  WorkflowNode,
} from "@/lib/builder/workflow-store";
import type { WorkflowVisibility } from "@/lib/builder/api-client";

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { workflowId } = await params;
  const workflow = ensureWorkflow(workflowId);
  return NextResponse.json(workflow);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { workflowId } = await params;
  const body = await request.json().catch(() => ({}));
  const normalized = normalizeWorkflowPatch(body);
  const validation = validateWorkflowSchema(normalized);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid workflow", details: validation.errors },
      { status: 400 }
    );
  }
  const workflow = updateWorkflow(workflowId, {
    name: normalized?.name,
    description: normalized?.description,
    nodes: normalized?.nodes,
    edges: normalized?.edges,
    visibility: normalized?.visibility,
  });
  return NextResponse.json(workflow);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { workflowId } = await params;
  deleteWorkflow(workflowId);
  return NextResponse.json({ success: true });
}

function normalizeWorkflowPatch(body: Record<string, unknown>) {
  const nodes: WorkflowNode[] = Array.isArray(body?.nodes)
    ? body.nodes.map((node) => normalizeNode(node))
    : [];
  const edges: WorkflowEdge[] = Array.isArray(body?.edges)
    ? body.edges.map((edge) => normalizeEdge(edge))
    : [];

  return {
    name: typeof body?.name === "string" ? body.name : undefined,
    description:
      typeof body?.description === "string" ? body.description : undefined,
    nodes,
    edges,
    visibility:
      body?.visibility === "private" || body?.visibility === "public"
        ? (body.visibility as WorkflowVisibility)
        : undefined,
  };
}

function normalizeNode(node: unknown): WorkflowNode {
  const data = (node as { data?: Record<string, unknown> } | null)?.data ?? {};
  const rawType = (node as { type?: unknown } | null)?.type;
  const fallbackType = data?.type;
  const typeValue =
    typeof rawType === "string" ? rawType : typeof fallbackType === "string" ? fallbackType : "action";
  const parsedType = WorkflowNodeTypeSchema.safeParse(typeValue);
  const type = parsedType.success ? parsedType.data : "action";
  const position = (node as { position?: { x?: unknown; y?: unknown } } | null)
    ?.position ?? { x: 0, y: 0 };

  return {
    id: String((node as { id?: unknown } | null)?.id ?? ""),
    type,
    position: {
      x: typeof position.x === "number" ? position.x : 0,
      y: typeof position.y === "number" ? position.y : 0,
    },
    data: {
      label: typeof data.label === "string" ? data.label : "",
      description:
        typeof data.description === "string" ? data.description : undefined,
      type,
      config:
        typeof data.config === "object" && data.config !== null
          ? (data.config as Record<string, unknown>)
          : undefined,
      status:
        data.status === "idle" ||
        data.status === "running" ||
        data.status === "success" ||
        data.status === "error"
          ? data.status
          : undefined,
      enabled: typeof data.enabled === "boolean" ? data.enabled : undefined,
    },
    selected:
      typeof (node as { selected?: unknown } | null)?.selected === "boolean"
        ? (node as { selected?: boolean }).selected
        : undefined,
  } as WorkflowNode;
}

function normalizeEdge(edge: unknown): WorkflowEdge {
  return {
    id: String((edge as { id?: unknown } | null)?.id ?? ""),
    source: String((edge as { source?: unknown } | null)?.source ?? ""),
    target: String((edge as { target?: unknown } | null)?.target ?? ""),
    type:
      typeof (edge as { type?: unknown } | null)?.type === "string"
        ? (edge as { type?: string }).type
        : undefined,
  } as WorkflowEdge;
}
