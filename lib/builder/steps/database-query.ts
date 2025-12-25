import "server-only";

import { type StepInput, withStepLogging } from "./step-handler";

export type DatabaseQueryInput = StepInput & {
  integrationId?: string;
  dbQuery?: string;
  query?: string;
};

type DatabaseQueryResult =
  | { success: true; rows: unknown; count: number }
  | { success: false; error: string };

export async function databaseQueryStep(
  input: DatabaseQueryInput
): Promise<DatabaseQueryResult> {
  "use step";
  return withStepLogging(input, async () => ({
    success: false,
    error: "Database Query step is disabled in this build.",
  }));
}
