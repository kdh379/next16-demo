type PathsWithMethod<Paths, Method extends string> = {
  [P in keyof Paths]: Method extends keyof Paths[P] ? P : never;
}[keyof Paths];

type ExtractParameters<T> = T extends { parameters: infer P } ? P : never;

type ExtractResponse<T, Status extends number = 200> = T extends {
  responses: { [K in Status]: infer R };
}
  ? R
  : never;

type RequestOptions<Operation> = {
  params?: ExtractParameters<Operation> extends { path: infer Path }
    ? Path
    : never;
  query?: ExtractParameters<Operation> extends { query: infer Query }
    ? Query
    : never;
  body?: ExtractParameters<Operation> extends { body: infer Body }
    ? Body
    : never;
  fetchOptions?: RequestInit;
};

type SDKConfig = {
  baseUrl: string;
  headers?: Record<string, string>;
  fetchOptions?: RequestInit;
  onRequest?: (url: string, init: RequestInit) => void | Promise<void>;
  onResponse?: (response: Response) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
};

/**
 * Next.js Server Functions에서 권장하는 에러 처리 패턴
 * throw 대신 에러를 반환값으로 전달
 * @see https://nextjs.org/docs/app/getting-started/error-handling#server-functions
 */
type SDKResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

function buildQueryString(query?: Record<string, unknown>): string {
  if (!query || Object.keys(query).length === 0) return "";

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class SDK<Paths extends Record<string, any>> {
  private config: SDKConfig;

  constructor(config: SDKConfig) {
    this.config = config;
  }

  private async request<
    TResponse,
    TOptions extends {
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: unknown;
      fetchOptions?: RequestInit;
    } = Record<string, unknown>,
  >(
    method: string,
    path: string,
    options?: TOptions,
  ): Promise<SDKResult<TResponse>> {
    const pathParamResult = this.replacePath(path, options?.params);
    if (pathParamResult.error) {
      return { error: pathParamResult.error };
    }
    const finalPath = pathParamResult.data;

    const queryString = buildQueryString(options?.query);
    const url = `${this.config.baseUrl}${finalPath}${queryString}`;

    const headers: Record<string, string> = {
      ...this.config.headers,
      ...(options?.fetchOptions?.headers as Record<string, string>),
    };

    if (options?.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // config 기본값 + 요청별 옵션 병합
    const init: RequestInit = {
      ...this.config.fetchOptions,
      ...options?.fetchOptions,
      method,
      headers,
    };

    // GET, HEAD는 body를 가질 수 없음 (RFC 7231)
    if (options?.body && method !== "GET" && method !== "HEAD") {
      init.body = JSON.stringify(options.body);
    }

    if (this.config.onRequest) {
      await this.config.onRequest(url, init);
    }

    const response = await fetch(url, init);

    if (this.config.onResponse) {
      await this.config.onResponse(response);
    }

    if (!response.ok) {
      const errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      if (this.config.onError) {
        await this.config.onError(error);
      }
      return { error: errorMessage };
    }

    if (response.status === 204) {
      return { data: undefined as TResponse };
    }

    const data = await response.json();
    return { data: data as TResponse };
  }

  private replacePath(
    path: string,
    params?: Record<string, unknown>,
  ): SDKResult<string> {
    if (!params) return { data: path };

    const missingParams: string[] = [];
    const result = path.replace(/\{([^}]+)\}/g, (_, key) => {
      const value = params[key];
      if (value === undefined) {
        missingParams.push(key);
        return `{${key}}`;
      }
      return encodeURIComponent(String(value));
    });

    if (missingParams.length > 0) {
      return {
        error: `Missing path parameter(s): ${missingParams.join(", ")}`,
      };
    }

    return { data: result };
  }

  GET<
    P extends PathsWithMethod<Paths, "GET">,
    Operation extends Paths[P]["GET"],
  >(
    path: P,
    options?: Omit<RequestOptions<Operation>, "body">,
  ): Promise<SDKResult<ExtractResponse<Operation, 200>>> {
    return this.request<ExtractResponse<Operation, 200>>(
      "GET",
      path as string,
      options,
    );
  }

  POST<
    P extends PathsWithMethod<Paths, "POST">,
    Operation extends Paths[P]["POST"],
  >(
    path: P,
    options?: RequestOptions<Operation>,
  ): Promise<SDKResult<ExtractResponse<Operation, 201>>> {
    return this.request<ExtractResponse<Operation, 201>>(
      "POST",
      path as string,
      options,
    );
  }

  PUT<
    P extends PathsWithMethod<Paths, "PUT">,
    Operation extends Paths[P]["PUT"],
  >(
    path: P,
    options?: RequestOptions<Operation>,
  ): Promise<SDKResult<ExtractResponse<Operation, 200>>> {
    return this.request<ExtractResponse<Operation, 200>>(
      "PUT",
      path as string,
      options,
    );
  }

  PATCH<
    P extends PathsWithMethod<Paths, "PATCH">,
    Operation extends Paths[P]["PATCH"],
  >(
    path: P,
    options?: RequestOptions<Operation>,
  ): Promise<SDKResult<ExtractResponse<Operation, 200>>> {
    return this.request<ExtractResponse<Operation, 200>>(
      "PATCH",
      path as string,
      options,
    );
  }

  DELETE<
    P extends PathsWithMethod<Paths, "DELETE">,
    Operation extends Paths[P]["DELETE"],
  >(
    path: P,
    options?: Omit<RequestOptions<Operation>, "body">,
  ): Promise<SDKResult<ExtractResponse<Operation, 204>>> {
    return this.request<ExtractResponse<Operation, 204>>(
      "DELETE",
      path as string,
      options,
    );
  }
}
