import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Enable diagnostic logging in development
if (process.env.OTEL_DEBUG === 'true') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

const isEnabled = process.env.OTEL_ENABLED === 'true';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// Create resource with service information
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'menucraft-api',
  [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
  'deployment.environment': process.env.NODE_ENV || 'development',
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
});

// Configure metrics exporter
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
});

// Create the SDK
const sdk = new NodeSDK({
  resource,
  traceExporter: isEnabled ? traceExporter : undefined,
  metricReader: isEnabled
    ? new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000, // Export every 30 seconds
      })
    : undefined,
  instrumentations: [
    // Auto-instrument common Node.js modules
    getNodeAutoInstrumentations({
      // Disable some noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
    }),
    // Specific instrumentations with custom config
    new FastifyInstrumentation({
      requestHook: (span, info) => {
        // Add custom attributes to request spans
        const request = info.request;
        if (request.headers['x-request-id']) {
          span.setAttribute('http.request_id', request.headers['x-request-id'] as string);
        }
        if (request.headers['x-organization-id']) {
          span.setAttribute('organization.id', request.headers['x-organization-id'] as string);
        }
      },
    }),
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (request) => {
        const ignorePaths = ['/health', '/ready', '/metrics'];
        return ignorePaths.some((path) => request.url?.startsWith(path));
      },
    }),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
    }),
  ],
});

// Start the SDK
export function startTelemetry(): void {
  if (!isEnabled) {
    console.log('OpenTelemetry: Disabled (set OTEL_ENABLED=true to enable)');
    return;
  }

  try {
    sdk.start();
    console.log('OpenTelemetry: Started successfully');
    console.log(`OpenTelemetry: Exporting to ${otlpEndpoint}`);
  } catch (error) {
    console.error('OpenTelemetry: Failed to start', error);
  }
}

// Graceful shutdown
export async function stopTelemetry(): Promise<void> {
  if (!isEnabled) return;

  try {
    await sdk.shutdown();
    console.log('OpenTelemetry: Shut down successfully');
  } catch (error) {
    console.error('OpenTelemetry: Error during shutdown', error);
  }
}

// Export the sdk for testing
export { sdk };
