import { trace, context, SpanStatusCode, Span, SpanKind } from '@opentelemetry/api';

const tracer = trace.getTracer('menucraft-api');

/**
 * Create a span for a specific operation
 */
export function createSpan<T>(
  name: string,
  operation: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    {
      kind: SpanKind.INTERNAL,
      attributes,
    },
    async (span) => {
      try {
        const result = await operation(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Add attributes to the current span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Add an event to the current span
 */
export function addSpanEvent(
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Record an error on the current span
 */
export function recordSpanError(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Get the current trace ID for logging correlation
 */
export function getTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().traceId;
  }
  return undefined;
}

/**
 * Decorator for tracing async methods
 */
export function traced(name?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = name || `${(target as object).constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      return createSpan(spanName, async (span) => {
        span.setAttribute('function.name', propertyKey);
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

// Export the tracer for direct use
export { tracer, context };
