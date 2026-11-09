import { ReplitConnectors } from "@replit/connectors-sdk";

type QueryResult = { data: unknown; error: { message: string } | null };

class RestQuery implements PromiseLike<QueryResult> {
  private readonly filters: string[] = [];
  private selectColumns = "*";
  private orderBy: string | null = null;
  private isSingle = false;

  constructor(
    private readonly table: string,
    private readonly method = "GET",
    private readonly payload?: unknown,
    private readonly upsert = false,
  ) {}

  select(columns = "*") {
    this.selectColumns = columns;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = `${column}.${options?.ascending === false ? "desc" : "asc"}`;
    return this;
  }

  eq(column: string, value: string | number | boolean) {
    this.filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}`);
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult> {
    const params = new URLSearchParams({ select: this.selectColumns });
    if (this.orderBy) params.set("order", this.orderBy);
    for (const filter of this.filters) {
      const [key, value] = filter.split("=");
      if (key && value) params.set(key, value);
    }

    try {
      const response = await new ReplitConnectors().proxy(
        "supabase",
        `/${this.table}?${params.toString()}`,
        {
          method: this.method,
          headers: {
            "Content-Type": "application/json",
            Prefer: this.upsert
              ? "resolution=merge-duplicates,return=representation"
              : "return=representation",
          },
          body: this.payload === undefined ? undefined : JSON.stringify(this.payload),
        },
      );
      const body: Record<string, unknown> | unknown[] | null =
        response.status === 204 ? null : await response.json().catch(() => null) as Record<string, unknown> | unknown[] | null;
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && !Array.isArray(body) && typeof body.message === "string"
          ? body.message
          : `Supabase request failed (${response.status})`;
        return { data: null, error: { message } };
      }
      return { data: this.isSingle && Array.isArray(body) ? body[0] ?? null : body, error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : "Supabase request failed" } };
    }
  }
}

const client = {
  from(table: string) {
    return {
      select: (columns = "*") => new RestQuery(table).select(columns),
      upsert: (payload: unknown) => new RestQuery(table, "POST", payload, true),
      delete: () => new RestQuery(table, "DELETE"),
    };
  },
  async rpc(functionName: string, args: Record<string, unknown> = {}): Promise<QueryResult> {
    try {
      const response = await new ReplitConnectors().proxy(
        "supabase",
        `/rpc/${encodeURIComponent(functionName)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(args),
        },
      );
      const body: unknown = response.status === 204
        ? null
        : await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "message" in body &&
          typeof body.message === "string"
          ? body.message
          : `Supabase RPC failed (${response.status})`;
        return { data: null, error: { message } };
      }
      return { data: body, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : "Supabase RPC failed" },
      };
    }
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, body: Buffer, options: { contentType?: string; upsert?: boolean }) {
          try {
            const response = await new ReplitConnectors().proxy(
              "supabase",
              `/object/${bucket}/${path}`,
              {
                method: options.upsert ? "PUT" : "POST",
                headers: { "Content-Type": options.contentType ?? "application/octet-stream" },
                body: body as unknown as string,
              },
            );
            if (!response.ok) {
              const result: unknown = await response.json().catch(() => null);
              const message = typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
                ? result.message
                : `Storage upload failed (${response.status})`;
              return { error: { message } };
            }
            return { error: null };
          } catch (error) {
            return { error: { message: error instanceof Error ? error.message : "Storage upload failed" } };
          }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `/api/storage/${bucket}?path=${encodeURIComponent(path)}` } };
        },
      };
    },
  },
};

export const supabase = client;
// The imported project may run without a connected Supabase integration.
// Keep remote storage opt-in; the API uses its local data store otherwise.
export const hasSupabase = process.env["SUPABASE_CONNECTOR_ENABLED"] === "true";
